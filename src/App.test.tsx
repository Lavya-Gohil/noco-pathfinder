// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { ThemeProvider } from './theme'

beforeEach(() => {
  window.location.hash = '#/app'
  sessionStorage.clear()
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const step = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Assessment steps' })).getByRole('button', { name })

/** Load the demo building, leave the tour and run the analysis, as a user would. */
async function analyzeDemo() {
  const user = userEvent.setup()
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  )
  await user.click(screen.getByRole('button', { name: /Load demo building/ }))
  await user.click(screen.getByRole('button', { name: 'Skip tour' }))
  for (const name of [/Continue to building systems/, /Continue to energy/, /Continue to planning/, /Analyze building/]) {
    await user.click(screen.getByRole('button', { name }))
  }
  await screen.findByRole('heading', { name: 'Building energy profile' })
  return user
}

describe('reloading the page', () => {
  it('keeps the assessment and its results', async () => {
    await analyzeDemo()
    cleanup()
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Building energy profile' })).toBeInTheDocument()
    expect(step(/Diagnosis/)).toBeEnabled()
  })

  it('starts empty after choosing a new assessment', async () => {
    await analyzeDemo()
    await userEvent.setup().click(screen.getByRole('button', { name: /Start my own assessment/ }))
    cleanup()
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(await screen.findByLabelText('Building name')).toHaveValue('')
  })
})

describe('results stay in step with the form', () => {
  it('unlocks the diagnosis after analysis', async () => {
    await analyzeDemo()
    expect(step(/Diagnosis/)).toBeEnabled()
  })

  it('locks later steps when the form is edited, and unlocks them when the edit is undone', async () => {
    const user = await analyzeDemo()
    await user.click(screen.getByRole('link', { name: /back to building assessment/ }))
    const name = screen.getByLabelText('Building name')

    await user.type(name, ' X')
    expect(step(/Diagnosis/)).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(/changed this building/)

    await user.type(name, '{Backspace}{Backspace}')
    expect(step(/Diagnosis/)).toBeEnabled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('locks later steps after the form is cleared', async () => {
    const user = await analyzeDemo()
    await user.click(screen.getByRole('link', { name: /back to building assessment/ }))
    await user.click(screen.getByRole('button', { name: 'Clear form' }))
    expect(step(/Diagnosis/)).toBeDisabled()
  })

  it('shows new values once the edited building is re-analyzed', async () => {
    const user = await analyzeDemo()
    await user.click(screen.getByRole('link', { name: /back to building assessment/ }))
    await user.type(screen.getByLabelText('Building name'), ' East')
    for (const name of [/Continue to building systems/, /Continue to energy/, /Continue to planning/, /Analyze building/]) {
      await user.click(screen.getByRole('button', { name }))
    }
    await screen.findByRole('heading', { name: 'Building energy profile' })
    expect(screen.getAllByText('Riverside Commerce Center East').length).toBeGreaterThan(0)
    expect(step(/Diagnosis/)).toBeEnabled()
  })
})
