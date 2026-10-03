import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Compass } from 'lucide-react'
import { Header, type StepId } from './components/Header'
import { Tour } from './components/Tour'
import { Button } from './components/ui'
import { buildBaseline } from './engine/baseline'
import { dataConfidence } from './engine/confidence'
import { opportunityLabel, signals } from './engine/explanations'
import { optimize, recommendedPath } from './engine/optimizer'
import { DiagnosisPage } from './pages/DiagnosisPage'
import { IntakePage } from './pages/IntakePage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ReportPage } from './pages/ReportPage'
import { StrategyPage } from './pages/StrategyPage'
import { TOUR_STEPS } from './tour/steps'
import type { Building, BuildingForm, PathId, Scenario } from './types'
import { DEMO_FORM, EMPTY_FORM, toBuilding, validate } from './utils/building'

const ORDER: StepId[] = ['intake', 'diagnosis', 'strategy', 'report']
const DEFAULT_INCENTIVE = 0.15
const REPO = 'https://github.com/Lavya-Gohil/noco-pathfinder'
type Subs = Record<'intake' | 'diagnosis' | 'strategy', number>
const FIRST_STAGES: Subs = { intake: 0, diagnosis: 0, strategy: 0 }

const sameForm = (a: BuildingForm, b: BuildingForm) =>
  (Object.keys(a) as (keyof BuildingForm)[]).every((k) => String(a[k]).replace(/,/g, '') === String(b[k]).replace(/,/g, ''))

