// The five retrofit measures: descriptive metadata plus the stand-alone cost
// and savings coefficients. How measures affect each other lives in
// interactions.ts — this file only knows about one measure at a time.

import type { BuildingType, ConfidenceLevel, MeasureId } from '../types'
import { CURRENT_YEAR, TYPE_PROFILES, type Baseline } from './baseline'

export const MEASURE_IDS: MeasureId[] = ['envelope', 'led', 'hvac', 'controls', 'solar']

export type MeasureTier = 'Load reduction' | 'Systems' | 'Optimization' | 'Generation'

export interface MeasureMeta {
  id: MeasureId
  name: string
  short: string
  tier: MeasureTier
  tagline: string
  whyItHelps: string
  assumptions: string[]
  verification: string[]
  interactions: string[]
}

export const MEASURES: Record<MeasureId, MeasureMeta> = {
  envelope: {
    id: 'envelope',
    name: 'Envelope + Insulation',
    short: 'Envelope',
    tier: 'Load reduction',
    tagline: 'Air sealing, roof insulation and weatherization',
    whyItHelps:
      'Reduces the heat the building loses in winter and gains in summer. Every unit of heating and cooling demand removed here is a unit the HVAC system never has to produce — or be sized for.',
    assumptions: [
      'Air sealing at about $0.40 per sq ft of floor, plus roof insulation at about $2.00 per sq ft of roof, adjusted for building age.',
      'Heating savings of 7–26% depending on vintage and climate zone.',
      'Cooling savings of 6–9% depending on climate zone.',
      'Reduces design heating/cooling load by 3–15%, in proportion to those savings.',
    ],
    verification: [
      'Blower-door or infrared survey to locate actual air leakage.',
      'Existing roof and wall insulation levels.',
      'Roof condition and remaining life (insulation is cheapest at re-roofing).',
    ],
    interactions: [
      'Done before HVAC, it lowers the design load so new equipment can be smaller and somewhat cheaper. Older buildings gain the most.',
      'Reduces the remaining heating/cooling energy that HVAC and controls can save, so their savings are adjusted down to avoid double counting.',
    ],
  },
  led: {
    id: 'led',
    name: 'LED Lighting',
    short: 'LED',
    tier: 'Load reduction',
    tagline: 'Full LED retrofit with occupancy-ready fixtures',
    whyItHelps:
      'Lighting is one of the largest and most predictable electric loads. LED retrofits cut lighting energy roughly in half and also reduce the heat lights put into the space.',
    assumptions: [
      'Fixture retrofit at $1.00–$1.75 per sq ft depending on building type: more than relamping, less than a full lighting redesign.',
      'Lighting energy reduced 50% for pre-2010 fixtures, 35% otherwise.',
      'Lighting share of electricity estimated from building type and vintage.',
      'About 12% of lighting savings also reduce cooling load (climate-adjusted).',
      'Lights also give off heat, so heating use rises slightly in winter: most in cold climates, and it is taken off the savings.',
    ],
    verification: [
      'Fixture count, lamp types and existing wattage.',
      'Operating hours by space type.',
      'Whether any areas have already been retrofitted.',
    ],
    interactions: [
      'Lower internal heat gain slightly reduces cooling load and future HVAC capacity (~2%), but adds a little heating demand.',
      'HVAC cooling savings are reduced accordingly so the same kWh is never counted twice.',
    ],
  },
  hvac: {
    id: 'hvac',
    name: 'High-Efficiency HVAC',
    short: 'HVAC',
    tier: 'Systems',
    tagline: 'Right-sized high-efficiency heating and cooling equipment',
    whyItHelps:
      'Older rooftop units and furnaces often run well below today\'s efficiency standards. New equipment cuts heating and cooling energy — and if loads are reduced first, it can be bought smaller.',
    assumptions: [
      'Cost based on design capacity (tons) at $1,500–$3,000 per ton installed, a planning figure well short of a quote.',
      'Design capacity estimated from floor area, building type and climate zone.',
      'Heating efficiency gain of 7–58% depending on the existing system and its age (largest for electric resistance).',
      'Cooling efficiency gain of 11–32% depending on the existing system and its age.',
      'Carried at full replacement cost. If the equipment is due for replacement anyway, the true cost of choosing higher efficiency is lower.',
      'Equipment under 10 years old is not recommended for replacement, unless it is electric resistance heat.',
    ],
    verification: [
      'Nameplate data: age, capacity and efficiency of existing units.',
      'Load calculation after any envelope work.',
      'Structural, electrical and gas service capacity.',
    ],
    interactions: [
      'Sized after envelope and LED improvements, capacity drops. About 70% of the cost scales with capacity, so cost falls less than capacity does.',
      'Savings are calculated on the remaining load, not the original baseline.',
      'Overlaps with smart controls — combined savings are reduced by an overlap factor.',
    ],
  },
  controls: {
    id: 'controls',
    name: 'Smart Building Controls',
    short: 'Controls',
    tier: 'Optimization',
    tagline: 'Scheduling, setbacks and automated HVAC/lighting control',
    whyItHelps:
      'Many buildings heat, cool and light empty space. Controls align operation with occupancy at low capital cost, so savings start almost immediately.',
    assumptions: [
      'Cost of $0.75–$1.25 per sq ft depending on building type, in line with retro-commissioning rather than a full controls replacement.',
      '12% of remaining HVAC energy, 6% of lighting and 3% of plug loads.',
      'Savings applied after other measures in the plan.',
    ],
    verification: [
      'Existing building automation system and thermostat types.',
      'Actual occupancy schedules and current setpoints.',
      'Network / integration requirements.',
    ],
    interactions: [
      'When paired with new HVAC, a 20% overlap factor is applied to HVAC-related control savings because modern equipment already includes some of the same control capability.',
      'If installed before new HVAC, about a quarter of the cost is spent again to recommission controls on the new equipment.',
    ],
  },
  solar: {
    id: 'solar',
    name: 'Rooftop Solar',
    short: 'Solar',
    tier: 'Generation',
    tagline: 'Rooftop PV sized to post-efficiency demand',
    whyItHelps:
      'Generates electricity on site to offset purchases from the grid. Most cost-effective once efficiency measures have reduced the load it needs to serve.',
    assumptions: [
      'Sized to offset ~35% of annual electricity use after the other upgrades in the plan.',
      'Limited by usable roof area (60% of roof, ~14 W per sq ft).',
      'Installed cost of $2.35 per watt (illustrative).',
      'Annual production of 1,150–1,550 kWh per kW depending on climate zone.',
      'Each kWh is valued at 70% of the average electricity price, because solar does little to reduce demand charges.',
    ],
    verification: [
      'Structural roof capacity and remaining roof life.',
      'Shading analysis and roof orientation.',
      'Utility interconnection and net-metering rules.',
    ],
    interactions: [
      'Sized to the demand left after the other upgrades in the plan. A smaller array costs less and also generates less, so this is not a saving in itself.',
    ],
  },
}

