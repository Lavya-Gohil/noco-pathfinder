import { DEMO_FORM, EMPTY_FORM, toBuilding, validate } from '../src/utils/building'
import { buildBaseline } from '../src/engine/baseline'
import { dataConfidence } from '../src/engine/confidence'

const cases = {
  'demo (all data)': DEMO_FORM,
  'demo without monthly + HVAC year': { ...DEMO_FORM, monthly: Array(12).fill(''), hvacYear: '' },
  'demo with monthly, no annual kWh': { ...DEMO_FORM, kwh: '' },
  'basics only (no kWh, unsure systems)': { ...DEMO_FORM, kwh: '', monthly: Array(12).fill(''), hvacYear: '', heating: 'Not Sure', cooling: 'Not Sure', yearBuilt: '' },
} as const
for (const [name, f] of Object.entries(cases)) {
  const errs = validate(f as typeof DEMO_FORM)
  const b = toBuilding(f as typeof DEMO_FORM)
  const base = buildBaseline(b, 0)
  const c = dataConfidence(b)
  console.log(`${name}: ${c.score}% ${c.level} → next "${c.next.label}" +${c.next.gain} (${c.next.scoreAfter}%) | kWh ${Math.round(base.elecKwh)} cooling ${(base.coolingShare * 100).toFixed(1)}% measured=${base.coolingMeasured} | errors: ${Object.keys(errs).join(',') || 'none'}`)
}
console.log('monthly sum', DEMO_FORM.monthly.reduce((a, v) => a + Number(v), 0))
const bad = validate({ ...EMPTY_FORM, ...DEMO_FORM, monthly: ['1000', ...Array(11).fill('')] })
console.log('partial months error:', bad.monthly)
