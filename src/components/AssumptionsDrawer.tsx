import { GAS_PRICE_PER_THERM, GAS_T_PER_THERM, GRID_T_PER_KWH, type Baseline } from '../engine/baseline'
import {
  CONTROLS_HVAC_OVERLAP,
  ENVELOPE_LOAD_REDUCTION,
  LED_LOAD_REDUCTION,
  MAX_SAVINGS_SHARE,
  SOLAR_MAX_SHARE,
  SOLAR_TARGET_SHARE,
} from '../engine/interactions'
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
            ['Electricity', `${money(b.elecCost)} · ${base.kwhEstimated ? 'kWh not provided' : `${num(b.kwh)} kWh`}`],
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
            ['Cooling capacity', `~${num(base.designTons)} tons`],
            ['Usable roof for solar', `~${num(base.roofKw)} kW`],
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Interaction adjustments">
        <Bullets
          items={[
            <>Each phase saves energy from the load left by earlier phases, never from the original baseline.</>,
            <>Envelope before HVAC: design load −{pct(ENVELOPE_LOAD_REDUCTION)}, so HVAC cost falls by the same share.</>,
            <>LED before HVAC: less lighting heat; capacity −{pct(LED_LOAD_REDUCTION)} and HVAC cooling savings adjusted down.</>,
            <>Controls with new HVAC: HVAC-related control savings × {CONTROLS_HVAC_OVERLAP} for overlap.</>,
            <>Solar sized to {pct(SOLAR_TARGET_SHARE)} of remaining demand (cap {pct(SOLAR_MAX_SHARE)}), within roof limits.</>,
            <>Combined savings capped at {pct(MAX_SAVINGS_SHARE)} of annual utility spend.</>,
            <>Balanced path requires every phase to pay back within {BALANCED_MAX_STEP_PAYBACK} years.</>,
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
            'Contractor pricing for each scope',
          ]}
        />
      </DrawerSection>
    </Drawer>
  )
}
