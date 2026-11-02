import { describe, expect, it } from 'vitest'
import { DEMO_FORM, toBuilding } from '../utils/building'
import { CURRENT_YEAR, buildBaseline, climateFor, measuredCoolingShare } from './baseline'
import { dataConfidence } from './confidence'
import { money } from '../utils/format'
import { hvacTradeoff, nextSteps, valueNote, versusHvacAlone } from './explanations'
import { bestOrder, cashPosition, discount, permutations, simulate, type PlanResult } from './interactions'
import { MEASURE_IDS, SOLAR_BILL_VALUE, envelopeLoadReduction, measureConfidence } from './measures'
import { BALANCED_MAX_STEP_PAYBACK, optimize, recommendedPath } from './optimizer'
import type { MeasureId } from '../types'

const demo = toBuilding(DEMO_FORM)
const base = buildBaseline(demo, 0)
const scenario = { budget: demo.budget, elecPriceChange: 0, incentiveRate: 0.15 }

describe('baseline', () => {
  it('maps states to climate zones', () => {
    expect(climateFor('ny')).toBe('cold')
    expect(climateFor('TX')).toBe('hot')
    expect(climateFor('CA')).toBe('mixed')
  })

  it('splits electricity into end uses that sum to the total', () => {
    const sum = base.lightingKwh + base.coolingKwh + base.plugKwh + base.otherKwh
    expect(sum).toBeCloseTo(base.elecKwh, 6)
    expect(base.endUses.reduce((a, e) => a + e.share, 0)).toBeCloseTo(1, 6)
  })

  it('measures cooling from summer usage above base load', () => {
    expect(measuredCoolingShare(demo)).toBeCloseTo(0.2579, 3)
    expect(measuredCoolingShare({ ...demo, cooling: 'None' })).toBeNull()
    expect(measuredCoolingShare({ ...demo, monthlyKwh: null })).toBeNull()
  })

  it('applies the electricity price scenario to spend', () => {
    expect(buildBaseline(demo, 0.5).elecCost).toBeCloseTo(base.elecCost * 1.5, 6)
  })
})

describe('simulate', () => {
  it('never exceeds the naive sum of stand-alone savings', () => {
    const plan = simulate([...MEASURE_IDS], base, scenario)
    expect(plan.annualSavings).toBeLessThanOrEqual(plan.naiveSavings)
    expect(plan.overlapRemoved).toBeGreaterThan(0)
  })

  it('prices incentives into every step', () => {
    const plan = simulate(['led', 'hvac'], base, scenario)
    expect(plan.incentive).toBeCloseTo(plan.gross * 0.15, 6)
    expect(plan.net).toBeCloseTo(plan.gross - plan.incentive, 6)
  })

  it('makes HVAC cheaper once envelope and LED are done first', () => {
    const first = simulate(['hvac', 'envelope', 'led'], base, scenario)
    const last = simulate(['envelope', 'led', 'hvac'], base, scenario)
    const hvacNet = (p: typeof first) => p.steps.find((s) => s.id === 'hvac')!.net
    expect(hvacNet(last)).toBeLessThan(hvacNet(first))
  })

  it('caps savings at the configured share of total spend', () => {
    const cheap = { ...demo, elecCost: 1000, heatCost: 0, kwh: null, monthlyKwh: null }
    const plan = simulate([...MEASURE_IDS], buildBaseline(cheap, 0), scenario)
    expect(plan.savingsShare).toBeLessThanOrEqual(0.85 + 1e-9)
  })
})

describe('optimize', () => {
  const result = optimize(base, scenario)

  it('evaluates all 31 non-empty combinations', () => {
    expect(result.plans).toHaveLength(31)
  })

  it('keeps every selected path within budget', () => {
    for (const s of result.strategies) {
      if (s.plan) expect(s.plan.net).toBeLessThanOrEqual(scenario.budget + 0.5)
    }
  })

  it('finds nothing when the budget is too small', () => {
    const tiny = optimize(base, { ...scenario, budget: 1000 })
    expect(tiny.strategies.every((s) => s.plan === null)).toBe(true)
    expect(tiny.cheapestEntry).not.toBeNull()
  })

  it('never produces non-finite numbers across a sweep of buildings', () => {
    const types = ['Office', 'Warehouse', 'Retail', 'School', 'Multifamily'] as const
    const heats = ['Natural Gas Furnace', 'Boiler', 'Heat Pump', 'Electric Resistance', 'Not Sure'] as const
    const cools = ['Central AC', 'Rooftop Units', 'Heat Pump', 'None', 'Not Sure'] as const
    for (const type of types)
      for (const heating of heats)
        for (const cooling of cools) {
          const b = { ...demo, type, heating, cooling, heatCost: heating === 'Heat Pump' ? 0 : demo.heatCost }
          for (const p of optimize(buildBaseline(b, 0), scenario).plans) {
            for (const v of [p.net, p.gross, p.annualSavings, p.co2, p.mmbtu]) expect(Number.isFinite(v)).toBe(true)
          }
        }
  })

  it('maps objectives to paths', () => {
    expect(recommendedPath('Fastest Payback')).toBe('quick')
    expect(recommendedPath('Balanced')).toBe('balanced')
    expect(recommendedPath('Maximum Savings')).toBe('savings')
    expect(recommendedPath('Deep Retrofit')).toBe('deep')
  })
})

