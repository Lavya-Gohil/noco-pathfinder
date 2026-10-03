import { Building, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePref } from '../theme'
import { cx } from './ui'

export type StepId = 'intake' | 'diagnosis' | 'strategy' | 'report'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'intake', label: 'Building' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'report', label: 'Report' },
]

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#16794A" />
        <path d="M9 22.5V9.5l14 13V9.5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[14px] tracking-[-0.01em] text-fg">
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
    <div role="radiogroup" aria-label="Color theme" className="flex items-center rounded-lg border border-line bg-surface-2 p-0.5">
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
              'grid h-7 w-7 place-items-center rounded-md transition-colors duration-150',
              on ? 'bg-surface-3 text-fg shadow-[0_1px_2px_rgba(16,24,40,0.12)]' : 'text-fg-3 hover:text-fg',
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
}: {
  step: StepId
  maxStep: number
  onNavigate: (s: StepId) => void
  buildingName?: string
}) {
  const current = STEPS.findIndex((s) => s.id === step)
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo className="shrink-0" />
        <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
        <nav aria-label="Assessment steps" className="flex min-w-0 flex-1 items-center self-stretch overflow-x-auto">
          <ol className="flex h-full items-stretch gap-1">
            {STEPS.map((s, i) => {
              const reachable = i <= maxStep
              const active = i === current
              return (
                <li key={s.id} className="flex">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => onNavigate(s.id)}
                    aria-current={active ? 'step' : undefined}
                    className={cx(
                      'relative flex items-center gap-1.5 px-2 text-[13px] transition-colors duration-150 sm:px-2.5',
                      active ? 'font-medium text-fg' : reachable ? 'text-fg-2 hover:text-fg' : 'cursor-not-allowed text-fg-3',
                    )}
                  >
                    <span className={cx('tnum text-[12px]', active ? 'text-brand-text' : 'text-fg-3')}>{i + 1}</span>
                    <span className={cx(!active && 'hidden sm:inline')}>{s.label}</span>
                    {active && <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
        {buildingName && (
          <div className="hidden max-w-[240px] items-center gap-1.5 text-[13px] text-fg-2 lg:flex" title={buildingName}>
            <Building className="h-4 w-4 shrink-0 text-fg-3" aria-hidden />
            <span className="truncate">{buildingName}</span>
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
