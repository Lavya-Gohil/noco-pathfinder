import { ArrowRight, Check, Minus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Baseline } from '../engine/baseline'
import type { DataConfidence, DataField } from '../engine/confidence'
import type { Signal } from '../engine/explanations'
import { useChartPalette } from '../theme'
import { Button, EstimateNote, KpiGrid, KpiTile, MetaRow, PageHeader, Panel, cx } from '../components/ui'
import { ChartTooltip } from '../components/ChartTooltip'
import { StageFooter, StageNav } from '../components/Stages'
import { money, moneyCents, moneyShort, num, pct } from '../utils/format'

export const DIAGNOSIS_STAGES = [{ title: 'Energy profile' }, { title: 'Data confidence' }, { title: 'Signals' }]

export function DiagnosisPage({
  base,
  confidence,
  opportunity,
  signals,
  onNext,
  onBack,
  sub,
  setSub,
  onImprove,
}: {
  base: Baseline
  confidence: DataConfidence
  opportunity: { label: string; detail: string }
  signals: Signal[]
  onNext: () => void
  onBack: () => void
  sub: number
  setSub: (i: number) => void
  /** Jump to the intake field that supplies a missing data point. */
  onImprove: (field: DataField) => void
}) {
  const b = base.building
  const c = useChartPalette()
  const data = [...base.endUses]
    .sort((x, y) => y.cost - x.cost)
    .map((e) => ({ ...e, label: `${moneyShort(e.cost)} · ${pct(e.share)}` }))
  const next = confidence.next
  const last = DIAGNOSIS_STAGES.length - 1
  const go = (i: number) => {
    setSub(i)
    window.scrollTo({ top: 0 })
  }

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

      <StageNav label="Diagnosis stages" stages={DIAGNOSIS_STAGES} current={sub} onSelect={go} tour="diag-stages" />

      <div key={sub} className="stage-in">
        {sub === 0 && (
          <>
            <KpiGrid tour="diag-kpis" className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <KpiTile label="Annual energy spend" value={money(base.totalSpend)} sub={`${money(base.elecCost)} electric · ${money(base.heatCost)} heating`} />
              <KpiTile label="Energy cost / sq ft" value={moneyCents(base.costPerSqft)} sub="Per square foot, per year" />
              <KpiTile
                label="Electricity use"
                value={`${num(base.elecKwh)} kWh`}
                sub={
                  base.kwhEstimated
                    ? `Estimated at $${base.elecPriceBase.toFixed(2)}/kWh`
                    : base.coolingMeasured
                      ? `12 months of bills · $${base.elecPriceBase.toFixed(3)}/kWh`
                      : `Reported · $${base.elecPriceBase.toFixed(3)}/kWh effective`
                }
              />
              <KpiTile label="Retrofit opportunity" value={opportunity.label} sub={`${opportunity.detail} with all five measures`} />
            </KpiGrid>

            <Panel className="mt-6" tour="diag-breakdown" title="Energy use breakdown" description="Estimated share of annual energy spend by end use">
              <div
                className="h-[290px]"
                role="img"
                aria-label={`Bar chart of estimated annual energy spend by end use: ${data.map((d) => `${d.name} ${d.label}`).join(', ')}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={14}>
                    <CartesianGrid horizontal={false} stroke={c.grid} />
                    <XAxis type="number" hide domain={[0, (max: number) => max * 1.55]} />
                    <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} tick={{ fill: c.label, fontSize: 13 }} />
                    <Tooltip
                      cursor={{ fill: c.grid, opacity: 0.5 }}
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
                    <Bar dataKey="cost" fill={c.bar} radius={[0, 6, 6, 0]} maxBarSize={24} isAnimationActive={false}>
                      <LabelList dataKey="label" position="right" style={{ fill: c.label, fontSize: 12 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </>
        )}

        {sub === 1 && (
          <Panel tour="diag-confidence" title="Data confidence" description="How reliable today's estimate is, and what would improve it">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-fg-2">Current confidence</div>
                    <div className="tnum text-[40px] font-semibold leading-tight tracking-[-0.02em] text-fg">{confidence.score}%</div>
                  </div>
                  <span className="neu-inset-sm mb-2 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-info-text">
                    {confidence.level}
                  </span>
                </div>
                <div className="neu-inset-sm relative mt-4 h-3 rounded-full" aria-hidden>
                  <div
                    className="absolute inset-y-0.5 left-0.5 rounded-full bg-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
                    style={{ width: `calc(${next.scoreAfter}% - 4px)` }}
                  />
                  <div className="absolute inset-y-0.5 left-0.5 rounded-full bg-brand" style={{ width: `calc(${confidence.score}% - 4px)` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-fg-3">
                  <span>Today {confidence.score}%</span>
                  <span>Potential {next.scoreAfter}%</span>
                </div>

                <ul className="mt-6 grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
                  {confidence.factors.map((f) => (
                    <li key={f.label} className={cx('flex items-center gap-2', f.have ? 'text-fg-2' : 'text-fg-3')}>
                      {f.have ? <Check className="h-3.5 w-3.5 shrink-0 text-brand-text" aria-hidden /> : <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                      <span>
                        {f.label}
                        <span className="sr-only">{f.have ? ' — provided' : ' — missing'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="neu-inset rounded-2xl p-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.07em] text-fg-2">Most valuable next data point</div>
                <div className="mt-2 text-[16px] font-semibold text-fg">{next.label}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">{next.why}</p>
                <div className="tnum mt-4 flex items-baseline gap-3 text-[15px]">
                  <span className="text-fg-2">{confidence.score}%</span>
                  <span className="text-fg-3">→</span>
                  <span className="text-[22px] font-semibold text-brand-text">{next.scoreAfter}%</span>
                  <span className="text-[12px] text-fg-3">estimated confidence</span>
                </div>
                {next.field && (
                  <Button size="sm" className="mt-4" onClick={() => onImprove(next.field!)} tour="diag-improve">
                    Add this data <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                )}
                {confidence.others.length > 0 && (
                  <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-[13px]">
                    {confidence.others.slice(0, 2).map((o) => (
                      <div key={o.label} className="flex justify-between gap-4">
                        <dt className="text-fg-2">{o.label}</dt>
                        <dd className="tnum shrink-0 text-fg">+{o.gain} pts</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </Panel>
        )}

        {sub === 2 && (
          <Panel tour="diag-signals" title="Preliminary signals" description="Derived from building characteristics. Not yet verified on site." bodyClassName="p-0">
            {signals.length === 0 ? (
              <p className="px-6 py-5 text-[13px] text-fg-2">No strong signals from the information provided.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {signals.map((s) => (
                  <li key={s.kind} className="grid gap-1 px-6 py-4 md:grid-cols-[190px_minmax(0,1fr)_minmax(0,auto)] md:items-baseline md:gap-6">
                    <span className="text-[14px] font-medium text-fg">{s.title}</span>
                    <span className="text-[13px] leading-relaxed text-fg-2">{s.text}</span>
                    <span className="tnum text-[12px] text-fg-3 md:text-right">{s.metric}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <StageFooter
        onBack={sub > 0 ? () => go(sub - 1) : onBack}
        backLabel={sub > 0 ? 'Back' : 'Edit building'}
        onNext={sub < last ? () => go(sub + 1) : onNext}
        nextLabel={sub < last ? `Continue to ${DIAGNOSIS_STAGES[sub + 1].title.toLowerCase()}` : 'Build my retrofit strategy'}
        nextTour="diag-next"
        note={sub === last ? 'Based on preliminary assumptions. Site verification required.' : undefined}
      />
    </div>
  )
}
