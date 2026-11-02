// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildBaseline } from '../engine/baseline'
import { dataConfidence } from '../engine/confidence'
import { simulate } from '../engine/interactions'
import { ReportPage } from '../pages/ReportPage'
import { DEMO_FORM, toBuilding } from '../utils/building'
import { OrderLab } from './OrderLab'
import { Roadmap } from './Roadmap'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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

describe('OrderLab', () => {
  const big = simulate(['led', 'envelope', 'hvac'], base, { ...scenario, budget: 600_000 })
  const lab = () => render(<OrderLab plan={big} base={base} scenario={{ ...scenario, budget: 600_000 }} />)

  it('starts on the best order', () => {
    lab()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Best order' })).toBeDisabled()
  })

  it('re-ranks when an upgrade moves', async () => {
    const user = userEvent.setup()
    lab()
    await user.click(screen.getByRole('button', { name: 'Move High-Efficiency HVAC earlier' }))
    expect(screen.queryByText('#1')).toBeNull()
    const moved = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(moved[1]).toContain('High-Efficiency HVAC')
  })

  it('jumps to the worst order, flags the budget, and returns to the best', async () => {
    const user = userEvent.setup()
    lab()
    await user.click(screen.getByRole('button', { name: 'Worst order' }))
    expect(screen.getByText('#6')).toBeInTheDocument()
    expect(screen.getByText(/over the budget in this order/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Best order' }))
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('cannot move the first upgrade earlier or the last later', () => {
    lab()
    expect(screen.getByRole('button', { name: 'Move LED Lighting earlier' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move High-Efficiency HVAC later' })).toBeDisabled()
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
