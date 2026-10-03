import type { ReactNode } from 'react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/ui'

const UPDATED = 'October 3, 2026'
const REPO = 'https://github.com/Lavya-Gohil/noco-pathfinder'
const GITHUB_PRIVACY = 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement'

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'summary',
    title: 'Summary',
    body: (
      <>
        <p>
          NOCO Pathfinder runs entirely in your web browser. The building details and utility costs you enter are used
          only to calculate estimates on your device. They are not sent to us or to any server, and we do not keep a
          copy.
        </p>
        <p>There are no accounts, no cookies, no analytics, no advertising and no third-party tracking scripts.</p>
      </>
    ),
  },
  {
    id: 'information',
    title: 'Information you enter',
    body: (
      <>
        <p>
          The assessment asks for building information such as name, location, size, age, heating and cooling systems,
          annual utility costs, electricity usage, budget and objectives. This information:
        </p>
        <ul>
          <li>is processed in your browser's memory to produce the diagnosis, strategy and report;</li>
          <li>is not transmitted over the network;</li>
          <li>is cleared when you reload or close the page.</li>
        </ul>
        <p>Please avoid entering personal information about individuals. The tool does not need it.</p>
      </>
    ),
  },
  {
    id: 'device',
    title: 'Information stored on your device',
    body: (
      <>
        <p>
          If you choose a light or dark theme, that preference is saved in your browser's local storage under the key{' '}
          <code>noco-theme</code> so it persists between visits. Choosing "System" removes it. Nothing else is stored.
        </p>
        <p>You can clear this at any time through your browser's site data settings.</p>
      </>
    ),
  },
  {
    id: 'hosting',
    title: 'Hosting',
    body: (
      <p>
        This site is hosted on GitHub Pages. To deliver the site, GitHub may process technical information such as your
        IP address in its server logs. That processing is governed by the{' '}
        <a href={GITHUB_PRIVACY} target="_blank" rel="noreferrer">
          GitHub General Privacy Statement
        </a>
        . Fonts and all other assets are served from the same site; no external content networks are used.
      </p>
    ),
  },
  {
    id: 'reports',
    title: 'Reports you print or save',
    body: (
      <p>
        The executive report is generated in your browser. When you print it or save it as a PDF, the resulting file is
        under your control and is not shared with us.
      </p>
    ),
  },
  {
    id: 'children',
    title: "Children's privacy",
    body: <p>Pathfinder is a business tool and is not directed at children.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If the way Pathfinder handles information changes, this page will be updated and the date at the top will
        change. Material changes, such as any server-side storage, would be described here before taking effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about this policy can be raised by opening an issue on the project's{' '}
        <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
          GitHub repository
        </a>
        .
      </p>
    ),
  },
]

export function PrivacyPage() {
  return (
    <div>
      <a href="#/" className="neu-btn mb-6 inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Pathfinder
      </a>
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description={`Last updated ${UPDATED}. How NOCO Pathfinder handles the information you provide.`}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="neu-raised hidden self-start rounded-2xl p-4 lg:sticky lg:top-24 lg:block">
          <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.07em] text-fg-2">On this page</div>
          <ol className="space-y-0.5 text-[13px]">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#/privacy`} onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }} className="flex gap-2 rounded-lg px-2 py-1.5 text-fg-2 hover:text-fg">
                  <span className="tnum w-4 text-fg-3">{i + 1}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="neu-raised rounded-2xl px-6 py-8 sm:px-10">
          <div className="neu-inset mb-8 flex items-start gap-3 rounded-2xl px-5 py-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-text" aria-hidden />
            <p className="text-[14px] leading-relaxed text-fg">
              <span className="font-semibold">Your building data never leaves your device.</span> Pathfinder has no
              backend, database or analytics.
            </p>
          </div>
          <div className="space-y-9">
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="flex items-baseline gap-2 text-[17px] font-semibold text-fg">
                  <span className="tnum text-[13px] font-medium text-fg-3">{i + 1}.</span>
                  {s.title}
                </h2>
                <div className="mt-2.5 space-y-3 text-[14px] leading-relaxed text-fg-2 [&_a]:font-medium [&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