describe('Maximum Savings path', () => {
  const path = (r: ReturnType<typeof optimize>, id: string) => r.strategies.find((s) => s.id === id)!

  it('always offers the affordable plan that saves the most dollars', () => {
    for (const budget of [100_000, 200_000, 400_000, 500_000, 600_000, 800_000, 1_000_000]) {
      const r = optimize(base, { ...scenario, budget })
      const most = Math.max(...r.affordable.map((p) => p.annualSavings))
      expect(path(r, 'savings').plan!.annualSavings).toBe(most)
      expect(path(r, 'savings').plan!.net).toBeLessThanOrEqual(budget + 0.5)
    }
  })

  it('finds savings the other paths miss', () => {
    const r = optimize(base, { ...scenario, budget: 600_000 })
    const others = ['quick', 'balanced', 'deep'].map((id) => path(r, id).plan!.annualSavings)
    expect(path(r, 'savings').plan!.annualSavings).toBeGreaterThan(Math.max(...others))
  })

  it('is marked as the same plan when another path already gets there', () => {
    const r = optimize(base, { ...scenario, budget: 800_000 })
    expect(path(r, 'deep').sameAs).toBe('savings')
  })

  it('is recommended for that objective', () => {
    const r = optimize(buildBaseline({ ...demo, objective: 'Maximum Savings' }, 0), scenario)
    expect(r.strategies.filter((s) => s.recommended).map((s) => s.id)).toEqual(['savings'])
  })

  it('is absent when nothing fits the budget', () => {
    expect(path(optimize(base, { ...scenario, budget: 1000 }), 'savings').plan).toBeNull()
  })
})

describe('Balanced path', () => {
  const stepPaybacks = (p: PlanResult) => p.steps.map((s) => s.net / s.annualSavings)

  it('keeps every phase within the payback limit when it can', () => {
    const midLife = buildBaseline({ ...demo, hvacYear: CURRENT_YEAR - 14 }, 0)
    for (const budget of [100_000, 250_000, 400_000, 1_000_000]) {
      const s = optimize(midLife, { ...scenario, budget }).strategies.find((x) => x.id === 'balanced')!
      for (const pb of stepPaybacks(s.plan!)) expect(pb).toBeLessThanOrEqual(BALANCED_MAX_STEP_PAYBACK)
      expect(s.note).toBeUndefined()
    }
  })

  it('says so when no plan can meet the limit', () => {
    const lowBills = buildBaseline({ ...demo, elecCost: 20_000, heatCost: 5_000, kwh: null, monthlyKwh: null, hvacYear: CURRENT_YEAR - 14 }, 0)
    const s = optimize(lowBills, { ...scenario, budget: 1_000_000 }).strategies.find((x) => x.id === 'balanced')!
    expect(s.plan).not.toBeNull()
    expect(s.note).toContain('closest available')
  })
})

