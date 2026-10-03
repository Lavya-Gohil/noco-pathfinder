import type { ReactNode } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { GAS_PRICE_PER_THERM, type Baseline } from '../engine/baseline'
import type { DataConfidence } from '../engine/confidence'
import { phaseReason, whyThisOrder } from '../engine/explanations'
import { MEASURES } from '../engine/measures'
import type { Strategy } from '../engine/optimizer'
import type { Scenario } from '../types'
import { money, num, pct, signedPct, tons, years } from '../utils/format'
import { Logo } from '../components/Header'
import { Button } from '../components/ui'

const NEXT_STEPS = [
  'Obtain 12 months of utility consumption.',
  'Conduct an on-site energy assessment.',
  'Verify equipment age and specifications.',
  'Confirm available incentives.',
  'Develop contractor-ready project scopes.',
]

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0 print:mt-6">
      <h2 className="mb-3 flex break-after-avoid items-baseline gap-2 border-b border-line pb-2 text-[14px] font-semibold text-fg">
        <span className="tnum text-[12px] font-medium text-fg-3">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className="border-b border-line last:border-b-0">
      <td className="py-1.5 pr-4 text-fg-2">{label}</td>
      <td className={`tnum py-1.5 text-right ${strong ? 'font-semibold text-fg' : 'text-fg'}`}>{value}</td>
    </tr>
  )
}

