export type BuildingType = 'Office' | 'Warehouse' | 'Retail' | 'School' | 'Multifamily'
export type HeatingSystem =
  | 'Natural Gas Furnace'
  | 'Boiler'
  | 'Heat Pump'
  | 'Electric Resistance'
  | 'Not Sure'
export type CoolingSystem = 'Central AC' | 'Rooftop Units' | 'Heat Pump' | 'None' | 'Not Sure'
export type Objective = 'Fastest Payback' | 'Balanced' | 'Maximum Savings' | 'Deep Retrofit'
export type ClimateZone = 'cold' | 'mixed' | 'hot'
export type ConfidenceLevel = 'Low' | 'Medium' | 'High'

export const BUILDING_TYPES: BuildingType[] = ['Office', 'Warehouse', 'Retail', 'School', 'Multifamily']
export const HEATING_SYSTEMS: HeatingSystem[] = [
  'Natural Gas Furnace',
  'Boiler',
  'Heat Pump',
  'Electric Resistance',
  'Not Sure',
]
export const COOLING_SYSTEMS: CoolingSystem[] = ['Central AC', 'Rooftop Units', 'Heat Pump', 'None', 'Not Sure']
export const OBJECTIVES: Objective[] = ['Fastest Payback', 'Balanced', 'Maximum Savings', 'Deep Retrofit']

/** Raw values as typed into the intake form (strings so inputs can be empty). */
export interface BuildingForm {
  name: string
  city: string
  state: string
  type: BuildingType | ''
  sqft: string
  yearBuilt: string
  heating: HeatingSystem | ''
  cooling: CoolingSystem | ''
  elecCost: string
  heatCost: string
  kwh: string
  /** 12 monthly kWh values, Jan–Dec (all blank or all filled). */
  monthly: string[]
  /** Year the main HVAC equipment was installed. */
  hvacYear: string
  budget: string
  objective: Objective
}

/** Validated, numeric building description used by the engine. */
export interface Building {
  name: string
  city: string
  state: string
  type: BuildingType
  sqft: number
  yearBuilt: number | null
  heating: HeatingSystem
  cooling: CoolingSystem
  elecCost: number
  heatCost: number
  kwh: number | null
  /** 12 monthly kWh values, Jan–Dec, when provided. */
  monthlyKwh: number[] | null
  hvacYear: number | null
  budget: number
  objective: Objective
}

/** What-if levers that sit on top of the building inputs. */
export interface Scenario {
  budget: number
  /** -0.2 .. +0.5 */
  elecPriceChange: number
  /** 0 .. 0.3 */
  incentiveRate: number
}

export type MeasureId = 'envelope' | 'led' | 'hvac' | 'controls' | 'solar'
export type PathId = 'quick' | 'balanced' | 'deep'
