import { describe, expect, it } from 'vitest'
import { CURRENT_YEAR } from '../engine/baseline'
import { DEMO_FORM, groupDigits, parseNum, parsePastedMonths, toBuilding, validate } from './building'

describe('groupDigits', () => {
  it('groups thousands', () => {
    expect(groupDigits('85000')).toBe('85,000')
    expect(groupDigits('$1,234')).toBe('1,234')
    expect(groupDigits('0')).toBe('0')
    expect(groupDigits('')).toBe('')
  })

  it('keeps decimals instead of multiplying the value by 100', () => {
    expect(groupDigits('118000.50')).toBe('118,000.50')
    expect(parseNum(groupDigits('118000.50'))).toBe(118000.5)
  })

  it('stays stable while a decimal is being typed', () => {
    let v = ''
    for (const ch of '1200.75') v = groupDigits(v + ch)
    expect(v).toBe('1,200.75')
  })

  it('trims extra decimals and stray points', () => {
    expect(groupDigits('.5')).toBe('0.5')
    expect(groupDigits('10.999')).toBe('10.99')
    expect(groupDigits('1.2.3')).toBe('1.23')
  })
})

describe('parsePastedMonths', () => {
  const plain = ['47000', '44500', '45500', '43000', '58000', '82000', '95000', '92000', '77000', '43500', '45000', '47500']
  const grouped = plain.map((v) => groupDigits(v))

  it('reads a spreadsheet column, including thousands separators', () => {
    expect(parsePastedMonths(plain.join('\n'))).toEqual(grouped)
    expect(parsePastedMonths(grouped.join('\n'))).toEqual(grouped)
    expect(parsePastedMonths(grouped.join('\t'))).toEqual(grouped)
  })

  it('reads CSV rows', () => {
    expect(parsePastedMonths(plain.join(','))).toEqual(grouped)
    expect(parsePastedMonths(grouped.map((v) => `"${v}"`).join(','))).toEqual(grouped)
  })

  it('rounds decimals and ignores month labels', () => {
    const labelled = plain.map((v) => `Month ${v}.4`).join('\n')
    expect(parsePastedMonths(labelled)).toEqual(grouped)
  })

  it('leaves anything other than 12 values to the normal paste', () => {
    expect(parsePastedMonths('47000')).toBeNull()
    expect(parsePastedMonths(plain.slice(0, 11).join('\n'))).toBeNull()
    expect(parsePastedMonths([...plain, '1'].join('\n'))).toBeNull()
  })
})

describe('validate', () => {
  it('accepts the demo building, which the rest of the app relies on', () => {
    expect(validate(DEMO_FORM)).toEqual({})
  })

  it('follows the calendar rather than a fixed year', () => {
    expect(validate({ ...DEMO_FORM, yearBuilt: String(CURRENT_YEAR), hvacYear: '' }).yearBuilt).toBeUndefined()
    expect(validate({ ...DEMO_FORM, yearBuilt: String(CURRENT_YEAR + 1) }).yearBuilt).toContain(String(CURRENT_YEAR))
  })

  it('rejects HVAC installed before the building existed', () => {
    expect(validate({ ...DEMO_FORM, yearBuilt: '2005', hvacYear: '1994' }).hvacYear).toBeDefined()
    expect(validate({ ...DEMO_FORM, yearBuilt: '', hvacYear: '1994' }).hvacYear).toBeUndefined()
  })

  it('requires all 12 months or none', () => {
    expect(validate({ ...DEMO_FORM, monthly: ['1000', ...Array(11).fill('')] }).monthly).toContain('1 of 12')
  })

  it('carries decimals through to the engine', () => {
    expect(toBuilding({ ...DEMO_FORM, elecCost: '118,000.50' }).elecCost).toBe(118000.5)
  })
})
