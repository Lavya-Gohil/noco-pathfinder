import type { StepId } from '../components/Header'
import type { PathId } from '../types'

export const CHAPTERS = ['Building assessment', 'Diagnosis', 'Strategy', 'Report'] as const

/** What the tour can observe about the app to know when a task is done. */
export interface TourState {
  page: StepId
  subs: { intake: number; diagnosis: number; strategy: number }
  budget: number
  selected: PathId
}

/** What "Do it for me" is allowed to do. */
export interface TourApi {
  setSub: (page: 'intake' | 'diagnosis' | 'strategy', i: number) => void
  go: (page: StepId) => void
  analyze: () => void
  setBudget: (v: number) => void
  home: () => void
}

export interface TourStep {
  chapter: number
  page: StepId
  /** Stage within the page the step starts on. */
  sub?: number
  /** `data-tour` attribute of the element to spotlight. */
  target: string
  /** Used when the target is hidden at the current screen size. */
  fallback?: string
  title: string
  body: string
  /** The user's task. Steps with a task advance when it is done instead of on "Next". */
  task?: string
  /** Task is done when this returns true. */
  until?: (s: TourState) => boolean
  /** Task is done when the user clicks inside / changes an input inside the target. */
  advanceOn?: 'click' | 'input'
  /** "Do it for me". Defaults to clicking the target. */
  perform?: (api: TourApi) => void
  /** Pause (hide) the tour while this element exists, e.g. an open detail panel. */
  waitWhile?: string
  final?: boolean
}

