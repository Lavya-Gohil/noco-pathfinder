import type { PlanResult } from '../engine/interactions'
import { MEASURES } from '../engine/measures'
import type { MeasureId } from '../types'
import { money, years } from '../utils/format'
import { Bullets, Drawer, DrawerSection } from './Overlay'
import { ConfidenceText } from './ui'

export function MeasureDrawer({
  id,
  single,
  plan,
  planName,
  onClose,
}: {
  id: MeasureId | null
  single: PlanResult | null
  plan: PlanResult | null
  planName: string
  onClose: () => void
}) {
  const m = id ? MEASURES[id] : null
  const s = single?.steps[0]
  const inPlan = plan && id ? plan.steps.find((x) => x.id === id) : undefined
  if (!m || !s || !single) return null

  const rows: [string, string, string?][] = [
    ['Gross cost', money(s.gross)],
    ['Potential incentive', `−${money(s.incentive)}`],
    ['Net cost', money(s.net)],
    ['Annual savings', `${money(single.annualSavings)}/yr`],
    ['Simple payback', years(single.payback)],
  ]

  return (
    <Drawer
      open
      onClose={onClose}
      title={m.name}
      subtitle={
        <span className="flex items-center gap-2">
          {m.tier} · <ConfidenceText level={s.confidence} /> confidence
        </span>
      }
    >
      <DrawerSection title="Stand-alone estimate">
        <dl className="divide-y divide-line text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5">
              <dt className="text-fg-2">{k}</dt>
              <dd className="tnum text-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[12px] text-fg-3">Potential incentive — eligibility requires verification.</p>
        {inPlan && plan && (
          <p className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-[13px] text-fg">
            Phase {inPlan.phase} of the {planName} path:{' '}
            <span className="tnum font-medium">{money(inPlan.net)}</span> net,{' '}
            <span className="tnum font-medium">{money(inPlan.annualSavings)}/yr</span> after interactions.
          </p>
        )}
      </DrawerSection>

      <DrawerSection title="Why it could help">
        <p className="text-[13px] leading-relaxed text-fg">{m.whyItHelps}</p>
      </DrawerSection>

      <DrawerSection title="Main assumptions">
        <Bullets items={m.assumptions} />
      </DrawerSection>

      <DrawerSection title="Interaction with other measures">
        <Bullets items={m.interactions} />
        {inPlan && inPlan.effects.some((e) => e.capitalImpact > 1 || e.savingsImpact < -1) && (
          <dl className="mt-3 divide-y divide-line border-t border-line text-[13px]">
            {inPlan.effects
              .filter((e) => e.capitalImpact > 1 || e.savingsImpact < -1)
              .map((e, i) => (
                <div key={i} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-fg-2">{e.title}</dt>
                  <dd className="tnum shrink-0 text-fg">
                    {e.capitalImpact > 1 ? `−${money(e.capitalImpact)} cost` : `−${money(-e.savingsImpact)}/yr overlap`}
                  </dd>
                </div>
              ))}
          </dl>
        )}
      </DrawerSection>

      <DrawerSection title="Requires site verification">
        <Bullets items={m.verification} />
      </DrawerSection>
    </Drawer>
  )
}
