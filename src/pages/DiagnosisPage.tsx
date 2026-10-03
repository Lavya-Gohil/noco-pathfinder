import type { ReactNode } from 'react'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Baseline } from '../engine/baseline'
import type { DataConfidence } from '../engine/confidence'
import type { Signal } from '../engine/explanations'
import { useChartPalette } from '../theme'
import { Button, EstimateNote, Eyebrow, KpiStrip, MetaRow, PageHeader, Panel, cx } from '../components/ui'
import { ChartTooltip } from '../components/ChartTooltip'
import { money, moneyCents, moneyShort, num, pct } from '../utils/format'

function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="bg-surface px-5 py-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="tnum mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-fg">{value}</div>
      <div className="mt-1 text-[12px] text-fg-2">{sub}</div>
    </div>
  )
}

export function DiagnosisPage({
  base,
  confidence,
  opportunity,
  signals,
  onNext,
}: {
  base: Baseline
  confidence: DataConfidence
  opportunity: { label: string; detail: string }
  signals: Signal[]
  onNext: () => void
}) {
  const b = base.building
  const c = useChartPalette()
  const data = [...base.endUses]
    .sort((x, y) => y.cost - x.cost)
    .map((e) => ({ ...e, label: `${moneyShort(e.cost)} · ${pct(e.share)}` }))
  const next = confidence.next

  return (
    <div>
      <PageHeader
        title="Building energy profile"
        meta={
          <MetaRow
            items={[
              b.name,
              b.type,
              `${num(b.sqft)} sq ft`,
              b.yearBuilt ? `Built ${b.yearBuilt}` : 'Year built unknown',
              `${b.city}, ${b.state}`,
            ]}
          />
        }
        actions={<EstimateNote>Preliminary estimate · site verification required</EstimateNote>}
      />

      <KpiStrip className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Annual energy spend" value={money(base.totalSpend)} sub={`${money(base.elecCost)} electric · ${money(base.heatCost)} heating`} />
        <Kpi label="Energy cost / sq ft" value={moneyCents(base.costPerSqft)} sub="Per square foot, per year" />
        <Kpi
          label="Electricity use"
          value={`${num(base.elecKwh)} kWh`}
          sub={base.kwhEstimated ? `Estimated at $${base.elecPriceBase.toFixed(2)}/kWh` : `Reported · $${base.elecPriceBase.toFixed(3)}/kWh effective`}
        />
        <Kpi label="Data confidence" value={`${confidence.score}%`} sub={<span className="font-medium text-fg">{confidence.level}</span>} />
      </KpiStrip>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Energy use breakdown" description="Estimated share of annual energy spend by end use">
          <div
            className="h-[300px]"
            role="img"
            aria-label={`Bar chart of estimated annual energy spend by end use: ${data.map((d) => `${d.name} ${d.label}`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={12}>
                <CartesianGrid horizontal={false} stroke={c.grid} />
                <XAxis type="number" hide domain={[0, (max: number) => max * 1.45]} />
                <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} tick={{ fill: c.label, fontSize: 13 }} />
                <Tooltip
                  cursor={{ fill: c.grid, opacity: 0.6 }}
                  content={({ active, payload }) => {
                    const d = payload?.[0]?.payload as { name: string; cost: number; share: number } | undefined
                    return (
                      <ChartTooltip
                        active={active}
                        title={d?.name}
                        rows={d ? [{ label: 'Annual spend', value: money(d.cost) }, { label: 'Share', value: pct(d.share) }] : []}
                      />
                    )
                  }}
                />
                <Bar dataKey="cost" fill={c.bar} radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false}>
                  <LabelList dataKey="label" position="right" style={{ fill: c.label, fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-4 text-[13px] text-fg-2">
            <span>
              Retrofit opportunity: <span className="font-medium text-fg">{opportunity.label}</span>
            </span>
            <span>{opportunity.detail} with all five measures</span>
          </div>
        </Panel>

        <Panel title="Data confidence" description="How reliable today's estimate is">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[12px] text-fg-2">Current confidence</div>
              <div className="tnum text-[28px] font-semibold leading-tight text-fg">{confidence.score}%</div>
            </div>
            <span className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-info-text">{confidence.level}</span>
          </div>
          <div className="relative mt-3 h-1.5 rounded-full bg-surface-2" aria-hidden>
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[color-mix(in_srgb,var(--brand)_28%,transparent)]"
              style={{ width: `${next.scoreAfter}%` }}
            />
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${confidence.score}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-fg-3">
            <span>Today</span>
            <span>Potential {next.scoreAfter}%</span>
          </div>

          <dl className="mt-5 space-y-3 border-t border-line pt-4 text-[13px]">
            <div>
              <dt className="text-fg-2">Missing</dt>
              <dd className="mt-0.5 font-medium text-fg">{next.label}</dd>
              <dd className="mt-0.5 text-[12px] leading-relaxed text-fg-2">{next.why}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-fg-2">Potential confidence</dt>
              <dd className="tnum font-medium text-fg">
                {confidence.score}% <span className="text-fg-3">→</span> <span className="text-brand-text">{next.scoreAfter}%</span>
              </dd>
            </div>
          </dl>

          <ul className="mt-4 grid grid-cols-1 gap-1 border-t border-line pt-4 text-[12px] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {confidence.factors.map((f) => (
              <li key={f.label} className={cx('flex items-center gap-1.5', f.have ? 'text-fg-2' : 'text-fg-3')}>
                {f.have ? <Check className="h-3.5 w-3.5 text-brand-text" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                <span>
                  {f.label}
                  <span className="sr-only">{f.have ? ' — provided' : ' — missing'}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6" title="Preliminary signals" description="Derived from building characteristics. Not yet verified on site." bodyClassName="p-0">
        {signals.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-fg-2">No strong signals from the information provided.</p>
        ) : (
          <ul className="divide-y divide-line">
            {signals.map((s) => (
              <li key={s.kind} className="grid gap-1 px-5 py-3.5 md:grid-cols-[190px_minmax(0,1fr)_minmax(0,auto)] md:items-baseline md:gap-6">
                <span className="text-[13px] font-medium text-fg">{s.title}</span>
                <span className="text-[13px] leading-relaxed text-fg-2">{s.text}</span>
                <span className="tnum text-[12px] text-fg-3 md:text-right">{s.metric}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-fg-2">Based on building characteristics and preliminary assumptions. Site verification required.</p>
        <Button onClick={onNext}>
          Build my retrofit strategy <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
