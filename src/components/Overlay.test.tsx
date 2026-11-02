// @vitest-environment jsdom
/// <reference types="node" />
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { TOUR_STEPS } from '../tour/steps'
import { Drawer } from './Overlay'
import { Tour } from './Tour'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Drawer', () => {
  it('keeps keyboard focus inside while open', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button>Behind the drawer</button>
        <Drawer open onClose={() => {}} title="Panel">
          <button>Inside</button>
        </Drawer>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus()
  })
})

describe('Tour', () => {
  it('does not advance after being closed while a step is finishing', () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    const onNext = vi.fn()
    const index = TOUR_STEPS.findIndex((s) => s.task && s.perform && !s.until)
    const state = { page: TOUR_STEPS[index].page, subs: { intake: 0, diagnosis: 0, strategy: 0 }, budget: 0, selected: 'balanced' as const }
    const api = { setSub() {}, go() {}, analyze() {}, setBudget() {}, home() {} }
    const { unmount } = render(<Tour steps={TOUR_STEPS} index={index} state={state} api={api} onNext={onNext} onClose={() => {}} onStartOwn={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Do it for me' }))
    unmount()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onNext).not.toHaveBeenCalled()
  })
})

describe('color contrast', () => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  const css = readFileSync('src/index.css', 'utf8')
  /** Each theme block's tokens, from the stylesheet the app actually ships. */
  const theme = (selector: string) => {
    const block = css.slice(css.indexOf(selector)).split('}')[0]
    return (name: string) => block.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))![1]
  }

  it.each([
    [':root {', ['bg', 'well-bg']],
    ["[data-theme='dark'] {", ['bg', 'well-bg']],
    ['.theme-light {', ['bg']],
  ])('muted text meets WCAG AA in %s', (selector, backgrounds) => {
    const t = theme(selector)
    for (const bg of backgrounds) expect(ratio(t('fg-3'), t(bg))).toBeGreaterThanOrEqual(4.5)
  })
})