// ---- Cost and savings coefficients (stand-alone, before interactions) ----
//
// Planning figures for a pre-audit screen, not quotes. They vary a lot by region and
// scope, so see docs/assumptions.md for the source and quality of each one.

/** Fixture retrofit, per sq ft of floor. Seattle 2022: $0.08–0.12 relamp, $4–6 full redesign. */
const LED_COST: Record<BuildingType, number> = { Office: 1.5, Warehouse: 1, Retail: 1.75, School: 1.5, Multifamily: 1 }
/** Per sq ft of floor. Seattle 2022: envelope sealing $0.22–0.54. */
const ENV_SEAL_COST = 0.4
/** Per sq ft of roof. Seattle 2022: roof insulation $0.19–3.86. */
const ENV_ROOF_COST = 2
/** Per sq ft of floor. Seattle 2022: tune-up $0.13–0.24, retro-commissioning $0.50–2.00. */
const CTRL_COST: Record<BuildingType, number> = { Office: 1.25, Warehouse: 0.75, Retail: 1, School: 1.25, Multifamily: 0.9 }

/** LBNL Tracking the Sun: non-residential medians of about $2.20–3.00/W (2017–2018 data, still falling by 2020). */
export const SOLAR_COST_PER_W = 2.35
/**
 * Share of the average electricity price a solar kWh actually avoids. Demand charges are
 * 30–70% of a commercial bill (NREL 2017), and solar cut them by a median of 7–19% in the
 * NREL/LBNL study. With demand at about a third of the bill: 0.67 + 0.33 × 0.1 ≈ 0.7.
 */
export const SOLAR_BILL_VALUE = 0.7

/** Equipment younger than this isn't worth replacing for energy savings alone. */
export const HVAC_MIN_AGE = 10
/** Equipment this old is due for replacement whatever the energy savings. */
export const HVAC_SERVICE_LIFE = 20

/** Years since the HVAC equipment was installed; building age stands in if unknown. */
export function hvacAge(base: Baseline): number | null {
  const year = base.building.hvacYear ?? base.building.yearBuilt
  return year === null ? null : CURRENT_YEAR - year
}

