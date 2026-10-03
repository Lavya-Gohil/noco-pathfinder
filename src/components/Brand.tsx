import { cx } from './ui'

export const PRODUCT = 'Asset IQ'
export const COMPANY = 'NOCO'
export const MAKER = 'Axion Dynamics'
export const TAGLINE = 'Every upgrade, in the right order.'

/** Stepped-building mark: a building whose roofline climbs in phases. Colored by the brand token. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx('shrink-0', className)} aria-hidden>
      <path
        d="M7 42V27H17V19H27V9H41V42Z"
        style={{ fill: 'var(--brand)', stroke: 'var(--brand)' }}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g fill="#fff" opacity="0.92">
        <rect x="10.5" y="31" width="3.5" height="3.5" rx="0.8" />
        <rect x="20.5" y="23" width="3.5" height="3.5" rx="0.8" />
        <rect x="20.5" y="31" width="3.5" height="3.5" rx="0.8" />
        <rect x="31" y="14" width="3.5" height="3.5" rx="0.8" />
        <rect x="31" y="22" width="3.5" height="3.5" rx="0.8" />
        <rect x="31" y="30" width="3.5" height="3.5" rx="0.8" />
      </g>
    </svg>
  )
}

/** Full lockup: mark · "NOCO | Asset IQ" · "BY AXION DYNAMICS". */
export function Logo({ className, compact, size = 'md' }: { className?: string; compact?: boolean; size?: 'sm' | 'md' }) {
  const sm = size === 'sm'
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <BrandMark className={sm ? 'h-7 w-7' : 'h-8 w-8'} />
      <span className={cx('grid leading-none', compact && 'hidden sm:grid')} style={{ fontFamily: 'var(--font-display)' }}>
        <span className={cx('flex items-center text-fg', sm ? 'gap-2 text-[14px]' : 'gap-2.5 text-[16px]')}>
          <span className="font-extrabold tracking-[0.03em]">{COMPANY}</span>
          <span className={cx('w-[1.5px] bg-fg/30', sm ? 'h-3.5' : 'h-4')} aria-hidden />
          <span className="font-semibold tracking-[-0.01em]">{PRODUCT}</span>
        </span>
        <span className={cx('mt-1 font-semibold uppercase tracking-[0.16em] text-fg-3', sm ? 'text-[8.5px]' : 'text-[9.5px]')}>
          By {MAKER}
        </span>
      </span>
    </div>
  )
}
