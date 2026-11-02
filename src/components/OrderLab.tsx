import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { Baseline } from '../engine/baseline'
import { ANALYSIS_YEARS, rankOrders, type PlanResult } from '../engine/interactions'
import { MEASURES } from '../engine/measures'
import type { Scenario } from '../types'
import { money } from '../utils/format'
import { AnimatedNumber, Button, Panel, Tag, cx } from './ui'

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="neu-raised-sm rounded-xl px-4 py-3">
      <div className="text-[12px] text-fg-2">{label}</div>
      <div className="tnum mt-0.5 text-[20px] font-semibold tracking-[-0.01em] text-fg">{children}</div>
      {note && <div className="tnum mt-0.5 text-[12px] text-fg-2">{note}</div>}
    </div>
  )
}

const signedMoney = (v: number) => (Math.abs(v) < 1 ? 'Same as best' : `${v > 0 ? '+' : '−'}${money(Math.abs(v))} vs best`)

/** Lets the user reorder a plan's phases and see what each order is worth, using the same simulation as the optimizer. */
export function OrderLab({ plan, base, scenario }: { plan: PlanResult; base: Baseline; scenario: Scenario }) {
  const ranked = useMemo(() => rankOrders(plan.order, base, scenario), [plan.order, base, scenario])
  const [order, setOrder] = useState(plan.order)
  const index = ranked.findIndex((p) => p.order.join() === order.join())
  const current = ranked[index]
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  const overBudget = current.net - scenario.budget

  const move = (from: number, to: number) => {
    const next = [...order]
    next.splice(to, 0, next.splice(from, 1)[0])
    setOrder(next)
  }

  return (
    <Panel
      tour="strategy-lab"
      className="mt-6"
      title="Order lab"
      description={`Move the upgrades to see what the order is worth. All ${ranked.length} orders of this plan are simulated.`}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => setOrder(worst.order)} disabled={index === ranked.length - 1} tour="strategy-lab-worst">
            Worst order
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOrder(best.order)} disabled={index === 0}>
            Best order
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ol className="space-y-2.5">
          {order.map((id, i) => (
            <li key={id} className="neu-inset flex items-center gap-3 rounded-xl px-3 py-2">
              <span className="tnum w-6 text-center text-[12px] font-semibold text-brand-text">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{MEASURES[id].name}</span>
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label={`Move ${MEASURES[id].name} earlier`}
                className="neu-btn grid h-8 w-8 place-items-center rounded-lg text-fg-2 hover:text-fg disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === order.length - 1}
                aria-label={`Move ${MEASURES[id].name} later`}
                className="neu-btn grid h-8 w-8 place-items-center rounded-lg text-fg-2 hover:text-fg disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ol>

        <div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="This order ranks" note={index === 0 ? 'Best that fits the budget' : `of ${ranked.length} orders`}>
              <span aria-live="polite" className={cx(index === 0 && 'text-brand-text')}>
                #{index + 1}
              </span>
            </Stat>
            <Stat label={`${ANALYSIS_YEARS}-year value`} note={signedMoney(current.npv - best.npv)}>
              <AnimatedNumber value={current.npv} format={money} />
            </Stat>
            <Stat label="Net cost" note={signedMoney(current.net - best.net)}>
              <AnimatedNumber value={current.net} format={money} />
            </Stat>
            <Stat label="Savings once complete" note="Per year">
              <AnimatedNumber value={current.annualSavings} format={money} />
            </Stat>
          </div>
          {overBudget > 0.5 && (
            <div className="mt-3">
              <Tag tone="warn">{money(overBudget)} over the budget in this order</Tag>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
