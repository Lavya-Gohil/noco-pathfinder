import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { TourStep } from '../tour/steps'
import { Button } from './ui'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8
const GAP = 14

function findTarget(step: TourStep): HTMLElement | null {
  for (const key of [step.target, step.fallback]) {
    if (!key) continue
    const el = document.querySelector<HTMLElement>(`[data-tour="${key}"]`)
    if (el && el.getClientRects().length > 0 && el.offsetWidth > 0) return el
  }
  return null
}

/** Spotlight + popover walkthrough. Navigation between pages is handled by the parent. */
export function Tour({
  steps,
  index,
  onNext,
  onBack,
  onClose,
  onStartOwn,
}: {
  steps: TourStep[]
  index: number
  onNext: () => void
  onBack: () => void
  onClose: () => void
  /** Final-step call to action: leave the demo and start a real assessment. */
  onStartOwn: () => void
}) {
  const step = steps[index]
  const [rect, setRect] = useState<Rect | null>(null)
  const [pop, setPop] = useState<{ top: number; left: number; width: number } | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const elRef = useRef<HTMLElement | null>(null)
  const isLast = index === steps.length - 1

  // Locate the target (it may render a frame or two after navigation), then scroll it into view.
  useEffect(() => {
    let raf = 0
    let tries = 0
    elRef.current = null
    setRect(null)
    const seek = () => {
      const el = findTarget(step)
      if (el) {
        elRef.current = el
        // On phones the popover is a bottom sheet, so keep the target near the top.
        const tall = el.offsetHeight > window.innerHeight * 0.55 || window.innerWidth < 640
        el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' })
        return
      }
      if (++tries < 90) raf = requestAnimationFrame(seek)
    }
    raf = requestAnimationFrame(seek)
    return () => cancelAnimationFrame(raf)
  }, [step])

  // Track the target's position every frame while the tour is open (scrolling, resizing, layout changes).
  useEffect(() => {
    let raf = 0
    let prev = ''
    const tick = () => {
      const el = elRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        const key = `${r.top}|${r.left}|${r.width}|${r.height}`
        if (key !== prev) {
          prev = key
          setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step])

  // Place the popover next to the spotlight, or as a bottom sheet on small screens.
  useLayoutEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(380, vw - 32)
    const h = popRef.current?.offsetHeight ?? 220
    if (!rect || vw < 640) {
      setPop({ top: vh - h - 16, left: (vw - width) / 2, width })
      return
    }
    const below = rect.top + rect.height + GAP
    const above = rect.top - GAP - h
    const centered = Math.min(vw - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2))
    const sideTop = Math.min(vh - h - 16, Math.max(16, rect.top))
    const right = vw - (rect.left + rect.width) - GAP - 16
    const left = rect.left - GAP - 16
    if (below + h <= vh - 16) setPop({ top: below, left: centered, width })
    else if (above >= 16) setPop({ top: above, left: centered, width })
    // Tall targets: sit beside them rather than on top of them.
    else if (right >= 300) setPop({ top: sideTop, left: rect.left + rect.width + GAP, width: Math.min(width, right) })
    else if (left >= 300) {
      const w = Math.min(width, left)
      setPop({ top: sideTop, left: rect.left - GAP - w, width: w })
    } else setPop({ top: vh - h - 16, left: vw - width - 16, width })
  }, [rect, index])

  // Keyboard: ← / → to move, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && !isLast) onNext()
      else if (e.key === 'ArrowLeft' && index > 0) onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, isLast, onNext, onBack, onClose])

  useEffect(() => {
    popRef.current?.focus({ preventScroll: true })
  }, [index])

  return createPortal(
    <div className="print:hidden">
      {/* Dim everything except the spotlight. The page stays interactive. */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-2xl ring-2 ring-[var(--brand-text)] transition-[top,left,width,height] duration-200 ease-out"
          style={{ ...rect, boxShadow: '0 0 0 9999px rgba(10, 14, 20, 0.5)' }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] bg-[rgba(10,14,20,0.5)]" />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="neu-raised fixed z-[61] rounded-2xl p-5 outline-none transition-[top,left] duration-200 ease-out"
        style={pop ? { top: pop.top, left: pop.left, width: pop.width } : { visibility: 'hidden' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="tnum text-[12px] font-medium text-brand-text">
              Guided tour · {index + 1} of {steps.length}
            </div>
            <h2 id="tour-title" className="mt-1 text-[16px] font-semibold text-fg">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neu-btn grid h-8 w-8 shrink-0 place-items-center rounded-lg text-fg-2 hover:text-fg"
            aria-label="End tour"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p id="tour-body" className="mt-2 text-[13px] leading-relaxed text-fg-2">
          {step.body}
        </p>

        <div className="neu-inset-sm mt-4 h-1.5 rounded-full p-px" aria-hidden>
          <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        {isLast ? (
          <div className="mt-4 space-y-3">
            <Button onClick={onStartOwn} className="w-full">
              Start my own assessment <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <div className="flex items-center justify-between gap-2">
              <Button variant="secondary" size="sm" onClick={onBack} ariaLabel="Previous step">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <button type="button" onClick={onClose} className="text-[13px] text-fg-2 hover:text-fg">
                Keep exploring the demo
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="text-[13px] text-fg-2 hover:text-fg">
              Skip tour
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="secondary" size="sm" onClick={onBack} ariaLabel="Previous step">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
              <Button size="sm" onClick={onNext}>
                Next <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
