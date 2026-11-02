// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_FORM, EMPTY_FORM } from './building'
import { loadSession, saveSession, type SavedSession } from './session'

const saved: SavedSession = {
  form: DEMO_FORM,
  analyzedForm: DEMO_FORM,
  step: 'strategy',
  maxStep: 2,
  subs: { intake: 3, diagnosis: 2, strategy: 1 },
  scenario: { budget: 300_000, elecPriceChange: 0.1, incentiveRate: 0.2 },
  selected: 'deep',
}

beforeEach(() => sessionStorage.clear())

describe('session', () => {
  it('restores what was saved', () => {
    saveSession(saved)
    expect(loadSession()).toEqual(saved)
  })

  it('returns null when nothing was saved', () => {
    expect(loadSession()).toBeNull()
  })

  it('ignores corrupt or unexpected data', () => {
    for (const bad of ['{oops', '42', JSON.stringify({ ...saved, step: 'nope' }), JSON.stringify({ ...saved, form: { name: 1 } }), JSON.stringify({ ...saved, scenario: { budget: 'x' } })]) {
      sessionStorage.setItem('noco-session', bad)
      expect(loadSession()).toBeNull()
    }
  })

  it('goes back to the intake when the analyzed form is no longer valid', () => {
    saveSession({ ...saved, analyzedForm: { ...DEMO_FORM, sqft: '1' } })
    expect(loadSession()).toMatchObject({ analyzedForm: null, step: 'intake', maxStep: 0, form: DEMO_FORM })
  })

  it('keeps an unfinished form without results', () => {
    const draft = { ...EMPTY_FORM, name: 'Draft' }
    saveSession({ ...saved, form: draft, analyzedForm: null, step: 'intake', maxStep: 0 })
    expect(loadSession()?.form.name).toBe('Draft')
  })
})
