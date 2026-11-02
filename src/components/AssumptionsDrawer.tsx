import { GAS_PRICE_PER_THERM, GAS_T_PER_THERM, GRID_T_PER_KWH, type Baseline } from '../engine/baseline'
import {
  ANALYSIS_YEARS,
  CONTROLS_HVAC_OVERLAP,
  CONTROLS_RECOMMISSION_SHARE,
  DISCOUNT_RATE,
  HVAC_SCALABLE_COST_SHARE,
  LED_LOAD_REDUCTION,
  MAX_SAVINGS_SHARE,
  SOLAR_TARGET_SHARE,
} from '../engine/interactions'
import { HVAC_SERVICE_LIFE, SOLAR_BILL_VALUE, envelopeLoadReduction } from '../engine/measures'
import { BALANCED_MAX_STEP_PAYBACK } from '../engine/optimizer'
import type { Scenario } from '../types'
import { money, num, pct, signedPct } from '../utils/format'
import { Bullets, Drawer, DrawerSection } from './Overlay'

function KV({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-line text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-fg-2">{k}</dt>
          <dd className="tnum text-right text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function AssumptionsDrawer({
  open,
  onClose,
  base,
  scenario,
}: {
  open: boolean
  onClose: () => void
  base: Baseline
  scenario: Scenario
}) {
  const b = base.building
  return (
    <Drawer open={open} onClose={onClose} title="Assumptions" subtitle="Illustrative pre-audit estimates, not an energy audit.">
      <DrawerSection title="Inputs used">
        <KV
          rows={[
            ['Building', `${b.type}, ${num(b.sqft)} sq ft`],
            ['Year built', b.yearBuilt ? String(b.yearBuilt) : 'Not provided (1990 assumed)'],
            ['Systems', `${b.heating} / ${b.cooling}`],
            ['Electricity', `${money(b.elecCost)} · ${base.kwhEstimated ? 'kWh not provided' : `${num(base.elecKwh)} kWh`}`],
            ['Monthly usage', b.monthlyKwh ? '12 months provided' : 'Not provided'],
            ['HVAC equipment installed', b.hvacYear ? String(b.hvacYear) : 'Not provided (building age used)'],
            ['Heating', money(b.heatCost)],
            ['Budget (scenario)', money(scenario.budget)],
            ['Electricity price change', signedPct(scenario.elecPriceChange)],
            ['Incentive assumption', `${pct(scenario.incentiveRate)} of gross cost`],
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Estimates">
        <KV
          rows={[
            ['Climate zone', `${base.climate[0].toUpperCase()}${base.climate.slice(1)} (${b.state})`],
            ['Electricity rate', `$${base.elecPrice.toFixed(3)}/kWh${base.kwhEstimated ? ' (default)' : ''}`],
            ['Natural gas', base.heatFuel === 'gas' ? `$${GAS_PRICE_PER_THERM.toFixed(2)}/therm` : 'Electric heat'],
            ['Grid emissions', `${(GRID_T_PER_KWH * 1000).toFixed(2)} t CO₂e/MWh`],
            ['Gas emissions', `${GAS_T_PER_THERM} t CO₂e/therm`],
            ['Cooling share of electricity', `${pct(base.coolingShare)} (${base.coolingMeasured ? 'measured from summer bills' : 'estimated from building type'})`],
            ['Cooling capacity', `~${num(base.designTons)} tons`],
            ['Usable roof for solar', `~${num(base.roofKw)} kW`],
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Interaction adjustments">
        <Bullets
          items={[
            <>Each phase saves energy from the load left by earlier phases, never from the original baseline.</>,
            <>Phases are one year apart. Each order is valued over {ANALYSIS_YEARS} years at a {pct(DISCOUNT_RATE)} discount rate, and the most valuable one wins.</>,
            <>Envelope before HVAC: design load −{pct(envelopeLoadReduction(base))} for this building. {pct(HVAC_SCALABLE_COST_SHARE)} of HVAC cost scales with capacity.</>,
            <>LED before HVAC: less lighting heat; capacity −{pct(LED_LOAD_REDUCTION)} and HVAC cooling savings adjusted down. The lost heat adds some winter heating.</>,
            <>Controls with new HVAC: HVAC-related control savings × {CONTROLS_HVAC_OVERLAP} for overlap. If controls go first, {pct(CONTROLS_RECOMMISSION_SHARE)} of their cost is spent again.</>,
            <>Solar sized to {pct(SOLAR_TARGET_SHARE)} of the demand left after the other upgrades, within roof limits, and valued at {pct(SOLAR_BILL_VALUE)} of the electricity price.</>,
            <>Combined savings capped at {pct(MAX_SAVINGS_SHARE)} of annual utility spend.</>,
            <>Balanced path keeps every phase within a {BALANCED_MAX_STEP_PAYBACK}-year payback whenever the budget allows such a plan, and says so when it doesn't. HVAC past {HVAC_SERVICE_LIFE} years is exempt, since it needs replacing regardless.</>,
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Requires verification">
        <Bullets
          items={[
            '12 months of interval or monthly utility data',
            'HVAC nameplate data: age, capacity, efficiency',
            'Insulation levels, air leakage and roof condition',
            'Lighting inventory and operating hours',
            'Roof structure, shading and interconnection rules for solar',
            'Incentive eligibility and current program terms',
            'Contractor pricing for each scope. Costs here are planning figures and vary widely by region',
          ]}
        />
      </DrawerSection>
    </Drawer>
  )
}
