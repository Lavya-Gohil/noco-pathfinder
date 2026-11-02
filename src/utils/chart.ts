/**
 * Vertical pixel shift for each line's end label so close values don't overlap.
 * `scale` converts value units to pixels, and `gap` is the minimum spacing in pixels.
 */
export function labelOffsets(finals: Record<string, number>, scale: number, gap = 15): Record<string, number> {
  const out: Record<string, number> = {}
  const sorted = Object.entries(finals).sort((a, b) => b[1] - a[1])
  let prev = -Infinity
  for (const [id, value] of sorted) {
    const y = -value * scale
    const placed = Math.max(y, prev + gap)
    out[id] = placed - y
    prev = placed
  }
  return out
}
