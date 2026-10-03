// Baseline energy model: turns the intake form into an estimated end-use
// breakdown that every retrofit measure works against.
// All values are illustrative pre-audit estimates.

import type { Building, BuildingType, ClimateZone } from '../types'
import { clamp, nonNeg } from '../utils/sanity'

export const CURRENT_YEAR = 2026
/** Year assumed when the user leaves "year built" blank. */
export const DEFAULT_YEAR = 1990
/** Assumed natural-gas price used to convert heating spend into therms. */
export const GAS_PRICE_PER_THERM = 1.15
/** Fallback electricity price when annual kWh is not supplied. */
export const DEFAULT_ELEC_PRICE = 0.15
/** U.S. average grid emissions, metric tons CO2e per kWh (illustrative). */
export const GRID_T_PER_KWH = 0.00037
/** Natural gas combustion, metric tons CO2e per therm. */
export const GAS_T_PER_THERM = 0.0053
export const KWH_TO_MMBTU = 0.003412
export const THERM_TO_MMBTU = 0.1

const COLD = new Set([
  'AK', 'ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'PA', 'OH', 'MI', 'IN', 'IL', 'WI',
  'MN', 'IA', 'ND', 'SD', 'NE', 'MT', 'WY', 'ID', 'CO', 'UT',
])
const HOT = new Set(['FL', 'TX', 'LA', 'MS', 'AL', 'GA', 'SC', 'AZ', 'NV', 'HI', 'NM'])

export function climateFor(state: string): ClimateZone {
  const s = state.trim().toUpperCase()
  if (COLD.has(s)) return 'cold'
  if (HOT.has(s)) return 'hot'
  return 'mixed'
}

interface TypeProfile {
  lighting: number // share of electricity
  cooling: number // cooling + fans share of electricity
  plug: number
  sqftPerTon: number
  floors: number
}

export const TYPE_PROFILES: Record<BuildingType, TypeProfile> = {
  Office: { lighting: 0.28, cooling: 0.3, plug: 0.26, sqftPerTon: 350, floors: 3 },
  Warehouse: { lighting: 0.42, cooling: 0.14, plug: 0.14, sqftPerTon: 600, floors: 1 },
  Retail: { lighting: 0.34, cooling: 0.28, plug: 0.18, sqftPerTon: 300, floors: 1 },
  School: { lighting: 0.3, cooling: 0.26, plug: 0.2, sqftPerTon: 350, floors: 2 },
  Multifamily: { lighting: 0.16, cooling: 0.24, plug: 0.34, sqftPerTon: 450, floors: 4 },
}

const COOL_CLIMATE = { cold: 0.85, mixed: 1, hot: 1.25 } as const
/** Cold climates need less cooling capacity per sq ft (more sq ft per ton). */
const TON_CLIMATE = { cold: 1.15, mixed: 1, hot: 0.85 } as const
const SOLAR_YIELD = { cold: 1150, mixed: 1350, hot: 1550 } as const

export interface EndUse {
  name: 'HVAC' | 'Lighting' | 'Plug Loads' | 'Envelope Losses' | 'Other'
  cost: number
  share: number
}

export interface Baseline {
  building: Building
  climate: ClimateZone
  year: number
  age: number
  elecPrice: number
  elecPriceBase: number
  heatPrice: number // $ per heat unit (therm for gas, kWh for electric)
  heatFuel: 'gas' | 'electric'
  elecKwh: number
  kwhEstimated: boolean
  elecCost: number
  heatCost: number
  heatUnits: number
  totalSpend: number
  costPerSqft: number
  lightingKwh: number
  coolingKwh: number
  plugKwh: number
  otherKwh: number
  designTons: number
  roofKw: number
  solarYield: number
  envelopeLossFrac: number
  endUses: EndUse[]
  baselineCo2: number
  baselineMmbtu: number
}

