// Retrofit interaction engine.
//
// Measures are never simply added together. A plan is simulated one phase at a
// time against a shared "load state": each measure saves energy from whatever
// load is LEFT after the earlier phases, and some measures change the cost of
// later ones. The four interaction rules are:
//
//   A. Envelope before HVAC  → design load (and HVAC cost) drops ~10%; HVAC
//      heating/cooling savings shrink because envelope already captured some.
//   B. LED before HVAC       → less internal heat gain: cooling load and HVAC
//      capacity drop slightly; HVAC cooling savings adjusted down.
//   C. Controls + HVAC       → overlap factor on HVAC-related control savings,
//      so the pair saves less than the naive sum.
//   D. Efficiency before solar → array sized against remaining demand, not the
//      original baseline.

import type { MeasureId, Scenario } from '../types'
import { capIncentive, clamp, nonNeg, payback } from '../utils/sanity'
import {
  GAS_T_PER_THERM,
  GRID_T_PER_KWH,
  KWH_TO_MMBTU,
  THERM_TO_MMBTU,
  type Baseline,
} from './baseline'
import {
  CONTROLS_FRACTIONS,
  SOLAR_COST_PER_W,
  controlsGross,
  envelopeFractions,
  envelopeGross,
  hvacCostPerTon,
  hvacFractions,
  ledGross,
  ledSavingsFraction,
  measureConfidence,
} from './measures'
import type { ConfidenceLevel } from '../types'

// ---- Interaction constants ----
/** Envelope-first reduction in HVAC design load (rule A). */
export const ENVELOPE_LOAD_REDUCTION = 0.1
/** Share of LED kWh savings that also comes off cooling (rule B), before climate adjustment. */
export const LED_COOLING_SHARE = 0.12
/** LED-first reduction in HVAC design load (rule B). */
export const LED_LOAD_REDUCTION = 0.02
/** Fraction of HVAC-related control savings kept when new HVAC is also installed (rule C). */
export const CONTROLS_HVAC_OVERLAP = 0.8
/** Solar sized to this share of remaining electricity demand (rule D). */
export const SOLAR_TARGET_SHARE = 0.35
/** Hard cap: solar production may never exceed this share of remaining demand. */
export const SOLAR_MAX_SHARE = 0.5
/** Combined savings may never exceed this share of total utility spend. */
export const MAX_SAVINGS_SHARE = 0.85

export type InteractionRule = 'envelope-hvac' | 'led-hvac' | 'controls-hvac' | 'efficiency-solar'

export interface InteractionEffect {
  rule: InteractionRule
  title: string
  detail: string
  /** Net (post-incentive) capital avoided thanks to this interaction. */
  capitalImpact: number
  /** Annual savings change vs. the stand-alone measure (negative = removed to avoid double counting). */
  savingsImpact: number
}

export interface LoadState {
  lightingKwh: number
  coolingKwh: number
  plugKwh: number
  otherKwh: number
  heatUnits: number
  designLoadFactor: number
  done: MeasureId[]
}

export interface StepResult {
  id: MeasureId
  phase: number
  gross: number
  incentive: number
  net: number
  kwhSaved: number
  heatSaved: number
  kwhGenerated: number
  annualSavings: number
  co2: number
  mmbtu: number
  solarKw: number
  /** Same measure run alone on the original baseline. */
  standaloneSavings: number
  standaloneGross: number
  effects: InteractionEffect[]
  confidence: ConfidenceLevel
}

export interface PlanResult {
  ids: MeasureId[]
  order: MeasureId[]
  steps: StepResult[]
  gross: number
  incentive: number
  net: number
  annualSavings: number
  payback: number | null
  co2: number
  mmbtu: number
  savingsShare: number
  energyReduction: number
  /** Sum of each measure run in isolation — what a naive calculator would show. */
  naiveSavings: number
  /** Savings removed to avoid double counting (naiveSavings - annualSavings, ≥ 0). */
  overlapRemoved: number
  /** Net cost of the same measures in an unsequenced order (HVAC & solar first). */
  unsequencedNet: number
  /** Capital avoided by sequencing (unsequencedNet - net, ≥ 0). */
  sequencingSavings: number
  effects: InteractionEffect[]
  confidence: ConfidenceLevel
}

export function initialState(base: Baseline): LoadState {
  return {
    lightingKwh: base.lightingKwh,
    coolingKwh: base.coolingKwh,
    plugKwh: base.plugKwh,
    otherKwh: base.otherKwh,
    heatUnits: base.heatUnits,
    designLoadFactor: 1,
    done: [],
  }
}

