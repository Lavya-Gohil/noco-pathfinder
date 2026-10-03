// The five retrofit measures: descriptive metadata plus the stand-alone cost
// and savings coefficients. How measures affect each other lives in
// interactions.ts — this file only knows about one measure at a time.

import type { BuildingType, ConfidenceLevel, MeasureId } from '../types'
import type { Baseline } from './baseline'

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
      'Cost scaled by floor area and building age ($0.70–$0.95 per sq ft before age adjustment).',
      'Heating savings of 10–24% depending on vintage, adjusted for climate zone.',
      'Cooling savings of ~7%, adjusted for climate zone.',
      'Reduces design heating/cooling load by ~10%.',
    ],
    verification: [
      'Blower-door or infrared survey to locate actual air leakage.',
      'Existing roof and wall insulation levels.',
      'Roof condition and remaining life (insulation is cheapest at re-roofing).',
    ],
    interactions: [
      'Done before HVAC, it lowers the design load so new equipment can be ~10% smaller and cheaper.',
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
      'Cost of $0.70–$0.95 per sq ft depending on building type.',
      'Lighting energy reduced 50% for pre-2010 fixtures, 35% otherwise.',
      'Lighting share of electricity estimated from building type and vintage.',
      'About 12% of lighting savings also reduce cooling load (climate-adjusted).',
    ],
    verification: [
      'Fixture count, lamp types and existing wattage.',
      'Operating hours by space type.',
      'Whether any areas have already been retrofitted.',
    ],
    interactions: [
      'Lower internal heat gain slightly reduces cooling load and future HVAC capacity (~2%).',
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
      'Cost based on design capacity (tons) at an illustrative $850–$1,100 per ton installed.',
      'Design capacity estimated from floor area, building type and climate zone.',
      'Heating efficiency gain of 12–50% depending on existing system (largest for electric resistance).',
      'Cooling efficiency gain of 18–28% depending on existing system.',
      'Equipment assumed to be original or near end of life for buildings older than ~15 years.',
    ],
    verification: [
      'Nameplate data: age, capacity and efficiency of existing units.',
      'Load calculation after any envelope work.',
      'Structural, electrical and gas service capacity.',
    ],
    interactions: [
      'Sized after envelope and LED improvements, capacity (and cost) drops by roughly 10–12%.',
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
      'Cost of $0.30–$0.55 per sq ft depending on building type.',
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
      'Commissioned after new HVAC so programming is not stranded on retiring equipment.',
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
      'Sized to offset ~35% of remaining annual electricity use (hard cap: 50%).',
      'Limited by usable roof area (60% of roof, ~14 W per sq ft).',
      'Installed cost of $2.35 per watt (illustrative).',
      'Annual production of 1,150–1,550 kWh per kW depending on climate zone.',
    ],
    verification: [
      'Structural roof capacity and remaining roof life.',
      'Shading analysis and roof orientation.',
      'Utility interconnection and net-metering rules.',
    ],
    interactions: [
      'Calculated after efficiency measures: the array is sized to the reduced electricity demand, not the original baseline, avoiding an oversized system.',
    ],
  },
}

// ---- Cost and savings coefficients (stand-alone, before interactions) ----

const LED_COST: Record<BuildingType, number> = { Office: 0.75, Warehouse: 0.7, Retail: 0.9, School: 0.8, Multifamily: 0.7 }
const ENV_COST: Record<BuildingType, number> = { Office: 0.8, Warehouse: 0.7, Retail: 0.85, School: 0.85, Multifamily: 0.95 }
const CTRL_COST: Record<BuildingType, number> = { Office: 0.55, Warehouse: 0.3, Retail: 0.45, School: 0.55, Multifamily: 0.4 }

export const SOLAR_COST_PER_W = 2.35

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
  return base.building.sqft * ENV_COST[base.building.type] * ageMult
}

export function envelopeFractions(base: Baseline): { heat: number; cool: number } {
  const vintage =
    base.building.yearBuilt === null ? 0.17 : base.year < 1980 ? 0.24 : base.year < 2000 ? 0.19 : 0.1
  const heatClimate = { cold: 1.1, mixed: 1, hot: 0.7 }[base.climate]
  const coolClimate = { cold: 0.8, mixed: 1, hot: 1.3 }[base.climate]
  return { heat: vintage * heatClimate, cool: 0.07 * coolClimate }
}

export function hvacCostPerTon(base: Baseline): number {
  switch (base.building.heating) {
    case 'Electric Resistance':
      return 1100 // heat pump conversion
    case 'Boiler':
      return 1000
    default:
      return base.building.cooling === 'None' ? 600 : 850
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
  const ageMult = base.building.yearBuilt === null ? 1 : base.year < 1995 ? 1.15 : base.year < 2010 ? 1 : 0.6
  return { heat: Math.min(0.6, heat * ageMult), cool: Math.min(0.4, cool * ageMult) }
}

export function controlsGross(base: Baseline): number {
  return base.building.sqft * CTRL_COST[base.building.type]
}

export const CONTROLS_FRACTIONS = { hvac: 0.12, lighting: 0.06, plug: 0.03 }

export function measureConfidence(id: MeasureId, base: Baseline): ConfidenceLevel {
  const b = base.building
  const hvacKnown = b.heating !== 'Not Sure' && b.cooling !== 'Not Sure'
  switch (id) {
    case 'led':
      return base.kwhEstimated ? 'Medium' : 'High'
    case 'envelope':
      return b.yearBuilt === null ? 'Low' : 'Medium'
    case 'hvac':
      return hvacKnown && b.yearBuilt !== null ? 'Medium' : 'Low'
    case 'controls':
      return 'Medium'
    case 'solar':
      return base.kwhEstimated ? 'Low' : 'Medium'
  }
}
