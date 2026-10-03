// Data confidence: how much the recommendation can be trusted given what the
// owner has told us, and which missing data point would help most.

import type { Building } from '../types'

export type DataConfidenceLevel = 'Preliminary' | 'Medium' | 'High'

export interface ConfidenceFactor {
  label: string
  points: number
  have: boolean
}

export interface NextDataPoint {
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
  const factors: ConfidenceFactor[] = [
    { label: 'Building type', points: 8, have: Boolean(b.type) },
    { label: 'Square footage', points: 8, have: b.sqft > 0 },
    { label: 'Year built', points: 6, have: b.yearBuilt !== null },
    { label: 'Heating system', points: 6, have: b.heating !== 'Not Sure' },
    { label: 'Cooling system', points: 6, have: b.cooling !== 'Not Sure' },
    { label: 'Annual utility costs', points: 8, have: b.elecCost > 0 },
    { label: 'Annual electricity use (kWh)', points: 5, have: b.kwh !== null },
  ]
  const score = Math.min(100, BASE + factors.filter((f) => f.have).reduce((a, f) => a + f.points, 0))

  // Candidate next data points. Monthly data also supersedes the annual kWh total.
  const missingKwh = b.kwh === null ? 5 : 0
  const missingHvac = (b.heating === 'Not Sure' ? 6 : 0) + (b.cooling === 'Not Sure' ? 6 : 0)
  const missingYear = b.yearBuilt === null ? 6 : 0
  const candidates: Omit<NextDataPoint, 'scoreAfter'>[] = [
    {
      label: '12 months of monthly electricity usage',
      why: 'Monthly usage would improve the accuracy of lighting, HVAC, controls, and solar estimates.',
      gain: 17 + missingKwh,
    },
    {
      label: 'HVAC equipment nameplate data (age, capacity, efficiency)',
      why: 'Confirms remaining equipment life and the real efficiency gap, the biggest driver of HVAC savings and timing.',
      gain: 6 + missingHvac,
    },
    {
      label: 'Year built / major renovation history',
      why: 'Building vintage drives insulation, lighting and HVAC assumptions.',
      gain: missingYear,
    },
    {
      label: 'On-site walkthrough photos (roof, mechanical room, lighting)',
      why: 'Lets an assessor validate roof area for solar and spot obvious envelope issues before a full audit.',
      gain: 5,
    },
  ]
  const ranked = candidates
    .filter((c) => c.gain > 0)
    .map((c) => ({ ...c, scoreAfter: Math.min(97, score + c.gain) }))
    .sort((a, b) => b.gain - a.gain)

  return { score, level: levelFor(score), factors, next: ranked[0], others: ranked.slice(1) }
}
