import { useEffect, useMemo, useState } from 'react'
import { Header, type StepId } from './components/Header'
import { buildBaseline } from './engine/baseline'
import { dataConfidence } from './engine/confidence'
import { opportunityLabel, signals } from './engine/explanations'
import { optimize, recommendedPath } from './engine/optimizer'
import { DiagnosisPage } from './pages/DiagnosisPage'
import { IntakePage } from './pages/IntakePage'
import { ReportPage } from './pages/ReportPage'
import { StrategyPage } from './pages/StrategyPage'
import type { Building, BuildingForm, PathId, Scenario } from './types'
import { EMPTY_FORM, toBuilding } from './utils/building'

const ORDER: StepId[] = ['intake', 'diagnosis', 'strategy', 'report']
const DEFAULT_INCENTIVE = 0.15

export default function App() {
  const [step, setStep] = useState<StepId>('intake')
  const [maxStep, setMaxStep] = useState(0)
  const [form, setForm] = useState<BuildingForm>(EMPTY_FORM)
  const [building, setBuilding] = useState<Building | null>(null)
  const [scenario, setScenario] = useState<Scenario>({ budget: 250_000, elecPriceChange: 0, incentiveRate: DEFAULT_INCENTIVE })
  const [selected, setSelected] = useState<PathId>('balanced')

  const go = (s: StepId) => {
    const i = ORDER.indexOf(s)
    setStep(s)
    setMaxStep((m) => Math.max(m, i))
  }

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

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

  const analyze = () => {
    const b = toBuilding(form)
    setBuilding(b)
    setScenario({ budget: b.budget, elecPriceChange: 0, incentiveRate: DEFAULT_INCENTIVE })
    setSelected(recommendedPath(b.objective))
    setMaxStep(1)
    go('diagnosis')
  }

  const strategy = result?.strategies.find((s) => s.id === selected) ?? null

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      <Header step={step} maxStep={building ? maxStep : 0} onNavigate={go} buildingName={building?.name} />
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10 print:max-w-none print:p-0">
        {step === 'intake' && <IntakePage form={form} setForm={setForm} onSubmit={analyze} />}
        {step === 'diagnosis' && diagBase && confidence && diagnosis && (
          <DiagnosisPage
            base={diagBase}
            confidence={confidence}
            opportunity={diagnosis.opportunity}
            signals={diagnosis.signals}
            onNext={() => go('strategy')}
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
          />
        )}
        {step === 'report' && base && strategy && confidence && (
          <ReportPage base={base} strategy={strategy} confidence={confidence} scenario={scenario} onBack={() => go('strategy')} />
        )}
      </main>
      <footer className="mx-auto max-w-[1320px] px-4 pb-8 text-[12px] text-fg-3 sm:px-6 lg:px-8 print:hidden">
        NOCO Pathfinder · Illustrative pre-audit estimates. Site verification required.
      </footer>
    </div>
  )
}
