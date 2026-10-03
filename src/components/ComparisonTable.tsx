import { ChevronRight } from 'lucide-react'
import type { PlanResult } from '../engine/interactions'
import { MEASURES, MEASURE_IDS } from '../engine/measures'
import type { MeasureId } from '../types'
import { money, years } from '../utils/format'
import { ConfidenceText, cx } from './ui'

const th = 'px-4 py-2.5 text-[12px] font-medium text-fg-2 whitespace-nowrap'
const td = 'px-4 py-3 whitespace-nowrap'

/** Stand-alone economics of each measure (each simulated on its own). */
export function ComparisonTable({
  singles,
  inPlan,
  onOpen,
}: {
  singles: Record<MeasureId, PlanResult>
  inPlan: MeasureId[]
  onOpen: (id: MeasureId) => void
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="tnum w-full min-w-[820px] border-collapse text-[13px]">
        <thead className="neu-inset-sm">
          <tr>
            <th scope="col" className={cx(th, 'text-left')}>Measure</th>
            <th scope="col" className={cx(th, 'text-right')}>Gross cost</th>
            <th scope="col" className={cx(th, 'text-right')}>Potential incentive</th>
            <th scope="col" className={cx(th, 'text-right')}>Net cost</th>
            <th scope="col" className={cx(th, 'text-right')}>Annual savings</th>
            <th scope="col" className={cx(th, 'text-right')}>Payback</th>
            <th scope="col" className={cx(th, 'text-left')}>Confidence</th>
            <th scope="col" className="w-10"><span className="sr-only">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {MEASURE_IDS.map((id) => {
            const p = singles[id]
            const s = p.steps[0]
            const selected = inPlan.includes(id)
            return (
              <tr
                key={id}
                onClick={() => onOpen(id)}
                className="group cursor-pointer border-b border-line/70 transition-colors duration-150 last:border-b-0 hover:bg-[color-mix(in_srgb,var(--fg)_3%,transparent)] has-[:focus-visible]:bg-[color-mix(in_srgb,var(--fg)_3%,transparent)]"
              >
                <td className={cx(td, 'text-left')}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(id)
                      }}
                      aria-label={`${MEASURES[id].name}: open details`}
                      className="text-left font-medium text-fg hover:underline"
                    >
                      {MEASURES[id].name}
                    </button>
                    {selected && <span className="text-[12px] text-brand-text">· In plan</span>}
                  </div>
                  <div className="text-[12px] text-fg-2">{MEASURES[id].tagline}</div>
                </td>
                <td className={cx(td, 'text-right text-fg')}>{money(s.gross)}</td>
                <td className={cx(td, 'text-right text-fg-2')}>−{money(s.incentive)}</td>
                <td className={cx(td, 'text-right font-medium text-fg')}>{money(s.net)}</td>
                <td className={cx(td, 'text-right text-fg')}>{money(p.annualSavings)}</td>
                <td className={cx(td, 'text-right text-fg')}>{years(p.payback)}</td>
                <td className={td}>
                  <ConfidenceText level={s.confidence} />
                </td>
                <td className="pr-3 text-right">
                  <ChevronRight className="ml-auto h-4 w-4 text-fg-3 transition-colors duration-150 group-hover:text-fg" aria-hidden />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
