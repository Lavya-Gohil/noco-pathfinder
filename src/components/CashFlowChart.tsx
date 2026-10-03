import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Strategy } from '../engine/optimizer'
import { PATH_DASH, useChartPalette } from '../theme'
import type { PathId } from '../types'
import { money, moneyShort } from '../utils/format'
import { ChartTooltip } from './ChartTooltip'

const YEARS = 15

/** Cumulative net cash position: −net investment + annual savings × years (no escalation). */
export function CashFlowChart({ strategies, selected }: { strategies: Strategy[]; selected: PathId }) {
  const c = useChartPalette()
  const shown = strategies.filter((s) => s.plan && !s.sameAs)
  if (!shown.length) {
    return <div className="grid h-[240px] place-items-center text-[13px] text-fg-2">No path fits within this budget.</div>
  }
  const data = Array.from({ length: YEARS + 1 }, (_, year) => {
    const row: Record<string, number> = { year }
    for (const s of shown) row[s.id] = Math.round(-s.plan!.net + s.plan!.annualSavings * year)
    return row
  })
  const names = Object.fromEntries(shown.map((s) => [s.id, s.name]))
  return (
    <>
      <div
        className="h-[240px]"
        role="img"
        aria-label={`Line chart of cumulative net cash position over ${YEARS} years for ${shown.map((s) => s.name).join(', ')}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 84, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={{ stroke: c.grid }}
              tick={{ fill: c.axis, fontSize: 12 }}
              tickFormatter={(v) => (v === 0 ? 'Now' : `Yr ${v}`)}
              interval={2}
            />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={(v) => moneyShort(v)} />
            <ReferenceLine y={0} stroke={c.reference} strokeDasharray="3 3" />
            <Tooltip
              cursor={{ stroke: c.reference, strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  title={label === 0 ? 'Today' : `Year ${label}`}
                  rows={(payload ?? []).map((p) => ({
                    label: names[String(p.dataKey)] ?? String(p.dataKey),
                    value: money(Number(p.value)),
                    color: String(p.color),
                  }))}
                />
              )}
            />
            {shown.map((s) => (
              <Line
                key={s.id}
                type="linear"
                dataKey={s.id}
                name={s.name}
                stroke={c[s.id]}
                strokeWidth={s.id === selected ? 2.5 : 1.75}
                strokeDasharray={PATH_DASH[s.id]}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={s.id}
                  content={({ x, y, index }) =>
                    index === YEARS ? (
                      <text x={Number(x) + 8} y={Number(y)} dy={4} fill={c.label} fontSize={12}>
                        {s.name}
                      </text>
                    ) : null
                  }
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-fg-2">
        {shown.map((s) => (
          <span key={s.id} className="flex items-center gap-2">
            <svg width="20" height="6" aria-hidden>
              <line x1="0" y1="3" x2="20" y2="3" stroke={c[s.id]} strokeWidth="2" strokeDasharray={PATH_DASH[s.id]} />
            </svg>
            {s.name}
          </span>
        ))}
        <span className="flex items-center gap-2 text-fg-3">
          <svg width="20" height="6" aria-hidden>
            <line x1="0" y1="3" x2="20" y2="3" stroke={c.reference} strokeWidth="1" strokeDasharray="3 3" />
          </svg>
          Break-even
        </span>
      </div>
    </>
  )
}
