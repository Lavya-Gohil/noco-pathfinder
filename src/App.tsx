import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Compass } from 'lucide-react'
import { Header, type StepId } from './components/Header'
import { Tour } from './components/Tour'
import { MAKER, PRODUCT, TAGLINE } from './components/Brand'
import { Button } from './components/ui'
import { buildBaseline } from './engine/baseline'
import { dataConfidence } from './engine/confidence'
import { opportunityLabel, signals } from './engine/explanations'
import { optimize, recommendedPath } from './engine/optimizer'
import { IntakePage } from './pages/IntakePage'
import { HomePage } from './pages/HomePage'
import { CHAPTER_START, TOUR_STEPS, type TourApi, type TourState } from './tour/steps'
import type { Building, BuildingForm, PathId, Scenario } from './types'
import { DEMO_FORM, EMPTY_FORM, sameForm, toBuilding, validate } from './utils/building'
import { loadSession, saveSession } from './utils/session'

// Loaded on demand so the homepage and intake form don't download the chart library.
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage').then((m) => ({ default: m.DiagnosisPage })))
const StrategyPage = lazy(() => import('./pages/StrategyPage').then((m) => ({ default: m.StrategyPage })))
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))

const ORDER: StepId[] = ['intake', 'diagnosis', 'strategy', 'report']
const DEFAULT_INCENTIVE = 0.15
const REPO = 'https://github.com/Lavya-Gohil/noco-pathfinder'
type Subs = Record<'intake' | 'diagnosis' | 'strategy', number>
const FIRST_STAGES: Subs = { intake: 0, diagnosis: 0, strategy: 0 }

export default function App() {
  const [restored] = useState(loadSession)
  const [step, setStep] = useState<StepId>(restored?.step ?? 'intake')
  const [maxStep, setMaxStep] = useState(restored?.maxStep ?? 0)
  const [subs, setSubs] = useState<Subs>(restored?.subs ?? FIRST_STAGES)
  const [form, setForm] = useState<BuildingForm>(restored?.form ?? EMPTY_FORM)
  const [building, setBuilding] = useState<Building | null>(restored?.analyzedForm ? toBuilding(restored.analyzedForm) : null)
  /** The form values behind `building`, to tell when the results no longer match the form. */
  const [analyzedForm, setAnalyzedForm] = useState<BuildingForm | null>(restored?.analyzedForm ?? null)
  const [scenario, setScenario] = useState<Scenario>(restored?.scenario ?? { budget: 600_000, elecPriceChange: 0, incentiveRate: DEFAULT_INCENTIVE })
  const [selected, setSelected] = useState<PathId>(restored?.selected ?? 'balanced')
  const [tourIndex, setTourIndex] = useState<number | null>(null)
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  // Routes: homepage at the root, the product at #/app, the policy at #/privacy.
  const route: 'home' | 'app' | 'privacy' = hash === '#/privacy' ? 'privacy' : hash.startsWith('#/app') ? 'app' : 'home'
  const showPrivacy = route === 'privacy'
  const enterApp = () => {
    if (window.location.hash !== '#/app') window.location.hash = '#/app'
  }

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step, route])

  useEffect(() => {
    saveSession({ form, analyzedForm: building ? analyzedForm : null, step, maxStep, subs, scenario, selected })
  }, [form, analyzedForm, building, step, maxStep, subs, scenario, selected])

  // Results describe the form as it was analyzed. Once it's edited they're out of date, so
  // the later steps stay locked until the user re-runs the analysis.
  const stale = building !== null && analyzedForm !== null && !sameForm(form, analyzedForm)

  const go = (s: StepId) => {
    enterApp()
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
    setAnalyzedForm(source)
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
    if (st.page !== 'intake' && (!building || stale)) runAnalysis(form)
    if (st.sub !== undefined && st.page !== 'report') setSubs((p) => ({ ...p, [st.page]: st.sub }))
    go(st.page)
    setTourIndex(i)
  }

  const startTour = (from = 0) => {
    if (!sameForm(form, EMPTY_FORM) && !sameForm(form, DEMO_FORM)) {
      const ok = window.confirm('The guided tour loads a sample building and replaces the information in the form. Continue?')
      if (!ok) return
    }
    enterApp()
    setForm(DEMO_FORM)
    setBuilding(null)
    setSubs(FIRST_STAGES)
    setMaxStep(0)
    setStep('intake')
    setTourIndex(from)
  }

  /** The ? button: open the tour chapter for the page you're on. */
  const startHelp = () => {
    if (route !== 'app' || step === 'intake' || !building) return startTour(0)
    tourGo(CHAPTER_START[step])
  }

  /** Logo: back to the first section of the building assessment, keeping all data. */
  const goHome = () => {
    enterApp()
    setSubs((p) => ({ ...p, intake: 0 }))
    setStep('intake')
    window.scrollTo({ top: 0 })
  }

  const tourState: TourState = useMemo(
    () => ({ page: step, subs, budget: scenario.budget, selected }),
    [step, subs, scenario.budget, selected],
  )
  const tourApi: TourApi = {
    setSub: (page, i) => setSubs((p) => ({ ...p, [page]: i })),
    go,
    analyze,
    setBudget: (v) => setScenario((sc) => ({ ...sc, budget: v })),
    home: goHome,
  }

  /** Leave the sample building and start a blank assessment. */
  const startOwn = () => {
    enterApp()
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

  if (route === 'home') {
    return <HomePage onDemo={() => startTour(0)} onStart={startOwn} onLaunch={enterApp} />
  }

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      <Header
        step={step}
        maxStep={building && !stale ? maxStep : 0}
        onNavigate={go}
        buildingName={building?.name}
        onTour={startHelp}
        onHome={goHome}
        inApp={route === 'app'}
      />
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10 print:max-w-none print:p-0">
        {demoLoaded && tourIndex === null && route === 'app' && (
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
        <Suspense fallback={null}>
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
                onStartTour={() => startTour(0)}
                stale={stale}
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
                onImprove={(field) => {
                  setSubs((p) => ({ ...p, intake: field === 'monthly' ? 2 : field === 'hvac' ? 1 : 0 }))
                  go('intake')
                  window.setTimeout(() => document.getElementById(field === 'monthly' ? 'f-monthly' : field === 'hvac' ? 'f-hvacYear' : 'f-yearBuilt')?.focus(), 80)
                }}
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
        </Suspense>
      </main>
      <footer className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 pb-8 text-[12px] text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 print:hidden">
        <span>
          NOCO {PRODUCT} by {MAKER} · {TAGLINE}
          <span className="hidden md:inline"> Illustrative pre-audit estimates; site verification required.</span>
        </span>
        <nav aria-label="Footer" className="flex gap-4">
          <a href="#/privacy" className="hover:text-fg">
            Privacy policy
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-fg">
            GitHub
          </a>
        </nav>
      </footer>

      {tourIndex !== null && route === 'app' && (
        <Tour
          steps={TOUR_STEPS}
          index={tourIndex}
          state={tourState}
          api={tourApi}
          onNext={() => (tourIndex < TOUR_STEPS.length - 1 ? tourGo(tourIndex + 1) : setTourIndex(null))}
          onClose={() => setTourIndex(null)}
          onStartOwn={startOwn}
        />
      )}
    </div>
  )
}
