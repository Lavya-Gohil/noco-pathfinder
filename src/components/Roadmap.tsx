import type { Baseline } from '../engine/baseline'
import { phaseReason } from '../engine/explanations'
import type { PlanResult } from '../engine/interactions'
import { MEASURES } from '../engine/measures'
import type { MeasureId } from '../types'
import { money } from '../utils/format'
import { cx } from './ui'

export interface FuturePhase {
  id: MeasureId
  extraBudget: number
}

const pad = (n: number) => String(n).padStart(2, '0')

function Marker({ n, muted, last }: { n: number; muted?: boolean; last?: boolean }) {
  return (
    <div className="relative flex flex-col items-center" aria-hidden>
      <span
        className={cx(
          'tnum z-10 grid h-7 w-7 place-items-center rounded-full border text-[11px] font-medium',
          muted ? 'border-dashed border-line-strong bg-surface text-fg-3' : 'border-brand bg-brand-soft text-brand-text',
        )}
      >
        {pad(n)}
      </span>
      {!last && <span className={cx('w-px flex-1', muted ? 'bg-line' : 'bg-line-strong')} />}
    </div>
  )
}

export function Roadmap({ plan, base, future }: { plan: PlanResult; base: Baseline; future: FuturePhase[] }) {
  const total = plan.steps.length + future.length
  return (
    <ol>
      {plan.steps.map((s, i) => {
        const capital = s.effects.reduce((a, e) => a + Math.max(0, e.capitalImpact), 0)
        return (
          <li key={s.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-4">
            <Marker n={s.phase} last={i === total - 1} />
            <div className="pb-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-[14px] font-semibold text-fg">{MEASURES[s.id].name}</h3>
                <div className="tnum flex gap-4 text-[13px]">
                  <span className="text-fg">
                    {money(s.net)} <span className="text-fg-2">net</span>
                  </span>
                  <span className="text-brand-text">+{money(s.annualSavings)}/yr</span>
                </div>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{phaseReason(plan, s, base)}</p>
              {capital > 1 && (
                <p className="tnum mt-1.5 text-[12px] text-fg-2">
                  Sequencing effect: <span className="font-medium text-brand-text">−{money(capital)}</span> on this phase's net cost
                </p>
              )}
            </div>
          </li>
        )
      })}
      {future.map((f, i) => (
        <li key={f.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-4 print:hidden">
          <Marker n={plan.steps.length + i + 1} muted last={plan.steps.length + i === total - 1} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-5 pt-1">
            <span className="text-[13px] text-fg-2">{MEASURES[f.id].name}</span>
            <span className="tnum text-[12px] text-fg-3">Outside budget · +{money(f.extraBudget)} to add</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
