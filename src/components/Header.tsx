import { useId } from 'react'
import { Building, CircleHelp, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePref } from '../theme'
import { cx } from './ui'

export type StepId = 'intake' | 'diagnosis' | 'strategy' | 'report'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'intake', label: 'Building' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'report', label: 'Report' },
]

export function Logo({ className, flat, compact }: { className?: string; flat?: boolean; compact?: boolean }) {
  // Unique gradient id per instance: a hidden logo (e.g. the header when printing) must not own the shared gradient.
  const gid = useId()
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <span
        className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-[10px]', !flat && 'neu-raised-sm')}
        aria-hidden
      >
        <svg viewBox="0 0 32 32" className="h-6 w-6">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#21985F" />
              <stop offset="1" stopColor="#136B41" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
          <path d="M9 22.5V9.5l14 13V9.5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={cx('text-[15px] tracking-[-0.01em] text-fg', compact && 'hidden sm:inline')}>
        <span className="font-semibold">NOCO</span> <span className="text-fg-2">Pathfinder</span>
      </span>
    </div>
  )
}

const THEME_OPTIONS: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Light theme', Icon: Sun },
  { id: 'dark', label: 'Dark theme', Icon: Moon },
  { id: 'system', label: 'Use system theme', Icon: Monitor },
]

export function ThemeToggle() {
  const { pref, setPref } = useTheme()
  return (
    <div role="radiogroup" aria-label="Color theme" className="neu-inset flex items-center gap-0.5 rounded-xl p-1">
      {THEME_OPTIONS.map(({ id, label, Icon }) => {
        const on = pref === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => setPref(id)}
            className={cx(
              'grid h-7 w-7 place-items-center rounded-lg transition-[box-shadow,color] duration-150',
              on ? 'neu-raised-sm text-brand-text' : 'text-fg-3 hover:text-fg',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

export function Header({
  step,
  maxStep,
  onNavigate,
  buildingName,
  onTour,
  inApp,
}: {
  step: StepId
  maxStep: number
  onNavigate: (s: StepId) => void
  buildingName?: string
  onTour: () => void
  inApp: boolean
}) {
  const current = STEPS.findIndex((s) => s.id === step)
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md print:hidden">
      <div className="mx-auto max-w-[1320px] px-4 pt-3 sm:px-6 lg:px-8">
        <div className="neu-raised flex h-14 items-center gap-3 rounded-2xl px-3 sm:gap-4 sm:px-4">
          <a href="#/" className="shrink-0 rounded-xl" aria-label="NOCO Pathfinder home">
            <Logo compact />
          </a>
          <nav aria-label="Assessment steps" className="flex min-w-0 flex-1 items-center overflow-x-auto">
            <ol className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const reachable = inApp && i <= maxStep
                const active = inApp && i === current
                return (
                  <li key={s.id} className={cx(!active && 'hidden sm:block')}>
                    <button
                      type="button"
                      disabled={!reachable}
                      onClick={() => onNavigate(s.id)}
                      aria-current={active ? 'step' : undefined}
                      className={cx(
                        'flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] transition-[box-shadow,color] duration-150 sm:px-3',
                        active
                          ? 'neu-inset font-semibold text-fg'
                          : reachable
                            ? 'text-fg-2 hover:text-fg'
                            : 'cursor-not-allowed text-fg-3',
                      )}
                    >
                      <span className={cx('tnum text-[12px]', active ? 'text-brand-text' : 'text-fg-3')}>{i + 1}</span>
                      <span className={cx(!active && 'hidden sm:inline')}>{s.label}</span>
                      {active && <span className="tnum text-[12px] font-normal text-fg-3 sm:hidden">/ {STEPS.length}</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
          {buildingName && (
            <div className="hidden max-w-[220px] items-center gap-1.5 text-[13px] text-fg-2 xl:flex" title={buildingName}>
              <Building className="h-4 w-4 shrink-0 text-fg-3" aria-hidden />
              <span className="truncate">{buildingName}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onTour}
            className="neu-btn grid h-9 w-9 shrink-0 place-items-center rounded-xl text-fg-2 hover:text-fg"
            aria-label="Start guided tour"
            title="Guided tour"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
