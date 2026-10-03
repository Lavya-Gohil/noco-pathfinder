import type { Building, BuildingForm } from '../types'

export const DEMO_FORM: BuildingForm = {
  name: 'Riverside Commerce Center',
  city: 'Buffalo',
  state: 'NY',
  type: 'Office',
  sqft: '85000',
  yearBuilt: '1988',
  heating: 'Natural Gas Furnace',
  cooling: 'Rooftop Units',
  elecCost: '118000',
  heatCost: '54000',
  kwh: '720000',
  // Buffalo office with rooftop units: flat-ish shoulder months, summer cooling peak. Sums to 720,000.
  monthly: ['47000', '44500', '45500', '43000', '58000', '82000', '95000', '92000', '77000', '43500', '45000', '47500'],
  hvacYear: '1994',
  budget: '250000',
  objective: 'Balanced',
}

export const EMPTY_FORM: BuildingForm = {
  name: '',
  city: '',
  state: '',
  type: '',
  sqft: '',
  yearBuilt: '',
  heating: '',
  cooling: '',
  elecCost: '',
  heatCost: '',
  kwh: '',
  monthly: Array(12).fill(''),
  hvacYear: '',
  budget: '',
  objective: 'Balanced',
}

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

export const BUDGET_MIN = 25_000
export const BUDGET_MAX = 1_000_000

/** Strip "$", "," and whitespace; return NaN for anything not a plain number. */
export function parseNum(v: string): number {
  const t = v.replace(/[$,\s]/g, '')
  if (t === '') return NaN
  return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN
}

export type FormErrors = Partial<Record<keyof BuildingForm, string>>

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function validate(f: BuildingForm): FormErrors {
  const e: FormErrors = {}
  const req = (k: keyof BuildingForm, label: string) => {
    if (!String(f[k]).trim()) e[k] = `${label} is required`
  }
  req('name', 'Building name')
  req('city', 'City')
  if (!f.state) e.state = 'Select a state'
  if (!f.type) e.type = 'Select a building type'
  if (!f.heating) e.heating = 'Select a heating system (or "Not Sure")'
  if (!f.cooling) e.cooling = 'Select a cooling system (or "Not Sure")'

  const sqft = parseNum(f.sqft)
  if (!Number.isFinite(sqft)) e.sqft = 'Enter square footage'
  else if (sqft < 1_000 || sqft > 5_000_000) e.sqft = 'Between 1,000 and 5,000,000 sq ft'

  if (f.yearBuilt.trim()) {
    const y = parseNum(f.yearBuilt)
    if (!Number.isInteger(y) || y < 1850 || y > 2026) e.yearBuilt = 'Enter a year between 1850 and 2026'
  }

  const elec = parseNum(f.elecCost)
  if (!Number.isFinite(elec)) e.elecCost = 'Enter annual electricity cost'
  else if (elec <= 0) e.elecCost = 'Must be greater than $0'
  else if (elec > 50_000_000) e.elecCost = 'Value looks too large'

  const heat = parseNum(f.heatCost)
  if (!Number.isFinite(heat)) e.heatCost = 'Enter annual heating cost (0 if none)'
  else if (heat < 0) e.heatCost = 'Cannot be negative'
  else if (heat > 50_000_000) e.heatCost = 'Value looks too large'

  if (f.kwh.trim()) {
    const k = parseNum(f.kwh)
    if (!Number.isFinite(k) || k <= 0) e.kwh = 'Enter a positive number or leave blank'
    else if (Number.isFinite(elec) && elec > 0) {
      const price = elec / k
      if (price < 0.04 || price > 0.6)
        e.kwh = `Implies $${price.toFixed(2)}/kWh — check cost and usage`
    }
  }

  if (f.hvacYear.trim()) {
    const y = parseNum(f.hvacYear)
    if (!Number.isInteger(y) || y < 1950 || y > 2026) e.hvacYear = 'Enter a year between 1950 and 2026'
  }

  const filled = f.monthly.filter((m) => m.trim() !== '')
  if (filled.length > 0) {
    const vals = f.monthly.map(parseNum)
    if (filled.length < 12) e.monthly = `Enter all 12 months or leave them blank (${filled.length} of 12 entered)`
    else if (vals.some((v) => !Number.isFinite(v) || v <= 0)) e.monthly = 'Each month must be a positive number'
    else {
      const sum = vals.reduce((a, v) => a + v, 0)
      const annual = parseNum(f.kwh)
      if (Number.isFinite(annual) && annual > 0 && Math.abs(sum - annual) / annual > 0.1)
        e.monthly = `Months add up to ${Math.round(sum).toLocaleString('en-US')} kWh, more than 10% away from the annual figure`
      else if (Number.isFinite(elec) && elec > 0 && (elec / sum < 0.04 || elec / sum > 0.6))
        e.monthly = `Implies $${(elec / sum).toFixed(2)}/kWh. Check the monthly values and the electricity cost`
    }
  }

  const budget = parseNum(f.budget)
  if (!Number.isFinite(budget)) e.budget = 'Enter a project budget'
  else if (budget < BUDGET_MIN || budget > BUDGET_MAX) e.budget = 'Between $25,000 and $1,000,000'

  return e
}

export function toBuilding(f: BuildingForm): Building {
  const year = f.yearBuilt.trim() ? parseNum(f.yearBuilt) : NaN
  const kwh = f.kwh.trim() ? parseNum(f.kwh) : NaN
  const months = f.monthly.map(parseNum)
  const monthlyKwh = months.length === 12 && months.every((v) => Number.isFinite(v) && v > 0) ? months : null
  const hvacYear = f.hvacYear.trim() ? parseNum(f.hvacYear) : NaN
  return {
    name: f.name.trim(),
    city: f.city.trim(),
    state: f.state,
    type: f.type || 'Office',
    sqft: parseNum(f.sqft),
    yearBuilt: Number.isFinite(year) ? year : null,
    heating: f.heating || 'Not Sure',
    cooling: f.cooling || 'Not Sure',
    elecCost: parseNum(f.elecCost),
    heatCost: parseNum(f.heatCost),
    kwh: Number.isFinite(kwh) && kwh > 0 ? kwh : null,
    monthlyKwh,
    hvacYear: Number.isFinite(hvacYear) ? hvacYear : null,
    budget: parseNum(f.budget),
    objective: f.objective,
  }
}

/** Keep digits only and add thousands separators for display ("85000" → "85,000"). */
export function groupDigits(v: string): string {
  const d = v.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return d ? Number(d).toLocaleString('en-US') : ''
}
