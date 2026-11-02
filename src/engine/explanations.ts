// Plain-English explanations generated from engine results. Every sentence is
// derived from the plan actually selected, so the narrative changes when the
// budget, prices or incentives change.

import type { Building, BuildingType, MeasureId } from '../types'
import { money, num, pct } from '../utils/format'
import type { Baseline } from './baseline'
import { ANALYSIS_YEARS, discount, type PlanResult, type StepResult } from './interactions'
import { HVAC_SERVICE_LIFE, MEASURES, hvacIsDue } from './measures'

export type SignalKind = 'hvac' | 'envelope' | 'lighting' | 'solar' | 'cost'

export interface Signal {
  kind: SignalKind
  title: string
  text: string
  metric: string
}

const COST_BENCHMARK: Record<BuildingType, number> = {
  Office: 1.9,
  Warehouse: 0.9,
  Retail: 2.2,
  School: 1.6,
  Multifamily: 1.5,
}

export function signals(base: Baseline): Signal[] {
  const b = base.building
  const out: Signal[] = []
  const lightingShare = base.elecKwh > 0 ? base.lightingKwh / base.elecKwh : 0

  if ((b.hvacYear ?? base.year) <= 2010 || b.heating === 'Electric Resistance') {
    out.push({
      kind: 'hvac',
      title: 'Aging HVAC',
      text: "Your building's HVAC system may be approaching a point where efficiency improvements could create meaningful savings.",
      metric: b.hvacYear
        ? `Equipment installed ${b.hvacYear} · ${b.heating}`
        : b.yearBuilt
          ? `Building age ${base.age} yrs · ${b.heating}`
          : `${b.heating} · age unverified`,
    })
  }
  if (base.year < 2005) {
    out.push({
      kind: 'envelope',
      title: 'Envelope Opportunity',
      text: 'Buildings of this age commonly benefit from air sealing and insulation improvements.',
      metric: `~${pct(base.envelopeLossFrac)} of HVAC energy lost through the envelope`,
    })
  }
  if (lightingShare >= 0.2) {
    out.push({
      kind: 'lighting',
      title: 'Lighting Opportunity',
      text: 'Lighting appears to represent a meaningful share of estimated electrical consumption.',
      metric: `~${pct(lightingShare)} of electricity use`,
    })
  }
  if (base.elecKwh >= 150_000 && base.roofKw >= 40) {
    out.push({
      kind: 'solar',
      title: 'Solar Potential',
      text: "The building's electricity profile may justify evaluating rooftop solar.",
      metric: `Up to ~${num(base.roofKw)} kW of usable roof`,
    })
  }
  const bench = COST_BENCHMARK[b.type]
  if (base.costPerSqft > bench) {
    out.push({
      kind: 'cost',
      title: 'Above-Typical Energy Cost',
      text: `Energy spend per square foot is above a typical ${b.type.toLowerCase()} building, suggesting room for operational savings.`,
      metric: `$${base.costPerSqft.toFixed(2)}/sq ft vs ~$${bench.toFixed(2)} typical`,
    })
  }
  return out.slice(0, 4)
}

export function opportunityLabel(savingsShare: number): { label: string; detail: string } {
  const label = savingsShare >= 0.35 ? 'High' : savingsShare >= 0.2 ? 'Moderate' : 'Limited'
  return { label, detail: `Up to ~${pct(savingsShare)} of annual spend` }
}

function effect(step: StepResult, rule: string) {
  return step.effects.filter((e) => e.rule === rule).reduce((a, e) => a + e.capitalImpact, 0)
}

/** Why a measure sits at its position in the plan. */
export function phaseReason(plan: PlanResult, step: StepResult, base: Baseline): string {
  const later = (m: MeasureId) => plan.order.indexOf(m) > plan.order.indexOf(step.id)
  const earlier = (m: MeasureId) => plan.order.includes(m) && plan.order.indexOf(m) < plan.order.indexOf(step.id)
  const has = (m: MeasureId) => plan.order.includes(m)
  const payback = step.annualSavings > 0 ? step.net / step.annualSavings : null

  switch (step.id) {
    case 'envelope':
      return has('hvac') && later('hvac')
        ? 'Improve the envelope before replacing HVAC so future heating and cooling equipment can be sized for the reduced building load.'
        : `Cuts heating and cooling losses at the source${payback ? ` with an estimated ${payback.toFixed(1)}-year payback` : ''}.`
    case 'led':
      return has('hvac') && later('hvac')
        ? 'Starts saving as soon as it is installed, and less heat from lighting trims the cooling load the new HVAC has to serve.'
        : `Starts saving as soon as it's installed${payback ? `, with an estimated ${payback.toFixed(1)}-year payback` : ''}.`
    case 'hvac': {
      const capital = effect(step, 'envelope-hvac') + effect(step, 'led-hvac')
      if (earlier('envelope') || earlier('led')) {
        return `Replaced after load reduction so equipment is sized to the smaller load — an estimated ${money(capital)} lower net equipment cost than sizing for today's building.`
      }
      return 'Largest single source of heating and cooling savings for aging equipment.'
    }
    case 'controls':
      if (earlier('hvac')) return 'Commissioned with the new HVAC so control sequences are programmed once, on equipment that will stay.'
      return has('hvac')
        ? 'Saves early enough to justify recommissioning when the new HVAC arrives. That cost is included in the HVAC phase.'
        : 'Scheduling and setbacks that start saving within weeks of installation.'
    case 'solar':
      return `A ${num(step.solarKw)} kW array sized to the demand left after the other upgrades, offsetting ~${pct(step.kwhGenerated / Math.max(1, base.elecKwh))} of today's electricity use within roof limits.`

  }
}

