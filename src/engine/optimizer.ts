// Strategy optimizer. With five measures there are only 31 non-empty combinations
// and 325 orderings of them, so every one is simulated through the interaction
// engine. Each combination keeps its most valuable order, and is then scored.

import type { MeasureId, Objective, PathId, Scenario } from '../types'
import { clamp } from '../utils/sanity'
import type { Baseline } from './baseline'
import { bestOrder, simulate, type PlanResult } from './interactions'
import { MEASURE_IDS, hvacIsDue, hvacNotAdvised } from './measures'

export interface Strategy {
  id: PathId
  name: string
  goal: string
  plan: PlanResult | null
  recommended: boolean
  /** Set when another path landed on the identical combination. */
  sameAs: PathId | null
  /** Caveat to show with the plan, when it couldn't meet the path's own rule. */
  note?: string
  score: number
}

export interface OptimizerResult {
  strategies: Strategy[]
  /** Every combination, including ones not advised. Use `candidates` for choosing. */
  plans: PlanResult[]
  /** The combinations a path may choose from. */
  candidates: PlanResult[]
  affordable: PlanResult[]
  /** How many orderings of the candidates were simulated. */
  ordersTested: number
  /** Measures left out of the candidates, and why. */
  notAdvised: Partial<Record<MeasureId, string>>
  cheapestEntry: PlanResult | null
  /** Plan with every measure — the theoretical ceiling. */
  fullPlan: PlanResult
  /** Cheapest plan that reduces more energy than the current Deep path (budget unlock hint). */
  nextDeeper: PlanResult | null
}

export const PATH_META: Record<PathId, { name: string; goal: string }> = {
  quick: { name: 'Quick Wins', goal: 'Fastest practical payback within budget.' },
  balanced: { name: 'Balanced', goal: 'Strong savings, reasonable payback and smart sequencing.' },
  deep: { name: 'Deep Retrofit', goal: 'Maximum long-term energy and emissions reduction within budget.' },
}

export function recommendedPath(objective: Objective): PathId {
  if (objective === 'Fastest Payback') return 'quick'
  if (objective === 'Balanced') return 'balanced'
  return 'deep'
}

function combinations(): MeasureId[][] {
  const out: MeasureId[][] = []
  for (let mask = 1; mask < 1 << MEASURE_IDS.length; mask++) {
    out.push(MEASURE_IDS.filter((_, i) => mask & (1 << i)))
  }
  return out
}

/** Number of strategic HVAC sequencing interactions a plan captures (rules A & B). */
function interactionCount(p: PlanResult): number {
  const has = (m: MeasureId) => p.order.includes(m)
  let n = 0
  if (has('envelope') && has('hvac')) n++
  if (has('led') && has('hvac')) n++
  return n
}

/** Balanced plans only include measures that pay back on their own, after interactions. */
export const BALANCED_MAX_STEP_PAYBACK = 10

/** Longest payback of any phase. HVAC past its service life is exempt: it has to be replaced regardless. */
function worstStepPayback(p: PlanResult, hvacExempt: boolean): number {
  return Math.max(
    0,
    ...p.steps
      .filter((s) => !(hvacExempt && s.id === 'hvac'))
      .map((s) => (s.annualSavings > 0 ? s.net / s.annualSavings : Infinity)),
  )
}

export function balancedScore(p: PlanResult, maxSavings: number, budget: number): number {
  if (!p.payback || maxSavings <= 0) return -Infinity
  const savingsScore = p.annualSavings / maxSavings
  const paybackScore = clamp(1 - p.payback / 12, 0, 1)
  const interactionScore = interactionCount(p) / 2
  const utilisation = clamp(p.net / Math.max(1, budget), 0, 1)
  return 0.4 * savingsScore + 0.35 * paybackScore + 0.15 * interactionScore + 0.1 * utilisation
}

