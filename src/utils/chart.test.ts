import { describe, expect, it } from 'vitest'
import { labelOffsets } from './chart'

describe('labelOffsets', () => {
  it('leaves well separated labels alone', () => {
    expect(labelOffsets({ a: 100, b: 0 }, 1)).toEqual({ a: 0, b: 0 })
  })

  it('pushes the lower of two close labels down by the gap', () => {
    expect(labelOffsets({ a: 100, b: 99 }, 1)).toEqual({ a: 0, b: 14 })
  })

  it('keeps every label apart when several are close', () => {
    const finals = { a: 100, b: 99, c: 98 }
    const off = labelOffsets(finals, 1)
    const ys = Object.entries(finals).map(([k, v]) => -v + off[k]).sort((x, y) => x - y)
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(15)
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(15)
  })
})
