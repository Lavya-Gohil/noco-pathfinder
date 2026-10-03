import type { StepId } from '../components/Header'

export interface TourStep {
  page: StepId
  /** Stage within the page to show (Building sections, Diagnosis / Strategy stages). */
  sub?: number
  /** `data-tour` attribute of the element to spotlight. */
  target: string
  /** Used when the target is hidden at the current screen size. */
  fallback?: string
  title: string
  body: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    page: 'intake',
    sub: 0,
    target: 'intake-section',
    title: 'Welcome to Pathfinder',
    body: "We've loaded a sample property: Riverside Commerce Center, an 85,000 sq ft office in Buffalo, NY. The assessment is split into four short sections. This one covers the property basics.",
  },
  {
    page: 'intake',
    sub: 0,
    target: 'intake-steps',
    fallback: 'intake-section',
    title: 'One section at a time',
    body: 'Each section is checked before you move on. Completed sections show a short summary, and you can jump back to any of them.',
  },
  {
    page: 'intake',
    sub: 1,
    target: 'intake-section',
    title: 'Building systems',
    body: "Heating and cooling types determine how much an HVAC upgrade can save. If you're not sure, say so. Pathfinder lowers its confidence instead of guessing.",
  },
  {
    page: 'intake',
    sub: 2,
    target: 'intake-section',
    title: 'Energy',
    body: 'Annual bills set the baseline. Adding annual kWh lets Pathfinder use your actual electricity rate instead of a default one.',
  },
  {
    page: 'intake',
    sub: 3,
    target: 'intake-section',
    title: 'Planning',
    body: 'The budget caps every strategy. The objective decides which investment path is marked Recommended.',
  },
  {
    page: 'intake',
    sub: 3,
    target: 'intake-analyze',
    title: 'Run the analysis',
    body: 'Analyze builds an energy profile from these inputs. Select Next and the tour will run it for you.',
  },
  {
    page: 'diagnosis',
    sub: 0,
    target: 'diag-kpis',
    title: 'Energy profile',
    body: 'Annual spend, cost per square foot, electricity use and the overall retrofit opportunity. This is the baseline every upgrade is measured against.',
  },
  {
    page: 'diagnosis',
    sub: 0,
    target: 'diag-breakdown',
    title: 'Where the energy goes',
    body: 'An estimated split of spend by end use. In older offices HVAC and envelope losses dominate, which is exactly where upgrade order matters most.',
  },
  {
    page: 'diagnosis',
    sub: 1,
    target: 'diag-confidence',
    title: 'Data confidence',
    body: 'Pathfinder scores how much it knows about the building and names the single most valuable piece of data to collect next, with the confidence it would add.',
  },
  {
    page: 'diagnosis',
    sub: 2,
    target: 'diag-signals',
    title: 'Preliminary signals',
    body: 'Patterns worth investigating, derived from age, systems and usage. Each one needs site verification before work is scoped.',
  },
  {
    page: 'strategy',
    sub: 0,
    target: 'strategy-paths',
    title: 'Three investment paths',
    body: 'Pathfinder tested all 31 combinations of five upgrades. Quick Wins favors payback, Balanced weighs savings against payback and sequencing, and Deep Retrofit maximizes energy reduction.',
  },
  {
    page: 'strategy',
    sub: 0,
    target: 'strategy-budget',
    title: 'Budget drives the paths',
    body: 'Try dragging the budget. Every path is re-optimized instantly. At higher budgets, Deep Retrofit adds controls and rooftop solar.',
  },
  {
    page: 'strategy',
    sub: 1,
    target: 'strategy-roadmap',
    title: 'The roadmap',
    body: 'Phases run in dependency order: reduce loads first, then replace equipment sized to the smaller load, then add generation. Each phase shows its net cost and the savings it adds.',
  },
  {
    page: 'strategy',
    sub: 2,
    target: 'strategy-why',
    title: 'Why order matters',
    body: 'Improving the envelope and lighting first lowers the heating and cooling load, so replacement HVAC can be smaller. This comparison shows what that is worth for this building.',
  },
  {
    page: 'strategy',
    sub: 3,
    target: 'strategy-scenarios',
    title: 'What if?',
    body: 'Test electricity price changes and incentive assumptions. Paths, roadmap and payback all update immediately.',
  },
  {
    page: 'strategy',
    sub: 4,
    target: 'strategy-table',
    title: 'Compare measures',
    body: 'Each upgrade on its own, before interactions. Select a measure to see its assumptions, interactions and what needs site verification.',
  },
  {
    page: 'strategy',
    sub: 4,
    target: 'strategy-assumptions',
    title: 'Assumptions',
    body: 'Every rate, factor and interaction rule behind the numbers is listed here.',
  },
  {
    page: 'report',
    target: 'report-doc',
    title: 'Executive report',
    body: 'A printable summary for owners and stakeholders: recommended sequence, financials, confidence and next steps.',
  },
  {
    page: 'report',
    target: 'report-print',
    title: "You're all set",
    body: 'Print the report or save it as a PDF. Ready to try it? Start an assessment for your own building, or keep exploring the sample. The ? button in the header replays this tour.',
  },
]
