import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Right-side drawer (full width on phones). Closes on Esc or backdrop click. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  // Keep the latest onClose without re-running the open/close effect on every render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault() // claim Esc so the guided tour doesn't also close
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    const prevFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open])

  if (!open) return null
  // Portal to <body> so transformed ancestors can't trap position: fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade-in absolute inset-0 bg-[rgba(13,17,23,0.45)]" onClick={onClose} />
      <div className="drawer-in absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-[var(--edge)] bg-[image:var(--raise-bg)] shadow-[var(--shadow-overlay)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-fg">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-fg-2">{subtitle}</div>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="neu-btn grid h-8 w-8 place-items-center rounded-lg text-fg-2 hover:text-fg"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Titled drawer section separated by a hairline. */
export function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-fg-2">{title}</h3>
      {children}
    </section>
  )
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-fg">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-fg-3" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}
