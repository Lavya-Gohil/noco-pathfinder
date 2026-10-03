import type { ReactNode } from 'react'

export interface TooltipRow {
  label: string
  value: string
  color?: string
}

/** Theme-aware tooltip body shared by all charts. */
export function ChartTooltip({ active, title, rows }: { active?: boolean; title?: ReactNode; rows: TooltipRow[] }) {
  if (!active || rows.length === 0) return null
  return (
    <div className="min-w-[160px] rounded-lg border border-line bg-surface-3 px-3 py-2 text-[12px] shadow-[var(--shadow-overlay)]">
      {title !== undefined && <div className="mb-1 font-medium text-fg">{title}</div>}
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-fg-2">
              {r.color && <span className="h-0.5 w-3 rounded-full" style={{ background: r.color }} aria-hidden />}
              {r.label}
            </span>
            <span className="tnum font-medium text-fg">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