export function buildBaseline(b: Building, elecPriceChange = 0): Baseline {
  const climate = climateFor(b.state)
  const year = b.yearBuilt ?? DEFAULT_YEAR
  const age = clamp(CURRENT_YEAR - year, 0, 200)
  const profile = TYPE_PROFILES[b.type]
  const priceMult = 1 + clamp(elecPriceChange, -0.2, 0.5)

  const kwhEstimated = !(b.kwh && b.kwh > 0)
  const elecPriceBase = kwhEstimated ? DEFAULT_ELEC_PRICE : clamp(b.elecCost / (b.kwh as number), 0.04, 0.6)
  const elecKwh = kwhEstimated ? b.elecCost / DEFAULT_ELEC_PRICE : (b.kwh as number)
  const elecPrice = elecPriceBase * priceMult
  const elecCost = elecKwh * elecPrice

  const heatFuel: 'gas' | 'electric' =
    b.heating === 'Heat Pump' || b.heating === 'Electric Resistance' ? 'electric' : 'gas'
  const heatPrice = heatFuel === 'gas' ? GAS_PRICE_PER_THERM : elecPrice
  const heatUnits = heatFuel === 'gas' ? b.heatCost / GAS_PRICE_PER_THERM : b.heatCost / elecPriceBase
  const heatCost = heatUnits * heatPrice

  // Electric end-use split
  const olderFixtures = year < 2000 ? 0.03 : 0
  const lightingShare = profile.lighting + olderFixtures
  const coolingShare = b.cooling === 'None' ? 0.06 : profile.cooling * COOL_CLIMATE[climate]
  const plugShare = profile.plug
  const otherShare = Math.max(0.05, 1 - lightingShare - coolingShare - plugShare)
  const norm = lightingShare + coolingShare + plugShare + otherShare
  const lightingKwh = (elecKwh * lightingShare) / norm
  const coolingKwh = (elecKwh * coolingShare) / norm
  const plugKwh = (elecKwh * plugShare) / norm
  const otherKwh = (elecKwh * otherShare) / norm

  // Share of HVAC energy that is really envelope loss (older = leakier)
  const envelopeLossFrac = year < 1980 ? 0.36 : year < 2000 ? 0.3 : year < 2010 ? 0.22 : 0.16

  const hvacCost = heatCost + coolingKwh * elecPrice
  const totalSpend = elecCost + heatCost
  const raw: Omit<EndUse, 'share'>[] = [
    { name: 'HVAC', cost: hvacCost * (1 - envelopeLossFrac) },
    { name: 'Lighting', cost: lightingKwh * elecPrice },
    { name: 'Plug Loads', cost: plugKwh * elecPrice },
    { name: 'Envelope Losses', cost: hvacCost * envelopeLossFrac },
    { name: 'Other', cost: otherKwh * elecPrice },
  ]
  const endUses = raw.map((e) => ({ ...e, share: totalSpend > 0 ? e.cost / totalSpend : 0 }))

  const designTons = b.sqft / (profile.sqftPerTon * TON_CLIMATE[climate])
  const roofSqft = b.sqft / profile.floors
  const roofKw = (roofSqft * 0.6 * 14) / 1000 // 60% usable roof, ~14 W/sq ft

  const heatT = heatFuel === 'gas' ? heatUnits * GAS_T_PER_THERM : heatUnits * GRID_T_PER_KWH
  const heatMmbtu = heatFuel === 'gas' ? heatUnits * THERM_TO_MMBTU : heatUnits * KWH_TO_MMBTU

  return {
    building: b,
    climate,
    year,
    age,
    elecPrice,
    elecPriceBase,
    heatPrice,
    heatFuel,
    elecKwh: nonNeg(elecKwh),
    kwhEstimated,
    elecCost: nonNeg(elecCost),
    heatCost: nonNeg(heatCost),
    heatUnits: nonNeg(heatUnits),
    totalSpend: nonNeg(totalSpend),
    costPerSqft: b.sqft > 0 ? totalSpend / b.sqft : 0,
    lightingKwh,
    coolingKwh,
    plugKwh,
    otherKwh,
    designTons,
    roofKw,
    solarYield: SOLAR_YIELD[climate],
    envelopeLossFrac,
    endUses,
    baselineCo2: elecKwh * GRID_T_PER_KWH + heatT,
    baselineMmbtu: elecKwh * KWH_TO_MMBTU + heatMmbtu,
  }
}