export function optimize(base: Baseline, scenario: Scenario): OptimizerResult {
  const plans = combinations().map((ids) => simulate(bestOrder(ids, base, scenario), base, scenario))
  const reason = hvacNotAdvised(base)
  const notAdvised: Partial<Record<MeasureId, string>> = reason ? { hvac: reason } : {}
  const candidates = plans.filter((p) => !p.order.some((m) => notAdvised[m]))
  const budget = Math.max(0, scenario.budget)
  const affordable = candidates.filter((p) => p.net <= budget + 0.5 && p.payback !== null)
  const cheapestEntry = [...candidates].sort((a, b) => a.net - b.net)[0] ?? null
  const fullPlan = simulate(bestOrder(MEASURE_IDS.filter((m) => !notAdvised[m]), base, scenario), base, scenario)
  const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1))
  const ordersTested = candidates.reduce((a, p) => a + factorial(p.order.length), 0)

  // QUICK WINS — shortest payback; among near-ties (within half a year) take
  // the combination with the most annual savings so it's not a token project.
  let quick: PlanResult | null = null
  if (affordable.length) {
    const minPb = Math.min(...affordable.map((p) => p.payback as number))
    const near = affordable.filter((p) => (p.payback as number) <= minPb + 0.5)
    quick = near.sort((a, b) => b.annualSavings - a.annualSavings || a.net - b.net)[0]
  }

  // BALANCED — weighted score. When a plan exists that saves more than Quick
  // Wins, Balanced offers that instead so the owner sees a real choice.
  const maxSavings = Math.max(0, ...affordable.map((p) => p.annualSavings))
  // Only plans where every phase pays back within the limit qualify, unless none can.
  const hvacExempt = hvacIsDue(base)
  const qualifying = affordable.filter((p) => worstStepPayback(p, hvacExempt) <= BALANCED_MAX_STEP_PAYBACK)
  const stepUp = quick ? qualifying.filter((p) => p !== quick && p.annualSavings > quick.annualSavings) : []
  const balancedPool = stepUp.length ? stepUp : qualifying.length ? qualifying : affordable
  let balanced: PlanResult | null = null
  let balancedBest = -Infinity
  for (const p of balancedPool) {
    const sc = balancedScore(p, maxSavings, budget)
    if (sc > balancedBest) {
      balancedBest = sc
      balanced = p
    }
  }

  // DEEP RETROFIT — maximum energy reduction, then emissions, then savings
  const deep =
    [...affordable].sort(
      (a, b) => b.mmbtu - a.mmbtu || b.co2 - a.co2 || b.annualSavings - a.annualSavings,
    )[0] ?? null

  // Next step up: the cheapest plan that would beat the Deep path on energy.
  const nextDeeper = deep
    ? [...candidates]
        .filter((p) => deep.order.every((m) => p.order.includes(m)) && p.mmbtu > deep.mmbtu * 1.02 && p.payback !== null)
        .sort((a, b) => a.net - b.net)[0] ?? null
    : null

  const rec = recommendedPath(base.building.objective)
  const key = (p: PlanResult | null) => (p ? p.order.join('>') : '')
  const entries: [PathId, PlanResult | null, number][] = [
    ['quick', quick, 0],
    ['balanced', balanced, balancedBest],
    ['deep', deep, 0],
  ]
  const strategies: Strategy[] = entries.map(([id, plan, score], i) => {
    const earlier = entries.slice(0, i).find(([, p]) => plan && key(p) === key(plan))
    return {
      id,
      ...PATH_META[id],
      plan,
      recommended: id === rec,
      sameAs: earlier ? earlier[0] : null,
      score,
      note:
        id === 'balanced' && plan && !qualifying.length
          ? `No plan at this budget keeps every phase within a ${BALANCED_MAX_STEP_PAYBACK}-year payback, so this is the closest available.`
          : undefined,
    }
  })

  return { strategies, plans, candidates, affordable, ordersTested, notAdvised, cheapestEntry, fullPlan, nextDeeper }
}
