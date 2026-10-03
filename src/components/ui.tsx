import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import type { ConfidenceLevel } from '../types'

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

/** Bordered surface. Used for groups of related content, not for every block. */
export function Panel({
  children,
  className,
  title,
  description,
  actions,
  bodyClassName,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  bodyClassName?: string
}) {
  return (
    <section className={cx('rounded-[10px] border border-line bg-surface', className)}>
      {title && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-fg-2">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName ?? (title ? 'p-5' : '')}>{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-fg sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-fg-2">{description}</p>}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Inline "a · b · c" metadata row. */
export function MetaRow({ items }: { items: (string | null | false)[] }) {
  const list = items.filter(Boolean) as string[]
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-2">
      {list.map((t, i) => (
        <span key={t} className="flex items-center gap-2">
          {i > 0 && <span className="text-fg-3" aria-hidden>·</span>}
          <span className={i === 0 ? 'font-medium text-fg' : ''}>{t}</span>
        </span>
      ))}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('text-[11px] font-medium uppercase tracking-[0.06em] text-fg-2', className)}>{children}</div>
  )
}

export function EstimateNote({ children = 'Preliminary estimate', className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[12px] text-fg-2', className)}>
      <Info className="h-3.5 w-3.5 text-fg-3" aria-hidden />
      {children}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  disabled,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  const v = {
    primary: 'bg-brand text-brand-fg hover:bg-brand-hover shadow-[0_1px_2px_rgba(16,24,40,0.08)]',
    secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-2',
    ghost: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-10 px-4 text-[14px]' : 'h-8 px-3 text-[13px]',
        v[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

const CONF_DOT: Record<ConfidenceLevel, string> = { High: 'bg-pos', Medium: 'bg-info', Low: 'bg-warn' }

export function ConfidenceText({ level }: { level: ConfidenceLevel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-2">
      <span className={cx('h-1.5 w-1.5 rounded-full', CONF_DOT[level])} aria-hidden />
      {level}
    </span>
  )
}

/** Small, quiet label. Used sparingly (e.g. "Recommended"). */
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'warn' }) {
  const t = {
    neutral: 'bg-surface-2 text-fg-2',
    brand: 'bg-brand-soft text-brand-text',
    warn: 'bg-warn-soft text-warn-text',
  }
  return (
    <span className={cx('inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap', t[tone])}>
      {children}
    </span>
  )
}

/** Tween a number toward its new value (~250ms). Respects reduced motion. */
export function useTween(value: number, ms = 250): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (!Number.isFinite(value)) {
      setShown(value)
      return
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = Number.isFinite(from.current) ? from.current : value
    if (reduce || start === value) {
      from.current = value
      setShown(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const v = start + (value - start) * e
      from.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

export function AnimatedNumber({ value, format }: { value: number | null; format: (v: number | null) => string }) {
  const v = useTween(value ?? NaN)
  return <span className="tnum">{format(value === null ? null : v)}</span>
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  minLabel,
  maxLabel,
  id,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: ReactNode
  minLabel: string
  maxLabel: string
  id: string
}) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-fg-2">
          {label}
        </label>
        <span className="tnum text-[14px] font-medium text-fg">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="mt-1.5 flex justify-between text-[11px] text-fg-3">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

/** Grid whose 1px gaps render as dividers in any responsive arrangement. */
export function KpiStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('grid gap-px overflow-hidden rounded-[10px] border border-line bg-line', className)}>{children}</div>
  )
}
