import { describe, expect, it } from 'vitest'
import { DEMO_FORM, toBuilding } from '../utils/building'
import { buildBaseline, climateFor, measuredCoolingShare } from './baseline'
import { dataConfidence } from './confidence'
import { simulate } from './interactions'
import { MEASURE_IDS } from './measures'
import { optimize, recommendedPath } from './optimizer'
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
    expect(recommendedPath('Deep Retrofit')).toBe('deep')
  })
})

describe('data confidence', () => {
  it('scores the demo and always names a next data point', () => {
    const c = dataConfidence(demo)
    expect(c.score).toBe(90)
    expect(c.next).toBeDefined()
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