/** Why replacing the HVAC isn't advised for this building, or null if it can be considered. */
export function hvacNotAdvised(base: Baseline): string | null {
  const age = hvacAge(base)
  if (age === null || age >= HVAC_MIN_AGE || base.building.heating === 'Electric Resistance') return null
  return `Equipment is about ${age} years old. Replacing it this early rarely makes sense.`
}

export function hvacIsDue(base: Baseline): boolean {
  return (hvacAge(base) ?? 0) >= HVAC_SERVICE_LIFE
}

export function ledGross(base: Baseline): number {
  const factor = base.year < 2000 ? 1 : 0.9
  return base.building.sqft * LED_COST[base.building.type] * factor
}

export function ledSavingsFraction(base: Baseline): number {
  if (base.building.yearBuilt === null) return 0.45
  return base.year < 2010 ? 0.5 : 0.35
}

export function envelopeGross(base: Baseline): number {
  const ageMult = base.year < 1980 ? 1.15 : base.year < 2000 ? 1 : 0.85
  const { sqft, type } = base.building
  return (sqft * ENV_SEAL_COST + (sqft / TYPE_PROFILES[type].floors) * ENV_ROOF_COST) * ageMult
}

export function envelopeFractions(base: Baseline): { heat: number; cool: number } {
  const vintage =
    base.building.yearBuilt === null ? 0.17 : base.year < 1980 ? 0.24 : base.year < 2000 ? 0.19 : 0.1
  const heatClimate = { cold: 1.1, mixed: 1, hot: 0.7 }[base.climate]
  const coolClimate = { cold: 0.8, mixed: 1, hot: 1.3 }[base.climate]
  return { heat: vintage * heatClimate, cool: 0.07 * coolClimate }
}

/** Peak load falls about half as fast as annual use, within 3–15%. Older, leakier buildings gain most. */
export function envelopeLoadReduction(base: Baseline): number {
  const f = envelopeFractions(base)
  return Math.min(0.15, Math.max(0.03, 0.5 * Math.max(f.heat, f.cool)))
}

export function hvacCostPerTon(base: Baseline): number {
  switch (base.building.heating) {
    case 'Electric Resistance':
      return 3000 // heat pump conversion
    case 'Boiler':
      return 2800
    default:
      // Published packaged rooftop figures mostly sit at $2,000–4,000/ton installed (contractor sites).
      return base.building.cooling === 'None' ? 1500 : 2400
  }
}

export function hvacFractions(base: Baseline): { heat: number; cool: number } {
  const heat = {
    'Natural Gas Furnace': 0.15,
    Boiler: 0.14,
    'Heat Pump': 0.12,
    'Electric Resistance': 0.5,
    'Not Sure': 0.12,
  }[base.building.heating]
  const cool = { 'Rooftop Units': 0.28, 'Central AC': 0.25, 'Heat Pump': 0.18, None: 0, 'Not Sure': 0.22 }[
    base.building.cooling
  ]
  // Equipment age drives the efficiency gap: use the install year when known, else the building's.
  const age = hvacAge(base)
  const ageMult = age === null ? 1 : age >= 30 ? 1.15 : age >= 15 ? 1 : 0.6
  return { heat: Math.min(0.6, heat * ageMult), cool: Math.min(0.4, cool * ageMult) }
}

export function controlsGross(base: Baseline): number {
  return base.building.sqft * CTRL_COST[base.building.type]
}

export const CONTROLS_FRACTIONS = { hvac: 0.12, lighting: 0.06, plug: 0.03 }

/**
 * How far to trust a measure's estimate from desk data. Never "High": without a site
 * visit nobody has seen the fixtures, insulation or equipment these figures depend on.
 */
export function measureConfidence(id: MeasureId, base: Baseline): ConfidenceLevel {
  const b = base.building
  const hvacKnown = b.heating !== 'Not Sure' && b.cooling !== 'Not Sure'
  switch (id) {
    case 'led':
      return base.kwhEstimated ? 'Low' : 'Medium'
    case 'envelope':
      return b.yearBuilt === null ? 'Low' : 'Medium'
    case 'hvac':
      if (!hvacKnown) return 'Low'
      return b.hvacYear !== null || b.yearBuilt !== null ? 'Medium' : 'Low'
    case 'controls':
      return 'Medium'
    case 'solar':
      return base.kwhEstimated ? 'Low' : 'Medium'
  }
}
