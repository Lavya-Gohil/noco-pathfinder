import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, MousePointerClick, X } from 'lucide-react'
import { CHAPTERS, type TourApi, type TourState, type TourStep } from '../tour/steps'
import { Button, cx } from './ui'

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

/**
 * Interactive walkthrough. Info steps advance on "Next"; task steps advance when
 * the user does the thing (state change, click or input inside the target).
 * Page navigation for each step is handled by the parent.
 */
export function Tour({
  steps,
  index,
  state,
  api,
  onNext,
  onClose,
  onStartOwn,
}: {
  steps: TourStep[]
  index: number
  state: TourState
  api: TourApi
  onNext: () => void
  onClose: () => void
  onStartOwn: () => void
}) {
  const step = steps[index]
  const [rect, setRect] = useState<Rect | null>(null)
  const [pop, setPop] = useState<{ top: number; left: number; width: number } | null>(null)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)
  const elRef = useRef<HTMLElement | null>(null)
  const advanced = useRef(false)
  const nextRef = useRef(onNext)
  useEffect(() => {
    nextRef.current = onNext
  })

  const chapterSteps = steps.filter((s) => s.chapter === step.chapter)
  const posInChapter = chapterSteps.indexOf(step) + 1
  const isTask = Boolean(step.task)

  /** Advance once, after a short beat so the user sees the result of their action. */
  const complete = (delay = 550) => {
    if (advanced.current) return
    advanced.current = true
    setDone(true)
    window.setTimeout(() => nextRef.current(), delay)
  }

  useEffect(() => {
    advanced.current = false
    setDone(false)
  }, [index])

  // Task completion by app state.
  useEffect(() => {
    if (step.until && step.until(state)) complete()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, index])

  // Locate the target (it may render a frame or two after navigation), scroll it into view,
  // and listen for task interactions inside it.
  useEffect(() => {
    let raf = 0
    let tries = 0
    let cleanup = () => {}
    elRef.current = null
    setRect(null)
    const seek = () => {
      const el = findTarget(step)
      if (el) {
        elRef.current = el
        const tall = el.offsetHeight > window.innerHeight * 0.55 || window.innerWidth < 640
        el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' })
        if (step.advanceOn) {
          let t = 0
          const on = () => {
            window.clearTimeout(t)
            // For sliders, wait until the user pauses so they can watch the paths change.
            t = window.setTimeout(() => complete(0), step.advanceOn === 'input' ? 1100 : 450)
          }
          el.addEventListener(step.advanceOn, on, true)
          cleanup = () => {
            window.clearTimeout(t)
            el.removeEventListener(step.advanceOn!, on, true)
          }
        }
        return
      }
      if (++tries < 90) raf = requestAnimationFrame(seek)
    }
    raf = requestAnimationFrame(seek)
    return () => {
      cancelAnimationFrame(raf)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Track the target every frame (scrolling, resizing, layout changes) and pause while a panel is open.
  useEffect(() => {
    let raf = 0
    let prev = ''
    let wasPaused = false
    const tick = () => {
      const isPaused = step.waitWhile ? Boolean(document.querySelector(step.waitWhile)) : false
      if (isPaused !== wasPaused) {
        wasPaused = isPaused
        setPaused(isPaused)
        if (!isPaused) elRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
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

  // Measure the popover's real height so placement never guesses.
  const [popH, setPopH] = useState(240)
  useEffect(() => {
    const el = popRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setPopH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
    // The popover unmounts while paused, so re-attach to the new element when it comes back.
  }, [paused])

  // Place the popover so it never covers the spotlight: below, above, beside, then a free corner.
  useLayoutEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const m = 12
    const width = Math.min(380, vw - 24)
    const h = popRef.current?.offsetHeight || popH
    const r = rect
    const fits = (top: number, left: number, w: number) =>
      top >= m && left >= m && top + h <= vh - m && left + w <= vw - m &&
      (!r || top + h <= r.top - 4 || top >= r.top + r.height + 4 || left + w <= r.left - 4 || left >= r.left + r.width + 4)
    const candidates: { top: number; left: number; width: number }[] = []
    if (r) {
      const centered = Math.min(vw - width - m, Math.max(m, r.left + r.width / 2 - width / 2))
      candidates.push({ top: r.top + r.height + GAP, left: centered, width })
      candidates.push({ top: r.top - GAP - h, left: centered, width })
      const sideTop = Math.min(vh - h - m, Math.max(m, r.top))
      const right = vw - (r.left + r.width) - GAP - m
      const left = r.left - GAP - m
      // Constant width: shrinking would change the height and make placement oscillate.
      if (right >= width) candidates.push({ top: sideTop, left: r.left + r.width + GAP, width })
      if (left >= width) candidates.push({ top: sideTop, left: r.left - GAP - width, width })
    }
    // Sheets / corners as fallbacks (phones always end up here).
    candidates.push({ top: vh - h - m, left: (vw - width) / 2, width })
    candidates.push({ top: m + 64, left: (vw - width) / 2, width })
    candidates.push({ top: vh - h - m, left: vw - width - m, width })
    const pick = vw < 640 ? candidates.slice(-3).find((c) => fits(c.top, c.left, c.width)) : candidates.find((c) => fits(c.top, c.left, c.width))
    setPop(pick ?? candidates[candidates.length - 3])
  }, [rect, index, done, popH])

  // Keyboard: → for info steps, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) onClose()
      else if (e.key === 'ArrowRight' && !isTask && !step.final) onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isTask, step, onNext, onClose])

  useEffect(() => {
    popRef.current?.focus({ preventScroll: true })
  }, [index])

  const doIt = () => {
    if (step.perform) step.perform(api)
    else elRef.current?.click()
    if (!step.until) complete(900)
  }

  if (paused) return null

  return createPortal(
    <div className="print:hidden">
      {/* Dim everything except the spotlight. The page stays interactive. */}
      {rect ? (
        <div
          aria-hidden
          className={cx(
            'pointer-events-none fixed z-[60] rounded-2xl ring-2 transition-[top,left,width,height] duration-200 ease-out',
            isTask ? 'ring-[var(--brand-text)] ring-offset-2 ring-offset-transparent' : 'ring-[var(--brand-text)]',
          )}
          style={{ ...rect, boxShadow: `0 0 0 9999px rgba(10, 14, 20, ${isTask ? 0.38 : 0.5})` }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] bg-[rgba(10,14,20,0.45)]" />
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
          <div className="min-w-0">
            <div className="tnum text-[12px] font-medium text-brand-text">
              Chapter {step.chapter + 1} of {CHAPTERS.length} · {CHAPTERS[step.chapter]}
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

        {isTask && (
          <div
            className={cx(
              'neu-inset mt-3 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] transition-colors duration-200',
              done ? 'text-brand-text' : 'text-fg',
            )}
            aria-live="polite"
          >
            <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-brand-text" aria-hidden />
            <span>
              <span className="font-semibold">{done ? 'Nice. ' : 'Your turn: '}</span>
              {step.task}
            </span>
          </div>
        )}

        {/* Progress within the chapter */}
        <div className="mt-4 flex items-center gap-1.5" aria-label={`Step ${posInChapter} of ${chapterSteps.length} in this chapter`}>
          {chapterSteps.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cx(
                'h-1.5 flex-1 rounded-full transition-colors duration-200',
                i < posInChapter - 1 || (i === posInChapter - 1 && done) ? 'bg-brand' : i === posInChapter - 1 ? 'bg-[color-mix(in_srgb,var(--brand)_45%,transparent)]' : 'neu-inset-sm',
              )}
            />
          ))}
        </div>

        {step.final ? (
          <div className="mt-4 space-y-3">
            <Button onClick={onStartOwn} className="w-full">
              Start my own assessment <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <div className="text-center">
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
            {isTask ? (
              <button type="button" onClick={doIt} disabled={done} className="text-[13px] font-medium text-brand-text hover:underline disabled:opacity-50">
                Do it for me
              </button>
            ) : (
              <Button size="sm" onClick={onNext}>
                Next <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