function remainingElecKwh(s: LoadState, base: Baseline): number {
  const heatElec = base.heatFuel === 'electric' ? s.heatUnits : 0
  return s.lightingKwh + s.coolingKwh + s.plugKwh + s.otherKwh + heatElec
}

interface RawStep {
  gross: number
  kwhSaved: number
  heatSaved: number
  kwhGenerated: number
  solarKw: number
  effects: InteractionEffect[]
}

/**
 * Apply one measure to the load state (mutates `s`). `plan` is the full set of
 * measures in the plan so overlap rules can see measures that come later.
 */
function applyMeasure(id: MeasureId, s: LoadState, base: Baseline, plan: MeasureId[]): RawStep {
  const effects: InteractionEffect[] = []
  const has = (m: MeasureId) => s.done.includes(m)
  const ePrice = base.elecPrice

  switch (id) {
    case 'led': {
      const saved = s.lightingKwh * ledSavingsFraction(base)
      s.lightingKwh -= saved
      const climate = { cold: 0.7, mixed: 1, hot: 1.3 }[base.climate]
      const coolSaved = Math.min(s.coolingKwh * 0.15, saved * LED_COOLING_SHARE * climate)
      s.coolingKwh -= coolSaved
      if (base.building.cooling !== 'None') s.designLoadFactor *= 1 - LED_LOAD_REDUCTION
      return { gross: ledGross(base), kwhSaved: saved + coolSaved, heatSaved: 0, kwhGenerated: 0, solarKw: 0, effects }
    }

    case 'envelope': {
      const f = envelopeFractions(base)
      const heatSaved = s.heatUnits * f.heat
      const coolSaved = s.coolingKwh * f.cool
      s.heatUnits -= heatSaved
      s.coolingKwh -= coolSaved
      s.designLoadFactor *= 1 - ENVELOPE_LOAD_REDUCTION
      if (has('hvac')) {
        effects.push({
          rule: 'envelope-hvac',
          title: 'Envelope after HVAC',
          detail:
            'HVAC was already replaced at full size, so the load reduction from envelope work can no longer lower equipment cost.',
          capitalImpact: 0,
          savingsImpact: 0,
        })
      }
      return { gross: envelopeGross(base), kwhSaved: coolSaved, heatSaved, kwhGenerated: 0, solarKw: 0, effects }
    }

    case 'hvac': {
      const fullTons = base.designTons
      const tons = fullTons * s.designLoadFactor
      const perTon = hvacCostPerTon(base)
      const gross = tons * perTon
      const f = hvacFractions(base)
      const heatSaved = s.heatUnits * f.heat
      const coolSaved = s.coolingKwh * f.cool
      // What HVAC would save on the untouched baseline (for the double-counting note)
      const baseSavings = base.heatUnits * f.heat * base.heatPrice + base.coolingKwh * f.cool * ePrice
      const actualSavings = heatSaved * base.heatPrice + coolSaved * ePrice

      // Split the total capacity reduction between rules A and B so the two
      // effects always add up to (full-size cost - right-sized cost).
      const totalReduction = fullTons * perTon - gross
      const envelopeShare = has('envelope') ? fullTons * perTon * ENVELOPE_LOAD_REDUCTION : 0
      if (has('envelope')) {
        effects.push({
          rule: 'envelope-hvac',
          title: 'Envelope first → smaller HVAC',
          detail:
            'Improving the envelope first reduces heating and cooling demand, which may allow future HVAC equipment to be sized for a smaller building load.',
          capitalImpact: Math.min(envelopeShare, totalReduction),
          savingsImpact: 0,
        })
      }
      if (has('led') && base.building.cooling !== 'None') {
        effects.push({
          rule: 'led-hvac',
          title: 'LED first → lower cooling load',
          detail:
            'LED lighting puts less heat into the space, slightly reducing cooling load and required capacity. HVAC cooling savings are adjusted down so those kWh are not counted twice.',
          capitalImpact: Math.max(0, totalReduction - envelopeShare),
          savingsImpact: 0,
        })
      }
      if (has('envelope') || has('led')) {
        effects.push({
          rule: has('envelope') ? 'envelope-hvac' : 'led-hvac',
          title: 'HVAC savings adjusted for earlier phases',
          detail:
            'Part of the heating and cooling savings has already been captured by earlier load-reduction measures, so HVAC savings are calculated on the remaining load.',
          capitalImpact: 0,
          savingsImpact: actualSavings - baseSavings,
        })
      }
      s.heatUnits -= heatSaved
      s.coolingKwh -= coolSaved
      return { gross, kwhSaved: coolSaved, heatSaved, kwhGenerated: 0, solarKw: 0, effects }
    }

    case 'controls': {
      const withHvac = plan.includes('hvac')
      const overlap = withHvac ? CONTROLS_HVAC_OVERLAP : 1
      const heatSaved = s.heatUnits * CONTROLS_FRACTIONS.hvac * overlap
      const coolSaved = s.coolingKwh * CONTROLS_FRACTIONS.hvac * overlap
      const lightSaved = s.lightingKwh * CONTROLS_FRACTIONS.lighting
      const plugSaved = s.plugKwh * CONTROLS_FRACTIONS.plug
      if (withHvac) {
        const lost =
          (s.heatUnits * base.heatPrice + s.coolingKwh * ePrice) * CONTROLS_FRACTIONS.hvac * (1 - CONTROLS_HVAC_OVERLAP)
        effects.push({
          rule: 'controls-hvac',
          title: 'Controls + HVAC overlap',
          detail: `New HVAC equipment already includes some of the same control capability, so a ${Math.round(
            (1 - CONTROLS_HVAC_OVERLAP) * 100,
          )}% overlap factor is applied to HVAC-related control savings.`,
          capitalImpact: 0,
          savingsImpact: -lost,
        })
      }
      s.heatUnits -= heatSaved
      s.coolingKwh -= coolSaved
      s.lightingKwh -= lightSaved
      s.plugKwh -= plugSaved
      return {
        gross: controlsGross(base),
        kwhSaved: coolSaved + lightSaved + plugSaved,
        heatSaved,
        kwhGenerated: 0,
        solarKw: 0,
        effects,
      }
    }

    case 'solar': {
      const remaining = remainingElecKwh(s, base)
      const roofLimitKwh = base.roofKw * base.solarYield
      const target = Math.min(remaining * SOLAR_TARGET_SHARE, roofLimitKwh, remaining * SOLAR_MAX_SHARE)
      const kw = target / base.solarYield
      const gross = kw * 1000 * SOLAR_COST_PER_W

      const baselineElec = base.elecKwh + (base.heatFuel === 'electric' ? base.heatUnits : 0)
      const naiveKwh = Math.min(baselineElec * SOLAR_TARGET_SHARE, roofLimitKwh)
      const naiveKw = naiveKwh / base.solarYield
      const efficiencyBefore = s.done.some((m) => m !== 'solar')
      if (efficiencyBefore && naiveKw - kw > 0.5) {
        effects.push({
          rule: 'efficiency-solar',
          title: 'Efficiency first → right-sized solar',
          detail: `Solar is sized against the building's reduced electricity demand (${Math.round(
            remaining,
          ).toLocaleString()} kWh) instead of the original baseline. That avoids about ${Math.round(
            naiveKw - kw,
          )} kW of capacity the building would no longer need.`,
          capitalImpact: (naiveKw - kw) * 1000 * SOLAR_COST_PER_W,
          savingsImpact: 0,
        })
      }
      return { gross, kwhSaved: 0, heatSaved: 0, kwhGenerated: target, solarKw: kw, effects }
    }
  }
}

