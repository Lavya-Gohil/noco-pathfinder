// Strategy optimizer. With five measures there are only 31 non-empty
// combinations, so every one is sequenced, simulated through the interaction
// engine, and scored. Nothing about the result is hard-coded.

import type { MeasureId, Objective, PathId, Scenario } from '../types'
import { clamp } from '../utils/sanity'
import type { Baseline } from './baseline'
import { simulate, sequence, type PlanResult } from './interactions'
import { MEASURE_IDS } from './measures'

export interface Strategy {
  id: PathId
  name: string
  goal: string
  plan: PlanResult | null
  recommended: boolean
  /** Set when another path landed on the identical combination. */
  sameAs: PathId | null
  score: number
}

export interface OptimizerResult {
  strategies: Strategy[]
  plans: PlanResult[]
  affordable: PlanResult[]
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

function worstStepPayback(p: PlanResult): number {
  return Math.max(
    0,
    ...p.steps.map((s) => (s.annualSavings > 0 ? s.net / s.annualSavings : Infinity)),
  )
}

export function balancedScore(p: PlanResult, maxSavings: number, budget: number): number {
  if (!p.payback || maxSavings <= 0) return -Infinity
  const savingsScore = p.annualSavings / maxSavings
  const paybackScore = clamp(1 - p.payback / 12, 0, 1)
  const interactionScore = interactionCount(p) / 2
  const utilisation = clamp(p.net / Math.max(1, budget), 0, 1)
  const stepPenalty = worstStepPayback(p) > BALANCED_MAX_STEP_PAYBACK ? 0.5 : 0
  return 0.4 * savingsScore + 0.35 * paybackScore + 0.15 * interactionScore + 0.1 * utilisation - stepPenalty
}

export function optimize(base: Baseline, scenario: Scenario): OptimizerResult {
  const plans = combinations().map((ids) => simulate(sequence(ids, base), base, scenario))
  const budget = Math.max(0, scenario.budget)
  const affordable = plans.filter((p) => p.net <= budget + 0.5 && p.payback !== null)
  const cheapestEntry = [...plans].sort((a, b) => a.net - b.net)[0] ?? null
  const fullPlan = simulate(sequence(MEASURE_IDS, base), base, scenario)

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
  const stepUp = quick ? affordable.filter((p) => p !== quick && p.annualSavings > quick.annualSavings) : []
  const balancedPool = stepUp.length ? stepUp : affordable
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
    ? [...plans]
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
    }
  })

  return { strategies, plans, affordable, cheapestEntry, fullPlan, nextDeeper }
}