describe('sequencing value', () => {
  it('fits the demo budget only in the sequenced order', () => {
    const balanced = optimize(base, scenario).strategies.find((s) => s.id === 'balanced')!.plan!
    expect(balanced.order).toContain('hvac')
    expect(balanced.net).toBeLessThanOrEqual(scenario.budget)
    expect(balanced.unsequencedNet).toBeGreaterThan(scenario.budget)
  })

  it('does not count a smaller solar array as a saving', () => {
    const plan = simulate(['envelope', 'led', 'controls', 'solar'], base, scenario)
    expect(plan.sequencingSavings).toBeLessThan(1)
    expect(plan.steps.find((s) => s.id === 'solar')!.effects.every((e) => e.capitalImpact === 0)).toBe(true)
  })

  it('sizes solar the same wherever it falls in the plan', () => {
    const first = simulate(['solar', 'led', 'envelope'], base, scenario).steps.find((s) => s.id === 'solar')!
    const last = simulate(['led', 'envelope', 'solar'], base, scenario).steps.find((s) => s.id === 'solar')!
    expect(first.solarKw).toBeCloseTo(last.solarKw, 6)
    expect(first.net).toBeCloseTo(last.net, 6)
  })

  it('shrinks solar when efficiency reduces demand', () => {
    const alone = simulate(['solar'], base, scenario).steps[0]
    const after = simulate(['led', 'solar'], base, scenario).steps[1]
    expect(after.solarKw).toBeLessThan(alone.solarKw)
  })
})

describe('measure realism', () => {
  const hvacGross = (order: MeasureId[], b = base) => simulate(order, b, scenario).steps.find((s) => s.id === 'hvac')!.gross

  it('values solar below the average electricity price', () => {
    const s = simulate(['solar'], base, scenario).steps[0]
    expect(s.annualSavings).toBeCloseTo(s.kwhGenerated * base.elecPrice * SOLAR_BILL_VALUE, 6)
  })

  it('takes a winter heating penalty off LED savings, largest in cold climates', () => {
    const penalty = (state: string) => -simulate(['led'], buildBaseline({ ...demo, state }, 0), scenario).steps[0].heatSaved
    expect(penalty('NY')).toBeGreaterThan(penalty('CA'))
    expect(penalty('CA')).toBeGreaterThan(penalty('TX'))
    expect(penalty('TX')).toBeGreaterThan(0)
  })

  it('takes no LED heating penalty when there is no heating to add to', () => {
    const noHeat = buildBaseline({ ...demo, heatCost: 0 }, 0)
    expect(simulate(['led'], noHeat, scenario).steps[0].heatSaved).toBeCloseTo(0, 9)
  })

  it('reduces design load more in older buildings', () => {
    const old = buildBaseline({ ...demo, yearBuilt: 1970, hvacYear: null }, 0)
    const recent = buildBaseline({ ...demo, yearBuilt: 2008, hvacYear: null }, 0)
    expect(envelopeLoadReduction(old)).toBeGreaterThan(envelopeLoadReduction(recent))
    expect(hvacGross(['envelope', 'hvac'], old) / hvacGross(['hvac'], old)).toBeLessThan(hvacGross(['envelope', 'hvac'], recent) / hvacGross(['hvac'], recent))
  })

  it('does not cut HVAC cost as fast as capacity', () => {
    const ratio = hvacGross(['envelope', 'hvac']) / hvacGross(['hvac'])
    expect(ratio).toBeGreaterThan(1 - envelopeLoadReduction(base))
    expect(ratio).toBeLessThan(1)
  })

  it('keeps the capital effects equal to the HVAC cost reduction', () => {
    const plan = simulate(['envelope', 'led', 'hvac'], base, scenario)
    const hvac = plan.steps.find((s) => s.id === 'hvac')!
    const capital = hvac.effects.reduce((a, e) => a + e.capitalImpact, 0)
    expect(capital).toBeCloseTo(plan.unsequencedNet - plan.net, 3)
  })

  describe('recent HVAC', () => {
    const recent = buildBaseline({ ...demo, hvacYear: CURRENT_YEAR - 2 }, 0)

    it('is not recommended for replacement, but stays in the comparison', () => {
      const r = optimize(recent, { ...scenario, budget: 5_000_000 })
      expect(r.notAdvised.hvac).toContain('2 years')
      expect(r.candidates).toHaveLength(15)
      expect(r.plans).toHaveLength(31)
      for (const s of r.strategies) expect(s.plan!.order).not.toContain('hvac')
    })

    it('is still an option when it is electric resistance heat', () => {
      const resistance = buildBaseline({ ...demo, heating: 'Electric Resistance', hvacYear: CURRENT_YEAR - 2 }, 0)
      expect(optimize(resistance, scenario).notAdvised.hvac).toBeUndefined()
    })

    it('uses building age when the install year is unknown', () => {
      const newBuild = buildBaseline({ ...demo, yearBuilt: CURRENT_YEAR - 3, hvacYear: null }, 0)
      expect(optimize(newBuild, scenario).notAdvised.hvac).toBeDefined()
    })
  })

  it('exempts HVAC past its service life from the payback limit', () => {
    const balanced = optimize(base, scenario).strategies.find((s) => s.id === 'balanced')!
    expect(balanced.plan!.order).toContain('hvac')
    expect(balanced.note).toBeUndefined()
  })
})

