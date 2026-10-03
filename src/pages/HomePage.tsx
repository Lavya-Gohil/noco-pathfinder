import { useMemo, type ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Compass,
  FileText,
  Gauge,
  Layers,
  ListOrdered,
  LockKeyhole,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { buildBaseline } from '../engine/baseline'
import { dataConfidence } from '../engine/confidence'
import { MEASURES } from '../engine/measures'
import { optimize } from '../engine/optimizer'
import { BrandMark, Logo, MAKER, TAGLINE } from '../components/Brand'
import { ThemeToggle } from '../components/Header'
import { Button, cx } from '../components/ui'
import { DEMO_FORM, toBuilding } from '../utils/building'
import { money, num, pct, years } from '../utils/format'

const REPO = 'https://github.com/Lavya-Gohil/noco-pathfinder'

/** Figures for the sample building, computed by the same engine the app uses. */
function useDemoResult() {
  return useMemo(() => {
    const b = toBuilding(DEMO_FORM)
    const base = buildBaseline(b, 0)
    const r = optimize(base, { budget: b.budget, elecPriceChange: 0, incentiveRate: 0.15 })
    const plan = r.strategies.find((s) => s.id === 'balanced')!.plan!
    const hvac = plan.steps.find((s) => s.id === 'hvac')
    const capital = hvac ? hvac.effects.reduce((a, e) => a + Math.max(0, e.capitalImpact), 0) : 0
    return { b, base, plan, hvac, capital, combos: r.plans.length, confidence: dataConfidence(b) }
  }, [])
}

function Section({ id, eyebrow, title, intro, children, className }: { id?: string; eyebrow: string; title: string; intro?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cx('mx-auto max-w-[1200px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20', className)}>
      <div className="max-w-2xl">
        <div className="text-[13px] font-semibold text-brand-text">{eyebrow}</div>
        <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.02em] text-fg sm:text-[34px]">{title}</h2>
        {intro && <p className="mt-3 text-[16px] leading-relaxed text-fg-2">{intro}</p>}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  )
}

