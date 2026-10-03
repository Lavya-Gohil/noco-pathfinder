import { useMemo, useState, type ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { Baseline } from '../engine/baseline'
import { whyThisOrder } from '../engine/explanations'
import type { PlanResult, StepResult } from '../engine/interactions'
import { MEASURES, MEASURE_IDS } from '../engine/measures'
import type { OptimizerResult, Strategy } from '../engine/optimizer'
import { PATH_DASH, useChartPalette } from '../theme'
import type { MeasureId, PathId, Scenario } from '../types'
import { BUDGET_MAX, BUDGET_MIN } from '../utils/building'
import { money, moneyShort, pct, signedPct, tons, years } from '../utils/format'
import { AssumptionsDrawer } from '../components/AssumptionsDrawer'
import { CashFlowChart } from '../components/CashFlowChart'
import { ComparisonTable } from '../components/ComparisonTable'
import { MeasureDrawer } from '../components/MeasureDrawer'
import { Roadmap, type FuturePhase } from '../components/Roadmap'
import { StageFooter, StageNav } from '../components/Stages'
import { AnimatedNumber, Button, EstimateNote, PageHeader, Panel, Slider, Tag, cx } from '../components/ui'

export const STRATEGY_STAGES = [
  { title: 'Choose a path' },
  { title: 'Roadmap' },
  { title: 'Why this order' },
  { title: 'Scenarios' },
  { title: 'Compare measures' },
]

function sequenceText(plan: PlanResult) {
  return plan.order.map((m) => MEASURES[m].short).join(' → ')
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-fg-2">{label}</div>
      <div className="mt-0.5 truncate text-[18px] font-semibold tracking-[-0.01em] text-fg">{value}</div>
    </div>
  )
}

