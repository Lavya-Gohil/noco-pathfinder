import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button, cx } from './ui'

export interface Stage {
  title: string
  summary?: string
}

/** Horizontal in-page progress through a page's stages. */
export function StageNav({
  stages,
  current,
  onSelect,
  canSelect = () => true,
  label,
  tour,
}: {
  stages: Stage[]
  current: number
  onSelect: (i: number) => void
  canSelect?: (i: number) => boolean
  label: string
  tour?: string
}) {
  return (
    <nav aria-label={label} data-tour={tour} className="neu-inset mb-6 rounded-2xl p-1.5 print:hidden">
      <ol className="flex gap-1.5">
        {stages.map((s, i) => {
          const active = i === current
          const done = i < current
          const enabled = active || canSelect(i)
          return (
            <li key={s.title} className={cx('min-w-0', active ? 'flex-[2.2] sm:flex-1' : 'flex-1')}>
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={cx(
                  'flex h-11 w-full items-center justify-center gap-2 rounded-xl px-2 text-[13px] transition-[box-shadow,color,background] duration-150 sm:justify-start sm:px-3',
                  active ? 'neu-raised-sm font-semibold text-fg' : enabled ? 'text-fg-2 hover:text-fg' : 'cursor-not-allowed text-fg-3',
                )}
              >
                <span
                  className={cx(
                    'tnum grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                    active ? 'neu-btn-primary !shadow-none' : done ? 'bg-brand-soft text-brand-text' : 'neu-inset-sm text-fg-3',
                  )}
                  aria-hidden
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cx('truncate', !active && 'hidden md:inline')}>{s.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Back / Continue controls at the bottom of a stage. */
export function StageFooter({
  onBack,
  onNext,
  backLabel = 'Back',
  nextLabel = 'Continue',
  note,
  nextTour,
  nextDisabled,
}: {
  onBack?: () => void
  onNext: () => void
  backLabel?: string
  nextLabel?: ReactNode
  note?: ReactNode
  nextTour?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
          </Button>
        )}
        {note && <p className="text-[13px] text-fg-2">{note}</p>}
      </div>
      <Button onClick={onNext} tour={nextTour} disabled={nextDisabled}>
        {nextLabel} <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  )
}