function standalone(id: MeasureId, base: Baseline): { gross: number; savings: number } {
  const s = initialState(base)
  const r = applyMeasure(id, s, base, [id])
  return {
    gross: r.gross,
    savings: (r.kwhSaved + r.kwhGenerated) * base.elecPrice + r.heatSaved * base.heatPrice,
  }
}

const RANK: Record<ConfidenceLevel, number> = { Low: 0, Medium: 1, High: 2 }

/** Simulate a plan in the given order and roll up economics with sanity caps. */
export function simulate(order: MeasureId[], base: Baseline, scenario: Scenario, withUnsequenced = true): PlanResult {
  const s = initialState(base)
  const steps: StepResult[] = []
  const incentiveRate = clamp(scenario.incentiveRate, 0, 0.3)

  order.forEach((id, i) => {
    const r = applyMeasure(id, s, base, order)
    s.done.push(id)
    const gross = nonNeg(r.gross)
    const incentive = capIncentive(gross * incentiveRate, gross)
    const net = nonNeg(gross - incentive)
    const annualSavings = nonNeg((r.kwhSaved + r.kwhGenerated) * base.elecPrice + r.heatSaved * base.heatPrice)
    const elecT = (r.kwhSaved + r.kwhGenerated) * GRID_T_PER_KWH
    const heatT = base.heatFuel === 'gas' ? r.heatSaved * GAS_T_PER_THERM : r.heatSaved * GRID_T_PER_KWH
    const heatM = base.heatFuel === 'gas' ? r.heatSaved * THERM_TO_MMBTU : r.heatSaved * KWH_TO_MMBTU
    const alone = standalone(id, base)
    // Report capital effects in net (post-incentive) dollars, like every plan total.
    const effects = r.effects.map((e) => ({ ...e, capitalImpact: nonNeg(e.capitalImpact) * (1 - incentiveRate) }))
    steps.push({
      id,
      phase: i + 1,
      gross,
      incentive,
      net,
      kwhSaved: nonNeg(r.kwhSaved),
      heatSaved: nonNeg(r.heatSaved),
      kwhGenerated: nonNeg(r.kwhGenerated),
      annualSavings,
      co2: nonNeg(elecT + heatT),
      mmbtu: nonNeg((r.kwhSaved + r.kwhGenerated) * KWH_TO_MMBTU + heatM),
      solarKw: nonNeg(r.solarKw),
      standaloneSavings: alone.savings,
      standaloneGross: alone.gross,
      effects,
      confidence: measureConfidence(id, base),
    })
  })

  // Sanity rule: combined savings can never exceed a share of total spend.
  const rawSavings = steps.reduce((a, x) => a + x.annualSavings, 0)
  const cap = base.totalSpend * MAX_SAVINGS_SHARE
  if (rawSavings > cap && rawSavings > 0) {
    const k = cap / rawSavings
    steps.forEach((x) => (x.annualSavings *= k))
  }

  const sum = (f: (x: StepResult) => number) => steps.reduce((a, x) => a + f(x), 0)
  const gross = sum((x) => x.gross)
  const incentive = sum((x) => x.incentive)
  const net = nonNeg(gross - incentive)
  const annualSavings = Math.min(sum((x) => x.annualSavings), cap)
  const mmbtu = sum((x) => x.mmbtu)
  const naiveSavings = sum((x) => x.standaloneSavings)

  let unsequencedNet = net
  if (withUnsequenced && order.length > 1) {
    const bad = unsequencedOrder(order)
    if (bad.join() !== order.join()) unsequencedNet = simulate(bad, base, scenario, false).net
  }

  const confidence = steps.length
    ? steps.map((x) => x.confidence).reduce((a, c) => (RANK[c] < RANK[a] ? c : a), 'High' as ConfidenceLevel)
    : 'Medium'

  return {
    ids: [...order],
    order,
    steps,
    gross,
    incentive,
    net,
    annualSavings,
    payback: payback(net, annualSavings),
    co2: sum((x) => x.co2),
    mmbtu,
    savingsShare: base.totalSpend > 0 ? annualSavings / base.totalSpend : 0,
    energyReduction: base.baselineMmbtu > 0 ? clamp(mmbtu / base.baselineMmbtu, 0, 1) : 0,
    naiveSavings,
    overlapRemoved: nonNeg(naiveSavings - annualSavings),
    unsequencedNet,
    sequencingSavings: nonNeg(unsequencedNet - net),
    effects: steps.flatMap((x) => x.effects),
    confidence,
  }
}