/**
 * Context for a plan's value when it carries HVAC that needs replacing anyway. Without
 * this, a negative value reads as "this plan loses money", when most of that cost is coming regardless.
 */
export function valueNote(plan: PlanResult, base: Baseline): string | null {
  const hvac = plan.steps.find((s) => s.id === 'hvac')
  if (!hvac || !hvacIsDue(base)) return null
  return `This value is charged ${money(hvac.net * discount(hvac.startYear))} in today's dollars for replacing the HVAC. That equipment is past a ${HVAC_SERVICE_LIFE}-year service life, so most of this cost comes due with or without the plan.`
}

/** Next steps for the report, leaving out data the owner has already provided. */
export function nextSteps(b: Building): string[] {
  return [
    ...(b.monthlyKwh ? [] : ['Obtain 12 months of utility consumption.']),
    'Conduct an on-site energy assessment.',
    b.hvacYear ? 'Verify equipment specifications.' : 'Verify equipment age and specifications.',
    'Confirm available incentives.',
    'Develop contractor-ready project scopes.',
  ]
}

export interface WhyPoint {
  title: string
  text: string
  impact?: string
}

/** The "Why this order" narrative. */
export function whyThisOrder(plan: PlanResult, budget: number): WhyPoint[] {
  const has = (m: MeasureId) => plan.order.includes(m)
  const step = (m: MeasureId) => plan.steps.find((s) => s.id === m)
  const before = (a: MeasureId, b: MeasureId) => has(a) && has(b) && plan.order.indexOf(a) < plan.order.indexOf(b)
  const out: WhyPoint[] = []

  if (plan.order.length > 1) {
    out.push({
      title: 'Every order was tested',
      text: `This order is worth the most of all ${plan.order.length > 2 ? 'the possible orders' : 'both orders'} over ${ANALYSIS_YEARS} years, allowing for what each upgrade does to the others and for savings starting sooner or later.`,
      impact: plan.sequencingValue > 1 ? `${money(plan.sequencingValue)} more than big-equipment-first` : undefined,
    })
  }
  if (before('envelope', 'hvac')) {
    const s = step('hvac')!
    const capital = effect(s, 'envelope-hvac')
    out.push({
      title: 'Envelope before HVAC',
      text: 'Envelope improvements come before HVAC because reducing heating and cooling demand can lower the future capacity requirement.',
      impact: capital > 0 ? `~${money(capital)} lower net HVAC cost` : undefined,
    })
  }
  if (has('led')) {
    const s = step('led')!
    out.push({
      title: before('led', 'hvac') ? 'LED before HVAC' : 'LED lighting',
      text:
        'LED lighting starts saving as soon as it is installed.' +
        (before('led', 'hvac') ? ' Lower lighting heat gain also trims the cooling load the new HVAC must handle.' : ''),
      impact: `${money(s.annualSavings)}/yr from day one`,
    })
  }
  if (has('controls')) {
    out.push({
      title: before('hvac', 'controls') ? 'Controls commissioned with new HVAC' : before('controls', 'hvac') ? 'Controls before HVAC' : 'Controls',
      text: before('hvac', 'controls')
        ? 'Smart controls follow the HVAC replacement so they are programmed for the equipment that stays. Their overlapping savings are discounted rather than double counted.'
        : before('controls', 'hvac')
          ? 'Controls save enough in the meantime to justify recommissioning them on the new equipment, which is included in the cost.'
          : 'Scheduling and setbacks need no major construction, so they start saving quickly.',
    })
  }
  if (has('solar')) {
    out.push({
      title: 'Solar sized to the reduced load',
      text:
        "The array is sized to the electricity the building will still use once the other upgrades are done." +
        (plan.order[plan.order.length - 1] === 'solar' ? ' It goes last because the earlier upgrades return more for the money.' : ''),
    })
  }
  if (plan.overlapRemoved > 1) {
    out.push({
      title: 'No double counting',
      text: `A simple sum of these upgrades would claim ${money(plan.naiveSavings)}/yr. Because each phase saves energy from the load left by earlier phases, Asset IQ counts ${money(plan.annualSavings)}/yr.`,
      impact: `${money(plan.overlapRemoved)}/yr overlap removed`,
    })
  }
  if (plan.sequencingSavings > 1) {
    const pushesOver = plan.unsequencedNet > budget && plan.net <= budget
    out.push({
      title: 'Sequencing pays for itself',
      text: `Doing the same upgrades big-equipment-first would cost about ${money(plan.unsequencedNet)} net instead of ${money(plan.net)}${
        pushesOver ? ' — which would push this plan over your budget.' : '.'
      }`,
      impact: `${money(plan.sequencingSavings)} capital saved`,
    })
  }
  if (out.length === 0 && plan.order.length === 1) {
    out.push({
      title: `${MEASURES[plan.order[0]].name} on its own`,
      text: 'At this budget a single upgrade gives the best result. Increase the budget to see how upgrades can be sequenced together.',
    })
  }
  return out
}