/** Product preview in the hero: the sequencing comparison and the roadmap, with real numbers. */
function HeroPreview() {
  const { plan, hvac, capital, b } = useDemoResult()
  const before = hvac ? hvac.net + capital : 0
  const after = hvac ? hvac.net : 0
  return (
    <div className="neu-raised relative rounded-3xl p-5 sm:p-6" aria-label="Example result for a sample building">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] text-fg-2">{b.name}</div>
          <div className="text-[15px] font-semibold text-fg" style={{ fontFamily: 'var(--font-display)' }}>
            Balanced path · {plan.order.map((m) => MEASURES[m].short).join(' → ')}
          </div>
        </div>
        <span className="neu-inset-sm rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-brand-text">Recommended</span>
      </div>

      <ol className="mt-5 space-y-3">
        {plan.steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3">
            <span className="neu-raised-sm tnum grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-brand-text">
              {String(s.phase).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{MEASURES[s.id].name}</span>
            <span className="tnum text-[13px] text-fg-2">{money(s.net)}</span>
            <span className="tnum hidden w-[92px] text-right text-[13px] font-medium text-brand-text sm:inline">+{money(s.annualSavings)}/yr</span>
          </li>
        ))}
      </ol>

      {hvac && (
        <div className="neu-inset mt-5 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-fg">HVAC net cost</div>
          {[
            { label: 'Sized for today’s building', v: before, brand: false },
            { label: 'After envelope + LED first', v: after, brand: true },
          ].map((r) => (
            <div key={r.label} className="mt-3">
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-fg-2">{r.label}</span>
                <span className="tnum font-semibold text-fg">{money(r.v)}</span>
              </div>
              <div className="neu-inset-sm h-2.5 rounded-full p-0.5">
                <div className={cx('h-full rounded-full', r.brand ? 'bg-brand' : 'bg-line-strong')} style={{ width: `${(r.v / before) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2.5 text-[13px]">
            <span className="text-fg-2">Saved by sequencing</span>
            <span className="tnum text-[18px] font-bold text-brand-text" style={{ fontFamily: 'var(--font-display)' }}>
              −{money(capital)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          ['Net investment', money(plan.net)],
          ['Annual savings', money(plan.annualSavings)],
          ['Payback', years(plan.payback)],
        ].map(([k, v]) => (
          <div key={k} className="neu-raised-sm rounded-xl px-2 py-2.5">
            <div className="text-[11px] text-fg-2">{k}</div>
            <div className="tnum mt-0.5 text-[15px] font-bold text-fg" style={{ fontFamily: 'var(--font-display)' }}>
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const STEPS: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <ClipboardList className="h-5 w-5" />, title: 'Assess', text: 'Four short sections: property, systems, energy bills, budget and goal. About two minutes.' },
  { icon: <Gauge className="h-5 w-5" />, title: 'Diagnose', text: 'See where energy likely goes, how confident the estimate is, and the one data point worth collecting next.' },
  { icon: <ListOrdered className="h-5 w-5" />, title: 'Sequence', text: 'Every combination of upgrades is tested, ordered by dependency, and costed with interactions included.' },
  { icon: <FileText className="h-5 w-5" />, title: 'Report', text: 'A printable roadmap for owners and stakeholders: sequence, financials, confidence and next steps.' },
]

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <Layers className="h-5 w-5" />, title: 'Sequencing engine', text: 'Envelope before HVAC, LED before cooling, controls after new equipment, solar sized to the reduced load.' },
  { icon: <Scale className="h-5 w-5" />, title: 'No double counting', text: 'Each phase saves energy from the load left by earlier phases, so combined savings stay realistic.' },
  { icon: <SlidersHorizontal className="h-5 w-5" />, title: 'Budget-aware paths', text: 'Quick Wins, Balanced and Deep Retrofit re-optimize instantly as budget, prices or incentives change.' },
  { icon: <BadgeCheck className="h-5 w-5" />, title: 'Honest confidence', text: 'A data confidence score and clear labels on every pre-audit estimate and potential incentive.' },
  { icon: <Compass className="h-5 w-5" />, title: 'Guided by doing', text: 'An interactive tour where you click through the real product, chapter by chapter.' },
  { icon: <LockKeyhole className="h-5 w-5" />, title: 'Private by design', text: 'Runs entirely in the browser. No accounts, no database, no analytics.' },
]

export function HomePage({ onDemo, onStart, onLaunch }: { onDemo: () => void; onStart: () => void; onLaunch: () => void }) {
  const { plan, capital, combos, b, base, confidence } = useDemoResult()

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 pt-3 sm:px-6 lg:px-8">
          <div className="neu-raised flex h-14 items-center gap-4 rounded-2xl px-3 sm:px-4">
            <a href="#/" className="rounded-xl" aria-label="NOCO Asset IQ home">
              <Logo />
            </a>
            <nav aria-label="Homepage" className="ml-auto hidden items-center gap-1 text-[13px] text-fg-2 md:flex">
              <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }) }} className="rounded-lg px-3 py-2 hover:text-fg">How it works</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }} className="rounded-lg px-3 py-2 hover:text-fg">Features</a>
              <a href="#/privacy" className="rounded-lg px-3 py-2 hover:text-fg">Privacy</a>
            </nav>
            <div className="ml-auto flex items-center gap-3 md:ml-2">
              <span className="hidden sm:block">
                <ThemeToggle />
              </span>
              <Button size="sm" onClick={onLaunch}>
                Open app <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <div className="neu-inset-sm inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium text-fg-2">
            <BrandMark className="h-4 w-4" /> Retrofit planning for commercial buildings
          </div>
          <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-fg sm:text-[56px]">
            Every upgrade,
            <br />
            <span className="text-brand-text">in the right order.</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-fg-2">
            Asset IQ shows building owners which energy upgrades to make, what order to make them in, and what that
            order is worth, before a single contractor is called.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={onDemo} className="h-12 px-5 text-[15px]">
              <Compass className="h-4 w-4" aria-hidden /> Take the guided demo
            </Button>
            <Button variant="secondary" onClick={onStart} className="h-12 px-5 text-[15px]">
              Start an assessment <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[12px] text-fg-3">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Free to try. Runs in your browser. Nothing is uploaded.
          </p>
        </div>
        <HeroPreview />
      </section>

      {/* Proof strip */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="neu-inset grid grid-cols-2 gap-px overflow-hidden rounded-3xl md:grid-cols-4">
          {[
            [String(combos), 'upgrade combinations tested per building'],
            ['4', 'interaction rules between upgrades'],
            ['~2 min', 'from building details to a roadmap'],
            ['0', 'bytes of building data sent anywhere'],
          ].map(([v, k]) => (
            <div key={k} className="px-5 py-6 text-center">
              <div className="tnum text-[30px] font-extrabold tracking-[-0.02em] text-fg" style={{ fontFamily: 'var(--font-display)' }}>
                {v}
              </div>
              <div className="mt-1 text-[13px] text-fg-2">{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem */}
      <Section
        eyebrow="The problem"
        title="Most retrofits are planned one upgrade at a time"
        intro="That's how buildings end up with HVAC sized for walls that are about to be insulated, and savings forecasts that count the same kilowatt-hour twice."
      >
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Equipment sized for the old load', 'Replace HVAC first and you pay for capacity the building stops needing once the envelope is fixed.'],
            ['Savings that add up too well', 'Upgrades overlap. A simple sum of each one’s savings overstates what the building will actually save.'],
            ['Budgets spent in the wrong place', 'Without sequencing, a fixed budget buys less. The same upgrades in a better order can cost less.'],
          ].map(([t, d]) => (
            <div key={t} className="neu-raised rounded-2xl p-6">
              <h3 className="text-[16px] font-bold text-fg">{t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-fg-2">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="How it works" title="From building details to a sequenced roadmap" intro="Four steps, each broken into short stages so you never face everything at once.">
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="neu-raised rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="neu-inset-sm grid h-10 w-10 place-items-center rounded-xl text-brand-text">{s.icon}</span>
                <span className="tnum text-[13px] font-semibold text-fg-3">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-4 text-[17px] font-bold text-fg">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Example */}
      <Section
        eyebrow="Worked example"
        title={`${b.name}: ${num(b.sqft)} sq ft office, ${b.city}`}
        intro={`Built ${b.yearBuilt}, with ${money(base.totalSpend)} a year in energy spend and a ${money(b.budget)} budget. Here is what Asset IQ recommends.`}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="neu-raised rounded-2xl p-6">
            <div className="text-[13px] font-semibold text-fg-2">Recommended order</div>
            <ol className="mt-4 space-y-4">
              {plan.steps.map((s) => (
                <li key={s.id} className="flex gap-4">
                  <span className="neu-raised-sm tnum grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-brand-text">
                    {String(s.phase).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="text-[15px] font-semibold text-fg">{MEASURES[s.id].name}</span>
                      <span className="tnum text-[13px] text-fg-2">
                        {money(s.net)} net · <span className="text-brand-text">+{money(s.annualSavings)}/yr</span>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Net investment', money(plan.net)],
              ['Annual savings', money(plan.annualSavings)],
              ['Simple payback', years(plan.payback)],
              ['Saved by sequencing', money(capital)],
              ['Energy spend cut', pct(plan.savingsShare)],
              ['Data confidence', `${confidence.score}% · ${confidence.level}`],
            ].map(([k, v]) => (
              <div key={k} className="neu-raised rounded-2xl px-5 py-4">
                <div className="text-[12px] text-fg-2">{k}</div>
                <div className="tnum mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-fg" style={{ fontFamily: 'var(--font-display)' }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[12px] text-fg-3">Illustrative pre-audit estimate. Potential incentives assume 15% of gross cost; eligibility requires verification.</p>
      </Section>

      {/* Features */}
      <Section id="features" eyebrow="Features" title="Built for decisions, not dashboards">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="neu-raised rounded-2xl p-6">
              <span className="neu-inset-sm grid h-10 w-10 place-items-center rounded-xl text-brand-text">{f.icon}</span>
              <h3 className="mt-4 text-[16px] font-bold text-fg">{f.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{f.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="neu-raised flex flex-col items-start gap-6 rounded-3xl p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-fg sm:text-[34px]">See it on a real building.</h2>
            <p className="mt-2 max-w-xl text-[16px] text-fg-2">
              The guided demo walks you through a sample office in four short chapters. You do the clicking.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onDemo} className="h-12 px-5 text-[15px]">
              <Compass className="h-4 w-4" aria-hidden /> Take the guided demo
            </Button>
            <Button variant="secondary" onClick={onStart} className="h-12 px-5 text-[15px]">
              Start an assessment
            </Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 pb-10 text-[13px] text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>
          NOCO Asset IQ by {MAKER} · {TAGLINE}
        </span>
        <nav aria-label="Footer" className="flex gap-5">
          <a href="#/privacy" className="hover:text-fg">
            Privacy policy
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-fg">
            GitHub
          </a>
        </nav>
      </footer>
    </div>
  )
}