describe('choosing the order', () => {
  it('tries every ordering', () => {
    expect(permutations(['led', 'hvac', 'solar'])).toHaveLength(6)
    expect(permutations([...MEASURE_IDS])).toHaveLength(120)
    expect(optimize(base, scenario).ordersTested).toBe(325)
  })

  it('picks the most valuable order that fits the budget', () => {
    const ids: MeasureId[] = ['envelope', 'led', 'hvac']
    const chosen = simulate(bestOrder(ids, base, scenario), base, scenario, false)
    for (const order of permutations(ids)) {
      const other = simulate(order, base, scenario, false)
      if (other.net <= scenario.budget) expect(chosen.npv).toBeGreaterThanOrEqual(other.npv - 0.01)
    }
    expect(chosen.net).toBeLessThanOrEqual(scenario.budget)
  })

  it('prefers a cheaper order when only that one fits', () => {
    const ids: MeasureId[] = ['envelope', 'led', 'hvac']
    const order = bestOrder(ids, base, { ...scenario, budget: 580_000 })
    expect(order.indexOf('hvac')).toBe(2)
  })

  it('is not one fixed sequence', () => {
    const orders = new Set<string>()
    for (const state of ['NY', 'TX', 'CA'])
      for (const yearBuilt of [1965, 1988, 2008])
        for (const heatCost of [5_000, 54_000, 150_000]) {
          const b = buildBaseline({ ...demo, state, yearBuilt, hvacYear: null, heatCost }, 0)
          orders.add(bestOrder(['envelope', 'led', 'hvac', 'controls'], b, { ...scenario, budget: 5_000_000 }).join('>'))
        }
    expect(orders.size).toBeGreaterThan(1)
  })

  it('never puts HVAC ahead of the load reductions that shrink it on the demo', () => {
    const order = bestOrder(['envelope', 'led', 'hvac'], base, scenario)
    expect(order.indexOf('hvac')).toBeGreaterThan(order.indexOf('envelope'))
  })

  it('charges for recommissioning controls when HVAC follows them', () => {
    const first = simulate(['controls', 'hvac'], base, scenario).steps[1]
    const after = simulate(['hvac', 'controls'], base, scenario).steps[0]
    expect(first.gross).toBeGreaterThan(after.gross)
    expect(first.effects.some((e) => e.title === 'Controls recommissioned')).toBe(true)
  })

  it('starts each phase a year after the last', () => {
    expect(simulate(['led', 'envelope', 'hvac'], base, scenario).steps.map((s) => s.startYear)).toEqual([0, 1, 2])
  })

  it('values earlier savings above later ones', () => {
    const fastFirst = simulate(['led', 'solar'], base, scenario)
    const slowFirst = simulate(['solar', 'led'], base, scenario)
    expect(fastFirst.npv).toBeGreaterThan(slowFirst.npv)
  })

  it('tracks cash phase by phase', () => {
    const plan = simulate(['led', 'envelope'], base, scenario)
    const [a, b] = plan.steps
    expect(cashPosition(plan, 0)).toBeCloseTo(-a.net, 6)
    expect(cashPosition(plan, 1)).toBeCloseTo(-a.net + a.annualSavings - b.net, 6)
    expect(cashPosition(plan, 3)).toBeCloseTo(-a.net - b.net + a.annualSavings * 3 + b.annualSavings * 2, 6)
  })
})

describe('value note', () => {
  const plan = (b = base) => simulate(['envelope', 'hvac'], b, scenario)

  it('explains the cost of HVAC that is due anyway', () => {
    const hvac = plan().steps.find((s) => s.id === 'hvac')!
    expect(valueNote(plan(), base)).toContain(money(hvac.net * discount(1)))
  })

  it('stays out of the way otherwise', () => {
    const midLife = buildBaseline({ ...demo, hvacYear: CURRENT_YEAR - 14 }, 0)
    expect(valueNote(plan(midLife), midLife)).toBeNull()
    expect(valueNote(simulate(['led'], base, scenario), base)).toBeNull()
  })
})

