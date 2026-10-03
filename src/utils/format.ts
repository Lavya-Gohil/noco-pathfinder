// Display helpers. Every formatter guards against NaN / Infinity / undefined so
// the UI can never render "NaN" or "undefined" in front of a customer.

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function money(v: number | null | undefined): string {
  return isNum(v) ? usd0.format(Math.round(v)) : 'N/A'
}

export function moneyCents(v: number | null | undefined): string {
  return isNum(v) ? usd2.format(v) : 'N/A'
}

/** $1.2M / $250K style for tight spaces. */
export function moneyShort(v: number | null | undefined): string {
  if (!isNum(v)) return 'N/A'
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, '')}M`
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`
  return `${sign}$${Math.round(a)}`
}

export function num(v: number | null | undefined, suffix = ''): string {
  return isNum(v) ? `${int.format(Math.round(v))}${suffix}` : 'N/A'
}

export function pct(v: number | null | undefined, digits = 0): string {
  return isNum(v) ? `${(v * 100).toFixed(digits)}%` : 'N/A'
}

export function signedPct(v: number | null | undefined): string {
  if (!isNum(v)) return 'N/A'
  const p = Math.round(v * 100)
  return `${p > 0 ? '+' : ''}${p}%`
}

/** Payback in years; null / non-finite / no savings → "N/A". */
export function years(v: number | null | undefined): string {
  if (!isNum(v) || v <= 0) return 'N/A'
  return `${v.toFixed(1)} yrs`
}

export function tons(v: number | null | undefined): string {
  return isNum(v) ? `${int.format(Math.round(v))} t CO₂e` : 'N/A'
}