export const TOUR_STEPS: TourStep[] = [
  // ---- Chapter 1 · Building assessment ----
  {
    chapter: 0,
    page: 'intake',
    sub: 0,
    target: 'intake-section',
    title: 'Welcome to Asset IQ',
    body: "We've loaded a sample office in Buffalo, NY. This tour has four short chapters, and you do the clicking. First up: the building assessment, one section at a time.",
  },
  {
    chapter: 0,
    page: 'intake',
    sub: 0,
    target: 'intake-continue',
    title: 'Move section by section',
    body: 'Each section is checked before you can move on, so problems surface early.',
    task: 'Click Continue to building systems.',
    until: (s) => s.subs.intake >= 1,
    perform: (api) => api.setSub('intake', 1),
  },
  {
    chapter: 0,
    page: 'intake',
    sub: 1,
    target: 'intake-steps',
    fallback: 'intake-steps-mobile',
    title: 'Jump between sections',
    body: 'Finished sections show a short summary. You can jump to any section once the ones before it are complete.',
    task: 'Select Planning (step 4) in the section list.',
    until: (s) => s.subs.intake === 3,
    perform: (api) => api.setSub('intake', 3),
  },
  {
    chapter: 0,
    page: 'intake',
    sub: 3,
    target: 'intake-analyze',
    title: 'Run the analysis',
    body: 'The budget caps every strategy, and the objective decides which path is marked Recommended.',
    task: 'Click Analyze building.',
    until: (s) => s.page === 'diagnosis',
    perform: (api) => api.analyze(),
  },

  // ---- Chapter 2 · Diagnosis ----
  {
    chapter: 1,
    page: 'diagnosis',
    sub: 0,
    target: 'diag-kpis',
    title: 'Your energy profile',
    body: 'Annual spend, cost per square foot, electricity use and the overall retrofit opportunity. Every upgrade is measured against this baseline.',
  },
  {
    chapter: 1,
    page: 'diagnosis',
    sub: 0,
    target: 'diag-stages',
    title: 'Check the data confidence',
    body: 'Diagnosis has three stages. You can open any of them from this bar.',
    task: 'Open the Data confidence stage.',
    until: (s) => s.subs.diagnosis === 1,
    perform: (api) => api.setSub('diagnosis', 1),
  },
  {
    chapter: 1,
    page: 'diagnosis',
    sub: 1,
    target: 'diag-confidence',
    title: 'Know what to collect next',
    body: 'Asset IQ scores how much it knows about the building and names the single most valuable data point to collect, with the confidence it would add.',
  },
  {
    chapter: 1,
    page: 'diagnosis',
    sub: 1,
    target: 'diag-next',
    title: 'Preliminary signals',
    body: 'Signals are patterns worth verifying on site, based on age, systems and usage.',
    task: 'Click Continue to signals.',
    until: (s) => s.subs.diagnosis === 2,
    perform: (api) => api.setSub('diagnosis', 2),
  },
  {
    chapter: 1,
    page: 'diagnosis',
    sub: 2,
    target: 'diag-next',
    title: 'On to strategy',
    body: "That's the diagnosis. Next, Asset IQ turns it into investment paths.",
    task: 'Click Build my retrofit strategy.',
    until: (s) => s.page === 'strategy',
    perform: (api) => {
      api.setSub('strategy', 0)
      api.go('strategy')
    },
  },

  // ---- Chapter 3 · Strategy ----
  {
    chapter: 2,
    page: 'strategy',
    sub: 0,
    target: 'strategy-paths',
    title: 'Three investment paths',
    body: 'Asset IQ tested all 31 combinations of five upgrades and picked the best plan for each goal: fastest payback, balanced, and deepest reduction.',
  },
  {
    chapter: 2,
    page: 'strategy',
    sub: 0,
    target: 'strategy-budget',
    title: 'Budget drives everything',
    body: 'Every path is re-optimized the moment the budget changes. At higher budgets, Deep Retrofit adds controls and rooftop solar.',
    task: 'Drag the budget slider and watch the paths change.',
    advanceOn: 'input',
    perform: (api) => api.setBudget(600_000),
  },
  {
    chapter: 2,
    page: 'strategy',
    sub: 0,
    target: 'strategy-next',
    title: 'See the roadmap',
    body: 'The roadmap follows whichever path card is selected. Pick a different card first if you like.',
    task: 'Click Continue to roadmap.',
    until: (s) => s.subs.strategy === 1,
    perform: (api) => api.setSub('strategy', 1),
  },
  {
    chapter: 2,
    page: 'strategy',
    sub: 1,
    target: 'strategy-stages',
    title: 'Why the order matters',
    body: 'Phases run in dependency order: reduce loads first, then size equipment to the smaller load, then add generation.',
    task: 'Open the Why this order stage.',
    until: (s) => s.subs.strategy === 2,
    perform: (api) => api.setSub('strategy', 2),
  },
  {
    chapter: 2,
    page: 'strategy',
    sub: 2,
    target: 'strategy-why',
    title: 'Sequencing pays',
    body: 'Improving the envelope and lighting first shrinks the HVAC system the building needs. This comparison shows what that is worth here.',
  },
  {
    chapter: 2,
    page: 'strategy',
    sub: 2,
    target: 'strategy-stages',
    title: 'Compare the upgrades',
    body: 'Scenarios lets you test energy prices and incentives any time. Next, the individual upgrades.',
    task: 'Open the Compare measures stage.',
    until: (s) => s.subs.strategy === 4,
    perform: (api) => api.setSub('strategy', 4),
  },
  {
    chapter: 2,
    page: 'strategy',
    sub: 4,
    target: 'strategy-table',
    title: 'Inspect an upgrade',
    body: 'Each measure lists its assumptions, how it interacts with the others, and what needs site verification.',
    task: 'Click any measure in the table. Close the panel when you are done.',
    advanceOn: 'click',
    perform: () => document.querySelector<HTMLElement>('[data-tour="strategy-table"] tbody button')?.click(),
  },
  {
    chapter: 2,
    page: 'strategy',
    sub: 4,
    target: 'strategy-next',
    title: 'Create the report',
    body: 'Everything you chose on this page flows into a printable report.',
    task: 'Click Generate executive report.',
    until: (s) => s.page === 'report',
    perform: (api) => api.go('report'),
    waitWhile: '[role="dialog"][aria-modal="true"]',
  },

  // ---- Chapter 4 · Report ----
  {
    chapter: 3,
    page: 'report',
    target: 'report-doc',
    title: 'Your executive report',
    body: 'A summary for owners and stakeholders: the recommended sequence, financials, confidence and next steps. Print it or save it as a PDF.',
  },
  {
    chapter: 3,
    page: 'report',
    target: 'brand-home',
    title: 'Back to the start',
    body: 'The Asset IQ logo always takes you back to the building assessment. Your data stays loaded.',
    task: 'Click the Asset IQ logo.',
    until: (s) => s.page === 'intake' && s.subs.intake === 0,
    perform: (api) => api.home(),
  },
  {
    chapter: 3,
    page: 'intake',
    sub: 0,
    target: 'intake-section',
    title: "You're all set",
    body: "You've seen every part of Asset IQ. Start an assessment for your own building, or keep exploring the sample. The ? button opens the chapter for whichever page you're on.",
    final: true,
  },
]

/** First step of each chapter, keyed by page, for contextual help. */
export const CHAPTER_START: Record<StepId, number> = {
  intake: TOUR_STEPS.findIndex((s) => s.chapter === 0),
  diagnosis: TOUR_STEPS.findIndex((s) => s.chapter === 1),
  strategy: TOUR_STEPS.findIndex((s) => s.chapter === 2),
  report: TOUR_STEPS.findIndex((s) => s.chapter === 3),
}
