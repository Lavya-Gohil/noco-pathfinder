// Data confidence: how much the recommendation can be trusted given what the
// owner has told us, and which missing data point would help most.

import type { Building } from '../types'

export type DataConfidenceLevel = 'Preliminary' | 'Medium' | 'High'

export interface ConfidenceFactor {
  label: string
  points: number
  have: boolean
}

/** Intake field that supplies a data point, so the UI can jump straight to it. */
export type DataField = 'monthly' | 'hvac' | 'year'

export interface NextDataPoint {
  field?: DataField
  label: string
  why: string
  gain: number
  scoreAfter: number
}

export interface DataConfidence {
  score: number
  level: DataConfidenceLevel
  factors: ConfidenceFactor[]
  next: NextDataPoint
  others: NextDataPoint[]
}

const BASE = 20

export function levelFor(score: number): DataConfidenceLevel {
  if (score < 50) return 'Preliminary'
  if (score <= 75) return 'Medium'
  return 'High'
}

export function dataConfidence(b: Building): DataConfidence {
  const hasMonthly = b.monthlyKwh !== null
  const factors: ConfidenceFactor[] = [
    { label: 'Building type', points: 8, have: Boolean(b.type) },
    { label: 'Square footage', points: 8, have: b.sqft > 0 },
    { label: 'Year built', points: 6, have: b.yearBuilt !== null },
    { label: 'Heating system', points: 6, have: b.heating !== 'Not Sure' },
    { label: 'Cooling system', points: 6, have: b.cooling !== 'Not Sure' },
    { label: 'Annual utility costs', points: 8, have: b.elecCost > 0 },
    { label: 'Annual electricity use (kWh)', points: 5, have: b.kwh !== null || hasMonthly },
    { label: 'HVAC equipment age', points: 6, have: b.hvacYear !== null },
    { label: '12 months of electricity usage', points: 17, have: hasMonthly },
  ]
  const score = Math.min(100, BASE + factors.filter((f) => f.have).reduce((a, f) => a + f.points, 0))

  // Candidate next data points. Monthly data also covers the annual kWh total.
  const missingKwh = b.kwh === null && !hasMonthly ? 5 : 0
  const missingHvac = (b.heating === 'Not Sure' ? 6 : 0) + (b.cooling === 'Not Sure' ? 6 : 0)
  const missingYear = b.yearBuilt === null ? 6 : 0
  const candidates: (Omit<NextDataPoint, 'scoreAfter'> & { field?: DataField })[] = [
    {
      label: '12 months of monthly electricity usage',
      why: 'Monthly usage shows the real summer cooling load and improves the lighting, HVAC, controls and solar estimates.',
      gain: hasMonthly ? 0 : 17 + missingKwh,
      field: 'monthly',
    },
    {
      label: 'HVAC equipment age',
      why: 'The install year of the heating and cooling equipment sets the real efficiency gap, the biggest driver of HVAC savings.',
      gain: (b.hvacYear === null ? 6 : 0) + missingHvac,
      field: 'hvac',
    },
    {
      label: 'Year built / major renovation history',
      why: 'Building vintage drives insulation, lighting and HVAC assumptions.',
      gain: missingYear,
      field: 'year',
    },
    {
      label: 'On-site walkthrough',
      why: 'An assessor confirms roof area for solar, insulation levels and lighting before contractor scopes are written.',
      gain: 5,
    },
  ]
  const ranked = candidates
    .filter((c) => c.gain > 0)
    .map((c) => ({ ...c, scoreAfter: Math.min(97, score + c.gain) }))
    .sort((a, b) => b.gain - a.gain)

  return { score, level: levelFor(score), factors, next: ranked[0], others: ranked.slice(1) }
}
