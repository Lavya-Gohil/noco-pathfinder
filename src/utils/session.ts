// Keeps the assessment across a page reload. Uses sessionStorage, so the data stays
// on this device and is gone when the tab closes. Described in the privacy policy.

import type { BuildingForm, PathId, Scenario } from '../types'
import { EMPTY_FORM, validate } from './building'

const KEY = 'noco-session'
const STEPS = ['intake', 'diagnosis', 'strategy', 'report'] as const
const PATHS: readonly string[] = ['quick', 'balanced', 'deep']

export interface SavedSession {
  form: BuildingForm
  analyzedForm: BuildingForm | null
  step: (typeof STEPS)[number]
  maxStep: number
  subs: { intake: number; diagnosis: number; strategy: number }
  scenario: Scenario
  selected: PathId
}

function isForm(v: unknown): v is BuildingForm {
  if (typeof v !== 'object' || v === null) return false
  const f = v as Record<string, unknown>
  return (Object.keys(EMPTY_FORM) as (keyof BuildingForm)[]).every((k) =>
    k === 'monthly' ? Array.isArray(f.monthly) && f.monthly.length === 12 && f.monthly.every((m) => typeof m === 'string') : typeof f[k] === 'string',
  )
}

const isCount = (v: unknown) => Number.isInteger(v) && (v as number) >= 0

/** The saved session, or null if there is none or it can't be trusted. */
export function loadSession(): SavedSession | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as SavedSession | null
    if (!s || !isForm(s.form)) return null
    if (!STEPS.includes(s.step) || !isCount(s.maxStep) || !PATHS.includes(s.selected)) return null
    if (![s.subs?.intake, s.subs?.diagnosis, s.subs?.strategy].every(isCount)) return null
    if (![s.scenario?.budget, s.scenario?.elecPriceChange, s.scenario?.incentiveRate].every(Number.isFinite)) return null
    // Results can only be restored from a complete, valid form.
    const analyzed = isForm(s.analyzedForm) && Object.keys(validate(s.analyzedForm)).length === 0 ? s.analyzedForm : null
    return analyzed ? { ...s, analyzedForm: analyzed } : { ...s, analyzedForm: null, step: 'intake', maxStep: 0 }
  } catch {
    return null
  }
}

export function saveSession(s: SavedSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable — the assessment lasts until reload, as it would without this */
  }
}