export default function App() {
  const [step, setStep] = useState<StepId>('intake')
  const [maxStep, setMaxStep] = useState(0)
  const [subs, setSubs] = useState<Subs>(FIRST_STAGES)
  const [form, setForm] = useState<BuildingForm>(EMPTY_FORM)
  const [building, setBuilding] = useState<Building | null>(null)
  const [scenario, setScenario] = useState<Scenario>({ budget: 250_000, elecPriceChange: 0, incentiveRate: DEFAULT_INCENTIVE })
  const [selected, setSelected] = useState<PathId>('balanced')
  const [tourIndex, setTourIndex] = useState<number | null>(null)
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const showPrivacy = hash === '#/privacy'

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step, showPrivacy])

  const go = (s: StepId) => {
    if (showPrivacy) window.location.hash = '#/'
    setStep(s)
    setMaxStep((m) => Math.max(m, ORDER.indexOf(s)))
  }
  const setSub = (page: keyof Subs) => (i: number) => setSubs((p) => ({ ...p, [page]: i }))

  // Diagnosis is always shown at today's prices; strategy uses the what-if scenario.
  const diagBase = useMemo(() => (building ? buildBaseline(building, 0) : null), [building])
  const base = useMemo(
    () => (building ? buildBaseline(building, scenario.elecPriceChange) : null),
    [building, scenario.elecPriceChange],
  )
  const result = useMemo(() => (base ? optimize(base, scenario) : null), [base, scenario])
  const confidence = useMemo(() => (building ? dataConfidence(building) : null), [building])
  const diagnosis = useMemo(() => {
    if (!diagBase) return null
    const full = optimize(diagBase, { budget: Number.MAX_SAFE_INTEGER, elecPriceChange: 0, incentiveRate: DEFAULT_INCENTIVE }).fullPlan
    return { signals: signals(diagBase), opportunity: opportunityLabel(full.savingsShare) }
  }, [diagBase])

  /** Build the model from a form (falls back to the demo if the form is invalid). */
  const runAnalysis = (f: BuildingForm) => {
    const source = Object.keys(validate(f)).length === 0 ? f : DEMO_FORM
    if (source !== f) setForm(DEMO_FORM)
    const b = toBuilding(source)
    setBuilding(b)
    setScenario({ budget: b.budget, elecPriceChange: 0, incentiveRate: DEFAULT_INCENTIVE })
    setSelected(recommendedPath(b.objective))
    setSubs((p) => ({ ...p, diagnosis: 0, strategy: 0 }))
  }

  const analyze = () => {
    runAnalysis(form)
    setMaxStep(1)
    go('diagnosis')
  }

  // ---- Guided tour ----
  const tourGo = (i: number) => {
    const st = TOUR_STEPS[i]
    if (st.page !== 'intake' && !building) runAnalysis(form)
    if (st.sub !== undefined && st.page !== 'report') setSubs((p) => ({ ...p, [st.page]: st.sub }))
    go(st.page)
    setTourIndex(i)
  }

  const startTour = () => {
    if (!sameForm(form, EMPTY_FORM) && !sameForm(form, DEMO_FORM)) {
      const ok = window.confirm('The guided tour loads a sample building and replaces the information in the form. Continue?')
      if (!ok) return
    }
    if (showPrivacy) window.location.hash = '#/'
    setForm(DEMO_FORM)
    setBuilding(null)
    setSubs(FIRST_STAGES)
    setMaxStep(0)
    setStep('intake')
    setTourIndex(0)
  }

  /** Leave the sample building and start a blank assessment. */
  const startOwn = () => {
    if (showPrivacy) window.location.hash = '#/'
    setTourIndex(null)
    setForm(EMPTY_FORM)
    setBuilding(null)
    setSubs(FIRST_STAGES)
    setMaxStep(0)
    setStep('intake')
    window.scrollTo({ top: 0 })
  }

  const strategy = result?.strategies.find((s) => s.id === selected) ?? null
  const demoLoaded = sameForm(form, DEMO_FORM)

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      <Header
        step={step}
        maxStep={building ? maxStep : 0}
        onNavigate={go}
        buildingName={building?.name}
        onTour={startTour}
        inApp={!showPrivacy}
      />
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10 print:max-w-none print:p-0">
        {demoLoaded && tourIndex === null && !showPrivacy && (
          <div
            role="region"
            aria-label="Sample building notice"
            className="neu-inset mb-6 flex flex-col gap-3 rounded-2xl px-5 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden"
          >
            <p className="flex items-center gap-2.5 text-[13px] text-fg-2">
              <Compass className="h-4 w-4 shrink-0 text-brand-text" aria-hidden />
              <span>
                You're exploring a <span className="font-medium text-fg">sample building</span>. Ready to assess your own?
              </span>
            </p>
            <Button size="sm" onClick={startOwn} className="self-start sm:self-auto">
              Start my own assessment <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        )}
        {showPrivacy ? (
          <PrivacyPage />
        ) : (
          <>
            {step === 'intake' && (
              <IntakePage
                form={form}
                setForm={setForm}
                onSubmit={analyze}
                sub={subs.intake}
                setSub={setSub('intake')}
                onStartTour={startTour}
              />
            )}
            {step === 'diagnosis' && diagBase && confidence && diagnosis && (
              <DiagnosisPage
                base={diagBase}
                confidence={confidence}
                opportunity={diagnosis.opportunity}
                signals={diagnosis.signals}
                onNext={() => {
                  setSubs((p) => ({ ...p, strategy: 0 }))
                  go('strategy')
                }}
                onBack={() => go('intake')}
                sub={subs.diagnosis}
                setSub={setSub('diagnosis')}
              />
            )}
            {step === 'strategy' && base && result && (
              <StrategyPage
                base={base}
                scenario={scenario}
                setScenario={setScenario}
                result={result}
                selected={selected}
                setSelected={setSelected}
                onReport={() => go('report')}
                onBack={() => {
                  setSubs((p) => ({ ...p, diagnosis: 2 }))
                  go('diagnosis')
                }}
                sub={subs.strategy}
                setSub={setSub('strategy')}
              />
            )}
            {step === 'report' && base && strategy && confidence && (
              <ReportPage base={base} strategy={strategy} confidence={confidence} scenario={scenario} onBack={() => go('strategy')} />
            )}
          </>
        )}
      </main>
      <footer className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 pb-8 text-[12px] text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 print:hidden">
        <span>NOCO Pathfinder · Illustrative pre-audit estimates. Site verification required.</span>
        <nav aria-label="Footer" className="flex gap-4">
          <a href="#/privacy" className="hover:text-fg">
            Privacy policy
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-fg">
            GitHub
          </a>
        </nav>
      </footer>

      {tourIndex !== null && !showPrivacy && (
        <Tour
          steps={TOUR_STEPS}
          index={tourIndex}
          onNext={() => (tourIndex < TOUR_STEPS.length - 1 ? tourGo(tourIndex + 1) : setTourIndex(null))}
          onBack={() => tourIndex > 0 && tourGo(tourIndex - 1)}
          onClose={() => setTourIndex(null)}
          onStartOwn={startOwn}
        />
      )}
    </div>
  )
}