/** The "do the big-ticket items first" order a naive owner might follow. */
export function unsequencedOrder(ids: MeasureId[]): MeasureId[] {
  const pri: MeasureId[] = ['solar', 'hvac', 'controls', 'led', 'envelope']
  return pri.filter((m) => ids.includes(m))
}

/**
 * Sequencing rules — the order Pathfinder recommends for a set of measures:
 *  1. Load reduction (envelope, LED) before systems. If HVAC is in the plan,
 *     envelope leads because it has the largest effect on HVAC sizing;
 *     otherwise the faster payback goes first.
 *  2. HVAC after load reduction so it can be right-sized.
 *  3. Controls are commissioned after new HVAC; without HVAC they are an
 *     early low-cost win ordered by payback.
 *  4. Solar always last, sized to remaining demand.
 */
export function sequence(ids: MeasureId[], base: Baseline): MeasureId[] {
  const has = (m: MeasureId) => ids.includes(m)
  const pb = (m: MeasureId) => {
    const a = standalone(m, base)
    return a.savings > 0 ? a.gross / a.savings : Infinity
  }
  const early: MeasureId[] = (['envelope', 'led'] as MeasureId[]).filter(has)
  if (!has('hvac') && has('controls')) early.push('controls')
  if (has('hvac')) early.sort((a, b) => (a === 'envelope' ? -1 : b === 'envelope' ? 1 : pb(a) - pb(b)))
  else early.sort((a, b) => pb(a) - pb(b))

  const out = [...early]
  if (has('hvac')) out.push('hvac')
  if (has('hvac') && has('controls')) out.push('controls')
  if (has('solar')) out.push('solar')
  return out
}
