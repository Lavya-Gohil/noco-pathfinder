// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { buildBaseline } from '../engine/baseline'
import { dataConfidence } from '../engine/confidence'
import { simulate } from '../engine/interactions'
import { ReportPage } from '../pages/ReportPage'
import { DEMO_FORM, toBuilding } from '../utils/building'
import { Roadmap } from './Roadmap'

afterEach(cleanup)

const building = toBuilding(DEMO_FORM)
const base = buildBaseline(building, 0)
const scenario = { budget: 250_000, elecPriceChange: 0, incentiveRate: 0.15 }
const plan = simulate(['led', 'controls'], base, scenario)

describe('Roadmap', () => {
  it('only calls a measure outside the budget when it is', () => {
    render(<Roadmap plan={plan} base={base} budget={scenario.budget} future={[{ id: 'envelope', extraBudget: scenario.budget - plan.net }]} />)
    expect(screen.getByText(/Not in this path/)).toBeInTheDocument()
    expect(screen.queryByText(/Outside budget/)).toBeNull()
  })

  it('marks a measure that would go over budget', () => {
    render(<Roadmap plan={plan} base={base} budget={scenario.budget} future={[{ id: 'solar', extraBudget: scenario.budget }]} />)
    expect(screen.getByText(/Outside budget/)).toBeInTheDocument()
  })
})

describe('ReportPage', () => {
  const strategy = { id: 'quick' as const, name: 'Quick Wins', goal: '', plan, sameAs: null, score: 0 }
  const report = (recommended: boolean) =>
    render(
      <ReportPage
        base={base}
        strategy={{ ...strategy, recommended }}
        confidence={dataConfidence(building)}
        scenario={scenario}
        onBack={() => {}}
      />,
    )

  it('recommends the path that matches the objective', () => {
    report(true)
    expect(screen.getByText(/recommends the/)).toBeInTheDocument()
  })

  it('tells the reader what the plan does about aging HVAC', () => {
    report(true)
    expect(screen.getByText(/This plan leaves the HVAC, about \d+ years old, in place/)).toBeInTheDocument()
  })

  it('does not claim to recommend a path the user picked themselves', () => {
    report(false)
    expect(screen.queryByText(/recommends the/)).toBeNull()
    expect(screen.getByText(/selected for review/)).toBeInTheDocument()
  })
})