describe('HVAC trade-off', () => {
  it('says when a plan replaces HVAC past its service life', () => {
    expect(hvacTradeoff(simulate(['led', 'hvac'], base, scenario), base)).toMatch(/^Replaces the HVAC, which is about \d+ years old/)
  })

  it('says when a plan leaves it in place', () => {
    expect(hvacTradeoff(simulate(['led', 'solar'], base, scenario), base)).toMatch(/^Leaves the HVAC, about \d+ years old, in place/)
  })

  it('says nothing when the HVAC is not due', () => {
    const midLife = buildBaseline({ ...demo, hvacYear: CURRENT_YEAR - 14 }, 0)
    expect(hvacTradeoff(simulate(['led'], midLife, scenario), midLife)).toBeNull()
    expect(hvacTradeoff(simulate(['led', 'hvac'], midLife, scenario), midLife)).toBeNull()
  })

  it('tells the two demo paths apart', () => {
    const r = optimize(base, scenario).strategies
    const line = (id: string) => hvacTradeoff(r.find((s) => s.id === id)!.plan!, base)
    expect(line('balanced')).toContain('Replaces')
    expect(line('savings')).toContain('Leaves')
  })
})

describe('comparison with replacing HVAC alone', () => {
  const balanced = optimize(base, scenario).strategies.find((s) => s.id === 'balanced')!.plan!

  it('shows what the plan adds beyond the replacement', () => {
    const alone = simulate(['hvac'], base, scenario, false)
    const c = versusHvacAlone(balanced, base, scenario)!
    expect(c.aloneNet).toBeCloseTo(alone.net, 6)
    expect(c.extraNet).toBeCloseTo(balanced.net - alone.net, 6)
    expect(c.extraSavings).toBeCloseTo(balanced.annualSavings - alone.annualSavings, 6)
    expect(c.extraPayback).toBeCloseTo(c.extraNet / c.extraSavings, 6)
  })

  it('makes the demo case far better than the plain payback suggests', () => {
    expect(versusHvacAlone(balanced, base, scenario)!.extraPayback).toBeLessThan(balanced.payback! / 2)
  })

  it('does not apply when the HVAC is not due, not in the plan, or the whole plan', () => {
    const midLife = buildBaseline({ ...demo, hvacYear: CURRENT_YEAR - 14 }, 0)
    expect(versusHvacAlone(simulate(['led', 'hvac'], midLife, scenario), midLife, scenario)).toBeNull()
    expect(versusHvacAlone(simulate(['led', 'envelope'], base, scenario), base, scenario)).toBeNull()
    expect(versusHvacAlone(simulate(['hvac'], base, scenario), base, scenario)).toBeNull()
  })
})

describe('next steps', () => {
  it('does not ask for data the owner has already provided', () => {
    expect(nextSteps(demo).join(' ')).not.toContain('12 months')
    expect(nextSteps({ ...demo, monthlyKwh: null }).join(' ')).toContain('12 months')
  })
})

describe('data completeness', () => {
  it('scores the demo and always names a next data point', () => {
    const c = dataConfidence(demo)
    expect(c.score).toBe(90)
    expect(c.level).toBe('Detailed')
    expect(c.next).toBeDefined()
  })

  it('never rates a measure High from desk data alone', () => {
    for (const id of MEASURE_IDS) expect(measureConfidence(id, base)).not.toBe('High')
  })

  it('rates measures lower when the data behind them is missing', () => {
    const sparse = buildBaseline({ ...demo, kwh: null, monthlyKwh: null, yearBuilt: null, hvacYear: null }, 0)
    expect(measureConfidence('led', sparse)).toBe('Low')
    expect(measureConfidence('solar', sparse)).toBe('Low')
    expect(measureConfidence('envelope', sparse)).toBe('Low')
    expect(measureConfidence('hvac', sparse)).toBe('Low')
  })

  it('names the data that is actually missing', () => {
    const c = dataConfidence({ ...demo, monthlyKwh: null, kwh: 720000, heating: 'Not Sure', cooling: 'Not Sure' })
    expect([c.next, ...c.others].find((n) => n.field === 'hvac')?.label).toBe('Heating and cooling system types')
  })

  it('ranks monthly data first when nothing optional is provided', () => {
    const c = dataConfidence({ ...demo, kwh: null, monthlyKwh: null, hvacYear: null, yearBuilt: null })
    expect(c.next.field).toBe('monthly')
  })
})

it('exports a measure list the rest of the engine can rely on', () => {
  const ids: MeasureId[] = ['envelope', 'led', 'hvac', 'controls', 'solar']
  expect([...MEASURE_IDS].sort()).toEqual(ids.sort())
})
