import { Building, CircleHelp, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePref } from '../theme'
import { Logo } from './Brand'
import { cx } from './ui'

export type StepId = 'intake' | 'diagnosis' | 'strategy' | 'report'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'intake', label: 'Building' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'report', label: 'Report' },
]

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
  onHome,
  inApp,
}: {
  step: StepId
  maxStep: number
  onNavigate: (s: StepId) => void
  buildingName?: string
  onTour: () => void
  onHome: () => void
  inApp: boolean
}) {
  const current = STEPS.findIndex((s) => s.id === step)
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md print:hidden">
      <div className="mx-auto max-w-[1320px] px-4 pt-3 sm:px-6 lg:px-8">
        <div className="neu-raised flex h-14 items-center gap-3 rounded-2xl px-3 sm:gap-4 sm:px-4">
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault()
              onHome()
            }}
            data-tour="brand-home"
            className="shrink-0 rounded-xl"
            aria-label="NOCO Asset IQ: back to building assessment"
            title="Back to building assessment"
          >
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
            aria-label="Help: guided tour for this page"
            title="Guided tour for this page"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
