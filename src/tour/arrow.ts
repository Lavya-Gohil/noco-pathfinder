export interface Box {
  top: number
  left: number
  width: number
  height: number
}

export type ArrowSide = 'top' | 'bottom' | 'left' | 'right'

export interface ArrowPlacement {
  top: number
  left: number
  /** Which side of the control the arrow sits on. It points back at the control. */
  side: ArrowSide
}

export const ARROW_SIZE = 44
const ARROW_GAP = 6
const EDGE = 6

const overlaps = (a: Box, b: Box) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height

/**
 * Where to draw the arrow for a control: on the preferred side when it fits on screen and
 * clear of the tour's popover, otherwise on the next side that does. Null while the control
 * is off screen, since an arrow there would point at nothing.
 */
export function placeArrow(control: Box, popover: Box | null, vw: number, vh: number, prefer?: ArrowSide): ArrowPlacement | null {
  if (control.top + control.height <= 0 || control.top >= vh || control.left + control.width <= 0 || control.left >= vw) return null
  const centerX = control.left + control.width / 2 - ARROW_SIZE / 2
  const centerY = control.top + control.height / 2 - ARROW_SIZE / 2
  const spots: Record<ArrowSide, ArrowPlacement> = {
    top: { side: 'top', top: control.top - ARROW_GAP - ARROW_SIZE, left: centerX },
    bottom: { side: 'bottom', top: control.top + control.height + ARROW_GAP, left: centerX },
    left: { side: 'left', top: centerY, left: control.left - ARROW_GAP - ARROW_SIZE },
    right: { side: 'right', top: centerY, left: control.left + control.width + ARROW_GAP },
  }
  const order: ArrowSide[] = ['top', 'bottom', 'left', 'right']
  if (prefer) order.sort((a, b) => Number(b === prefer) - Number(a === prefer))
  const fits = ({ top, left }: ArrowPlacement) =>
    top >= EDGE &&
    left >= EDGE &&
    top + ARROW_SIZE <= vh - EDGE &&
    left + ARROW_SIZE <= vw - EDGE &&
    !(popover && overlaps({ top, left, width: ARROW_SIZE, height: ARROW_SIZE }, popover))
  return order.map((side) => spots[side]).find(fits) ?? null
}

/** The part of a control to aim at. For a slider that is the thumb, not the middle of the track. */
export function aimBox(el: HTMLElement): Box {
  const r = el.getBoundingClientRect()
  if (el instanceof HTMLInputElement && el.type === 'range') {
    const min = Number(el.min)
    const span = Number(el.max) - min
    const share = span > 0 ? (Number(el.value) - min) / span : 0
    return { top: r.top, left: r.left + share * r.width - 10, width: 20, height: r.height }
  }
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}