export function ReportPage({
  base,
  strategy,
  confidence,
  scenario,
  onBack,
}: {
  base: Baseline
  strategy: Strategy
  confidence: DataConfidence
  scenario: Scenario
  onBack: () => void
}) {
  const b = base.building
  const plan = strategy.plan
  const today = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
  const why = plan ? whyThisOrder(plan, scenario.budget) : []
  const sequence = plan ? plan.order.map((m) => MEASURES[m].name).join(' → ') : ''
  const sequencingEffect = plan ? plan.steps.flatMap((s) => s.effects).reduce((a, e) => a + Math.max(0, e.capitalImpact), 0) : 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to strategy
        </Button>
        <Button onClick={() => window.print()} ariaLabel="Print executive report" tour="report-print">
          <Printer className="h-4 w-4" aria-hidden />
          <span>
            Print<span className="hidden sm:inline"> executive report</span>
          </span>
        </Button>
      </div>

      <article data-tour="report-doc" className="theme-light mx-auto max-w-[816px] rounded-[4px] bg-white px-6 py-8 text-[13px] text-fg shadow-[0_1px_1px_rgba(0,0,0,0.06),0_10px_24px_-6px_rgba(15,23,42,0.22),0_40px_80px_-30px_rgba(15,23,42,0.35)] sm:px-14 sm:py-12 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b-2 border-fg pb-5">
          <div className="flex items-center justify-between gap-4">
            <Logo flat />
            <span className="text-[12px] text-fg-2">{today}</span>
          </div>
          <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.01em] text-fg">Preliminary Energy Investment Roadmap</h1>
          <p className="mt-1 text-[14px] text-fg-2">
            {b.name} · {b.city}, {b.state}
          </p>
        </header>

        <div className="mt-8">
          <Section n={1} title="Building information">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 sm:grid-cols-3">
              {[
                ['Building', b.name],
                ['Location', `${b.city}, ${b.state}`],
                ['Building type', b.type],
                ['Floor area', `${num(b.sqft)} sq ft`],
                ['Year built', b.yearBuilt ? String(b.yearBuilt) : 'Not provided'],
                ['Annual energy spend (est.)', money(base.totalSpend)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-fg-2">{k}</dt>
                  <dd className="tnum mt-0.5 font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section n={2} title="Executive summary">
            {plan ? (
              <div className="space-y-2.5 text-[13px] leading-relaxed text-fg">
                <p>
                  Based on the information provided, Pathfinder recommends the{' '}
                  <strong className="font-semibold">{strategy.name}</strong> path: {sequence}. The program requires an estimated{' '}
                  <span className="tnum font-medium">{money(plan.net)}</span> net investment after potential incentives and is
                  expected to save about <span className="tnum font-medium">{money(plan.annualSavings)}</span> per year — a simple
                  payback of <span className="tnum">{years(plan.payback)}</span> and a {pct(plan.savingsShare)} reduction in annual
                  energy spend.
                </p>
                {sequencingEffect > 1 && (
                  <p>
                    Sequencing load reductions ahead of equipment decisions lowers the estimated net project cost by about{' '}
                    <span className="tnum font-medium">{money(sequencingEffect)}</span>
                    {plan.unsequencedNet > scenario.budget && plan.net <= scenario.budget
                      ? ', which keeps the program within the stated budget.'
                      : '.'}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-fg-2">No strategy fits the current budget of {money(scenario.budget)}.</p>
            )}
          </Section>

          {plan && (
            <Section n={3} title="Recommended sequence">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] text-fg-2">
                    <th className="w-12 py-1.5 font-medium">Phase</th>
                    <th className="py-1.5 font-medium">Measure and rationale</th>
                    <th className="whitespace-nowrap py-1.5 pl-4 text-right font-medium">Net cost</th>
                    <th className="whitespace-nowrap py-1.5 pl-4 text-right font-medium">Savings / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.steps.map((s) => (
                    <tr key={s.id} className="print-avoid-break border-b border-line align-top">
                      <td className="tnum py-2.5 text-fg-2">{String(s.phase).padStart(2, '0')}</td>
                      <td className="py-2.5">
                        <div className="font-medium text-fg">{MEASURES[s.id].name}</div>
                        <div className="mt-0.5 text-[12px] leading-relaxed text-fg-2">{phaseReason(plan, s, base)}</div>
                      </td>
                      <td className="tnum whitespace-nowrap py-2.5 pl-4 text-right">{money(s.net)}</td>
                      <td className="tnum whitespace-nowrap py-2.5 pl-4 text-right">{money(s.annualSavings)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td />
                    <td className="py-2">Total, interaction-adjusted</td>
                    <td className="tnum py-2 pl-4 text-right">{money(plan.net)}</td>
                    <td className="tnum py-2 pl-4 text-right">{money(plan.annualSavings)}</td>
                  </tr>
                </tbody>
              </table>
              {why.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-[12px] leading-relaxed text-fg-2">
                  {why.slice(0, 3).map((w) => (
                    <li key={w.title}>
                      <span className="font-medium text-fg">{w.title}.</span> {w.text}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {plan && (
            <Section n={4} title="Financial summary">
              <table className="w-full max-w-[460px] text-[13px]">
                <tbody>
                  <Row label="Gross investment" value={money(plan.gross)} />
                  <Row label="Potential incentives" value={`−${money(plan.incentive)}`} />
                  <Row label="Net investment" value={money(plan.net)} strong />
                  <Row label="Estimated annual savings" value={money(plan.annualSavings)} strong />
                  <Row label="Simple payback" value={years(plan.payback)} />
                  <Row label="Estimated CO₂ reduction" value={`${tons(plan.co2)} per year`} />
                  <Row label="Budget" value={money(scenario.budget)} />
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-fg-2">
                Potential incentive — eligibility requires verification. Assumes {pct(scenario.incentiveRate)} incentive level and{' '}
                {signedPct(scenario.elecPriceChange)} electricity price change.
              </p>
            </Section>
          )}

          <Section n={plan ? 5 : 3} title="Confidence and assumptions">
            <div className="grid gap-6 sm:grid-cols-2">
              <dl className="space-y-2">
                <div>
                  <dt className="text-[12px] text-fg-2">Data confidence</dt>
                  <dd className="tnum font-medium text-fg">
                    {confidence.level} ({confidence.score}%)
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-fg-2">Most valuable next data point</dt>
                  <dd className="font-medium text-fg">{confidence.next.label}</dd>
                  <dd className="tnum text-[12px] text-fg-2">
                    Estimated confidence {confidence.score}% → {confidence.next.scoreAfter}%
                  </dd>
                </div>
              </dl>
              <ul className="space-y-1 text-[12px] leading-relaxed text-fg-2">
                <li>Savings are calculated sequentially, so overlapping savings are not double counted.</li>
                <li>
                  Electricity at ${base.elecPrice.toFixed(3)}/kWh{base.heatFuel === 'gas' ? `; natural gas at $${GAS_PRICE_PER_THERM.toFixed(2)}/therm` : ''}.
                </li>
                <li>Costs are illustrative ratios by floor area and capacity, not contractor quotes.</li>
              </ul>
            </div>
          </Section>

          <Section n={plan ? 6 : 4} title="Recommended next steps">
            <ol className="space-y-1.5 text-[13px] text-fg">
              {NEXT_STEPS.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="tnum w-4 shrink-0 text-fg-3">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <footer className="mt-10 border-t border-line pt-3 text-[11px] leading-relaxed text-fg-2">
          Preliminary estimate. Final recommendations require site verification and confirmed incentive eligibility.
        </footer>
      </article>
    </div>
  )
}
