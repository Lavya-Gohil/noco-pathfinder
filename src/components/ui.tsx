import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import type { ConfidenceLevel } from '../types'

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

/** Raised surface for a group of related content. */
export function Panel({
  children,
  className,
  title,
  description,
  actions,
  bodyClassName,
  tour,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  bodyClassName?: string
  tour?: string
}) {
  return (
    <section data-tour={tour} className={cx('neu-raised rounded-2xl', className)}>
      {title && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-fg-2">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName ?? (title ? 'p-6' : '')}>{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  eyebrow,
}: {
  title: string
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[12px] font-medium text-brand-text">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-fg sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-fg-2">{description}</p>}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
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
          {i > 0 && (
            <span className="text-fg-3" aria-hidden>
              ·
            </span>
          )}
          <span className={i === 0 ? 'font-medium text-fg' : ''}>{t}</span>
        </span>
      ))}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('text-[11px] font-medium uppercase tracking-[0.07em] text-fg-2', className)}>{children}</div>
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
  tour,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
  ariaLabel?: string
  tour?: string
}) {
  const v = {
    primary: 'neu-btn-primary',
    secondary: 'neu-btn',
    ghost: 'text-fg-2 hover:text-fg transition-colors duration-150',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      data-tour={tour}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50',
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

/** Small recessed label. Used sparingly (e.g. "Recommended"). */
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'warn' }) {
  const t = { neutral: 'text-fg-2', brand: 'text-brand-text', warn: 'text-warn-text' }
  return (
    <span className={cx('neu-inset-sm inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', t[tone])}>
      {children}
    </span>
  )
}

/** Tween a number toward its new value (~250ms). Respects reduced motion. */
export function useTween(value: number, ms = 250): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = Number.isFinite(from.current) ? from.current : value
    let raf = 0
    if (!Number.isFinite(value) || reduce || start === value) {
      from.current = value
      raf = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(raf)
    }
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
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-fg-2">
          {label}
        </label>
        <span className="tnum text-[15px] font-semibold text-fg">{display}</span>
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
      <div className="mt-2 flex justify-between text-[11px] text-fg-3">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

/** Responsive grid of raised KPI tiles. */
export function KpiGrid({ children, className, tour }: { children: ReactNode; className?: string; tour?: string }) {
  return (
    <div data-tour={tour} className={cx('grid gap-5', className)}>
      {children}
    </div>
  )
}

export function KpiTile({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="neu-raised rounded-2xl px-5 py-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="tnum mt-2 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-fg">{value}</div>
      <div className="mt-1 text-[12px] text-fg-2">{sub}</div>
    </div>
  )
}
