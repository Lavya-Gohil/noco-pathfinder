import { describe, expect, it } from 'vitest'
import { ARROW_SIZE, placeArrow, type Box } from './arrow'

const control: Box = { top: 300, left: 500, width: 120, height: 40 }
const overlaps = (p: { top: number; left: number }, b: Box) =>
  p.left < b.left + b.width && b.left < p.left + ARROW_SIZE && p.top < b.top + b.height && b.top < p.top + ARROW_SIZE

describe('placeArrow', () => {
  it('sits above the control and centred on it by default', () => {
    const p = placeArrow(control, null, 1280, 800)!
    expect(p.side).toBe('top')
    expect(p.top + ARROW_SIZE).toBeLessThanOrEqual(control.top)
    expect(p.left + ARROW_SIZE / 2).toBe(control.left + control.width / 2)
  })

  it('uses the preferred side when there is room', () => {
    expect(placeArrow(control, null, 1280, 800, 'left')!.side).toBe('left')
  })

  it('moves aside rather than sit under the popover', () => {
    const popover: Box = { top: 60, left: 400, width: 380, height: 232 }
    const p = placeArrow(control, popover, 1280, 800)!
    expect(p.side).toBe('bottom')
    expect(overlaps(p, popover)).toBe(false)
  })

  it('stays on screen for a control at the edge', () => {
    const p = placeArrow({ top: 2, left: 2, width: 60, height: 40 }, null, 390, 800)!
    expect(p.side).toBe('bottom')
    expect(p.left).toBeGreaterThanOrEqual(6)
  })

  it('draws nothing while the control is off screen', () => {
    expect(placeArrow({ ...control, top: 900 }, null, 1280, 800)).toBeNull()
  })
})
