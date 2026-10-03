// Hard financial safety rails. The engine routes every number it emits through
// these so a live demo can never show a negative payback, an incentive larger
// than the project, or savings larger than the utility bill.

export function finite(v: number, fallback = 0): number {
  return Number.isFinite(v) ? v : fallback
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(v, min)))
}

/** Never negative, never NaN. */
export function nonNeg(v: number): number {
  return Math.max(0, finite(v))
}

/** Incentive cannot exceed the gross cost it applies to. */
export function capIncentive(incentive: number, gross: number): number {
  return clamp(incentive, 0, nonNeg(gross))
}

/** Simple payback in years, or null when there are no savings (displayed as N/A). */
export function payback(netCost: number, annualSavings: number): number | null {
  const cost = nonNeg(netCost)
  const sav = nonNeg(annualSavings)
  if (sav <= 0.5) return null
  const p = cost / sav
  return Number.isFinite(p) && p >= 0 ? p : null
}