function StrategyCard({
  s,
  selected,
  onSelect,
  cheapest,
  unlock,
  strategies,
}: {
  s: Strategy
  selected: boolean
  onSelect: () => void
  cheapest: PlanResult | null
  unlock: PlanResult | null
  strategies: Strategy[]
}) {
  const c = useChartPalette()
  const p = s.plan
  const same = s.sameAs ? strategies.find((x) => x.id === s.sameAs) : null
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'flex h-full flex-col rounded-2xl p-5 text-left transition-[box-shadow,border-color] duration-150',
        selected ? 'neu-inset !border-[color-mix(in_srgb,var(--brand)_55%,transparent)]' : 'neu-raised hover:brightness-[1.01]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full', selected ? 'neu-btn-primary !shadow-none' : 'neu-inset-sm')}
            aria-hidden
          >
            {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>
          <span className="text-[16px] font-semibold text-fg">{s.name}</span>
        </div>
        {s.recommended && <Tag tone="brand">Recommended</Tag>}
      </div>
      <p className="mt-1.5 text-[13px] text-fg-2">{s.goal}</p>

      {p ? (
        <>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Metric label="Net investment" value={<AnimatedNumber value={p.net} format={money} />} />
            <Metric label="Annual savings" value={<AnimatedNumber value={p.annualSavings} format={money} />} />
            <Metric label="Payback" value={<AnimatedNumber value={p.payback} format={years} />} />
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-line/70 pt-3 text-[12px] text-fg-2">
            <svg width="18" height="6" aria-hidden className="shrink-0">
              <line x1="0" y1="3" x2="18" y2="3" stroke={c[s.id]} strokeWidth="2" strokeDasharray={PATH_DASH[s.id]} />
            </svg>
            {sequenceText(p)}
          </div>
          {same && (
            <p className="mt-2 text-[12px] text-fg-3">
              Same measures as {same.name} at this budget.
              {s.id === 'deep' && unlock && (
                <>
                  {' '}
                  {moneyShort(unlock.net)} adds {unlock.order.filter((m) => !p.order.includes(m)).map((m) => MEASURES[m].short).join(' + ')}.
                </>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-[13px] text-fg-2">
          No measure fits this budget.
          {cheapest && <> The smallest project needs about {money(cheapest.net)} net.</>}
        </p>
      )}
    </button>
  )
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[13px] text-fg-2">{label}</dt>
      <dd className={cx('tnum text-right', strong ? 'text-[16px] font-semibold text-fg' : 'text-[13px] text-fg')}>{value}</dd>
    </div>
  )
}

/** The step whose cost changed most because of sequencing, with the measures that caused it. */
function biggestSequencingEffect(plan: PlanResult): { step: StepResult; capital: number; causes: MeasureId[] } | null {
  let best: { step: StepResult; capital: number; causes: MeasureId[] } | null = null
  for (const st of plan.steps) {
    const capital = st.effects.reduce((a, e) => a + Math.max(0, e.capitalImpact), 0)
    if (capital > 1 && (!best || capital > best.capital)) {
      const causes = plan.order.slice(0, plan.order.indexOf(st.id)).filter((m) => m !== 'controls')
      best = { step: st, capital, causes }
    }
  }
  return best
}

function CompareBars({ rows }: { rows: { label: string; value: number; tone: 'muted' | 'brand' }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12px]">
            <span className="text-fg-2">{r.label}</span>
            <span className="tnum text-[15px] font-semibold text-fg">
              <AnimatedNumber value={r.value} format={money} />
            </span>
          </div>
          <div className="neu-inset-sm h-3 rounded-full p-0.5">
            <div
              className={cx('h-full rounded-full transition-[width] duration-300', r.tone === 'brand' ? 'bg-brand' : 'bg-line-strong')}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function SequenceComparison({ plan }: { plan: PlanResult }) {
  const eff = biggestSequencingEffect(plan)
  if (eff) {
    const before = eff.step.net + eff.capital
    const after = eff.step.net
    const causes = eff.causes.map((m) => MEASURES[m].short).join(' + ')
    return (
      <div>
        <div className="text-[14px] font-semibold text-fg">Estimated {MEASURES[eff.step.id].name} net cost</div>
        <div className="mt-4">
          <CompareBars
            rows={[
              { label: eff.step.id === 'solar' ? 'Sized for today’s demand' : 'Sized for today’s building', value: before, tone: 'muted' },
              { label: `After ${causes}`, value: after, tone: 'brand' },
            ]}
          />
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3 text-[13px]">
          <span className="text-fg-2">Estimated difference</span>
          <span className="tnum text-[18px] font-semibold text-brand-text">
            −<AnimatedNumber value={eff.capital} format={money} />{' '}
            <span className="text-[13px] font-normal text-fg-2">({pct(eff.capital / before)})</span>
          </span>
        </div>
      </div>
    )
  }
  if (plan.overlapRemoved > 1) {
    return (
      <div>
        <div className="text-[14px] font-semibold text-fg">Annual savings</div>
        <div className="mt-4">
          <CompareBars
            rows={[
              { label: 'Simple sum of measures', value: plan.naiveSavings, tone: 'muted' },
              { label: 'Interaction-adjusted', value: plan.annualSavings, tone: 'brand' },
            ]}
          />
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3 text-[13px]">
          <span className="text-fg-2">Double counting removed</span>
          <span className="tnum font-semibold text-fg">{money(plan.overlapRemoved)}/yr</span>
        </div>
      </div>
    )
  }
  return <p className="text-[13px] text-fg-2">No order-dependent effects in this plan.</p>
}

export function StrategyPage({
  base,
  scenario,
  setScenario,
  result,
  selected,
  setSelected,
  onReport,
  onBack,
  sub,
  setSub,
}: {
  base: Baseline
  scenario: Scenario
  setScenario: (s: Scenario) => void
  result: OptimizerResult
  selected: PathId
  setSelected: (p: PathId) => void
  onReport: () => void
  onBack: () => void
  sub: number
  setSub: (i: number) => void
}) {
  const [drawer, setDrawer] = useState<MeasureId | null>(null)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)

  const strategy = result.strategies.find((s) => s.id === selected)!
  const plan = strategy.plan

  const byKey = useMemo(() => {
    const m = new Map<string, PlanResult>()
    for (const p of result.plans) m.set([...p.order].sort().join(','), p)
    return m
  }, [result.plans])

  const singles = useMemo(() => {
    const o = {} as Record<MeasureId, PlanResult>
    for (const id of MEASURE_IDS) o[id] = byKey.get(id)!
    return o
  }, [byKey])

  const future: FuturePhase[] = useMemo(() => {
    if (!plan) return []
    return MEASURE_IDS.filter((m) => !plan.order.includes(m))
      .map((m) => {
        const bigger = byKey.get([...plan.order, m].sort().join(','))
        return { id: m, extraBudget: bigger ? Math.max(0, bigger.net - plan.net) : 0 }
      })
      .filter((f) => f.extraBudget > 0)
      .sort((a, b) => a.extraBudget - b.extraBudget)
  }, [plan, byKey])

  const why = plan ? whyThisOrder(plan, scenario.budget).slice(0, 4) : []
  const fitsBecauseSequenced = plan ? plan.unsequencedNet > scenario.budget && plan.net <= scenario.budget : false
  const set = (patch: Partial<Scenario>) => setScenario({ ...scenario, ...patch })
  const isDefault = scenario.elecPriceChange === 0 && scenario.incentiveRate === 0.15 && scenario.budget === base.building.budget
  const last = STRATEGY_STAGES.length - 1
  const go = (i: number) => {
    setSub(i)
    window.scrollTo({ top: 0 })
  }

  const budgetSlider = (id: string) => (
    <Slider
      id={id}
      label="Budget"
      value={scenario.budget}
      min={BUDGET_MIN}
      max={BUDGET_MAX}
      step={5000}
      onChange={(v) => set({ budget: v })}
      display={money(scenario.budget)}
      minLabel="$25K"
      maxLabel="$1M"
    />
  )

  const needsPlan = (body: ReactNode) =>
    plan ? (
      body
    ) : (
      <Panel bodyClassName="p-6">
        <p className="text-[13px] text-fg-2">
          The {strategy.name} path has no measures at this budget. Increase the budget or choose another path.
        </p>
      </Panel>
    )

  return (
    <div>
      <PageHeader
        title="Retrofit strategy"
        description="Compare investment paths based on budget, savings, and upgrade dependencies."
        actions={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
            <div data-tour="strategy-budget" className="neu-raised w-full rounded-2xl px-5 pb-3 pt-4 sm:w-[360px]">
              {budgetSlider('budget-top')}
            </div>
            <Button variant="secondary" onClick={() => setAssumptionsOpen(true)} className="shrink-0" tour="strategy-assumptions">
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Assumptions
            </Button>
          </div>
        }
      />

      <StageNav label="Strategy stages" stages={STRATEGY_STAGES} current={sub} onSelect={go} tour="strategy-stages" />

      {sub > 0 && plan && (
        <div className="neu-inset mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl px-5 py-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-fg">{strategy.name} path</span>
            <span className="text-fg-2">{sequenceText(plan)}</span>
          </div>
          <div className="tnum flex flex-wrap items-center gap-x-5 gap-y-1 text-fg-2">
            <span>
              <span className="font-semibold text-fg">{money(plan.net)}</span> net
            </span>
            <span>
              <span className="font-semibold text-brand-text">{money(plan.annualSavings)}</span>/yr
            </span>
            <span>
              <span className="font-semibold text-fg">{years(plan.payback)}</span> payback
            </span>
            <button type="button" onClick={() => go(0)} className="font-medium text-brand-text hover:underline">
              Change path
            </button>
          </div>
        </div>
      )}

      <div key={sub} className="stage-in">
        {sub === 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-fg-2">Select a path to see its roadmap. Move the budget to see paths change.</p>
              <span className="tnum text-[12px] text-fg-2">
                {result.plans.length} combinations tested · {result.affordable.length} within budget
              </span>
            </div>
            <div data-tour="strategy-paths" className="grid gap-5 lg:grid-cols-3">
              {result.strategies.map((s) => (
                <StrategyCard
                  key={s.id}
                  s={s}
                  strategies={result.strategies}
                  selected={selected === s.id}
                  onSelect={() => setSelected(s.id)}
                  cheapest={result.cheapestEntry}
                  unlock={result.nextDeeper}
                />
              ))}
            </div>
          </>
        )}

        {sub === 1 &&
          needsPlan(
            plan && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
                <Panel
                  tour="strategy-roadmap"
                  title="Upgrade roadmap"
                  description="Phases in the order Pathfinder recommends"
                  actions={<EstimateNote className="hidden sm:inline-flex">Pre-audit estimate</EstimateNote>}
                >
                  <Roadmap plan={plan} base={base} future={future.slice(0, 2)} />
                </Panel>
                <Panel tour="strategy-summary" title="Strategy summary" description={strategy.name}>
                  <dl className="-my-2.5 divide-y divide-line/70">
                    <SummaryRow label="Net investment" strong value={<AnimatedNumber value={plan.net} format={money} />} />
                    <SummaryRow label="Annual savings" strong value={<AnimatedNumber value={plan.annualSavings} format={money} />} />
                    <SummaryRow label="Simple payback" strong value={<AnimatedNumber value={plan.payback} format={years} />} />
                    <SummaryRow label="Gross cost" value={<AnimatedNumber value={plan.gross} format={money} />} />
                    <SummaryRow label="Potential incentive" value={<AnimatedNumber value={plan.incentive} format={(v) => `−${money(v)}`} />} />
                    <SummaryRow label="CO₂ reduction" value={<>{tons(plan.co2)}/yr</>} />
                    <SummaryRow label="Energy spend reduction" value={pct(plan.savingsShare)} />
                    <SummaryRow label="Budget used" value={`${pct(plan.net / Math.max(1, scenario.budget))} of ${money(scenario.budget)}`} />
                  </dl>
                  {fitsBecauseSequenced && (
                    <p className="neu-inset mt-5 rounded-xl px-4 py-3 text-[12px] leading-relaxed text-fg-2">
                      <span className="font-semibold text-fg">Fits budget because of sequencing.</span> The same measures in a
                      big-equipment-first order would cost {money(plan.unsequencedNet)} net.
                    </p>
                  )}
                  <p className="mt-3 text-[11px] text-fg-3">Potential incentive — eligibility requires verification.</p>
                </Panel>
              </div>
            ),
          )}

        {sub === 2 &&
          needsPlan(
            plan && (
              <Panel title="Why this sequence?" description="How upgrade order changes cost and savings for this building">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                  <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {why.map((w) => (
                      <li key={w.title}>
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-2">{w.title}</h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-fg">{w.text}</p>
                        {w.impact && <p className="tnum mt-1.5 text-[12px] font-semibold text-brand-text">{w.impact}</p>}
                      </li>
                    ))}
                  </ol>
                  <div data-tour="strategy-why" className="neu-inset self-start rounded-2xl p-5">
                    <SequenceComparison plan={plan} />
                  </div>
                </div>
              </Panel>
            ),
          )}

        {sub === 3 && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.85fr)]">
            <Panel
              tour="strategy-scenarios"
              title="Scenario assumptions"
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDefault}
                  onClick={() => setScenario({ budget: base.building.budget, elecPriceChange: 0, incentiveRate: 0.15 })}
                >
                  Reset
                </Button>
              }
            >
              <div className="space-y-7">
                {budgetSlider('budget-scenario')}
                <Slider
                  id="price"
                  label="Electricity price"
                  value={Math.round(scenario.elecPriceChange * 100)}
                  min={-20}
                  max={50}
                  step={1}
                  onChange={(v) => set({ elecPriceChange: v / 100 })}
                  display={`${signedPct(scenario.elecPriceChange)} · $${base.elecPrice.toFixed(3)}/kWh`}
                  minLabel="−20%"
                  maxLabel="+50%"
                />
                <Slider
                  id="incentive"
                  label="Incentive assumption"
                  value={Math.round(scenario.incentiveRate * 100)}
                  min={0}
                  max={30}
                  step={1}
                  onChange={(v) => set({ incentiveRate: v / 100 })}
                  display={`${pct(scenario.incentiveRate)} of gross cost`}
                  minLabel="0%"
                  maxLabel="30%"
                />
              </div>
              <p className="mt-6 text-[11px] leading-relaxed text-fg-3">
                Potential incentive — eligibility requires verification. Live incentive programs are not checked.
              </p>
            </Panel>
            <Panel title="Cumulative cash position" description="Net investment recovered by annual savings, 15 years, no escalation">
              <CashFlowChart strategies={result.strategies} selected={selected} />
            </Panel>
          </div>
        )}

        {sub === 4 && (
          <Panel
            tour="strategy-table"
            title="Upgrade comparison"
            description="Each measure on its own, before interactions. Select a measure for details."
            bodyClassName="p-0"
          >
            <ComparisonTable singles={singles} inPlan={plan?.order ?? []} onOpen={setDrawer} />
            <p className="border-t border-line/70 px-6 py-3 text-[12px] text-fg-3">
              Potential incentive — eligibility requires verification. Stand-alone savings don't sum to plan savings because overlap is removed.
            </p>
          </Panel>
        )}
      </div>

      <StageFooter
        onBack={sub > 0 ? () => go(sub - 1) : onBack}
        backLabel={sub > 0 ? 'Back' : 'Diagnosis'}
        onNext={sub < last ? () => go(sub + 1) : onReport}
        nextDisabled={sub === last && !plan}
        nextLabel={sub < last ? `Continue to ${STRATEGY_STAGES[sub + 1].title.toLowerCase()}` : 'Generate executive report'}
        nextTour="strategy-next"
      />

      {drawer && (
        <MeasureDrawer id={drawer} single={singles[drawer]} plan={plan} planName={strategy.name} onClose={() => setDrawer(null)} />
      )}
      <AssumptionsDrawer open={assumptionsOpen} onClose={() => setAssumptionsOpen(false)} base={base} scenario={scenario} />
    </div>
  )
}
