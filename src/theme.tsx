import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'noco-theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

interface ThemeCtx {
  pref: ThemePref
  resolved: ResolvedTheme
  setPref: (p: ThemePref) => void
}

const Ctx = createContext<ThemeCtx>({ pref: 'system', resolved: 'light', setPref: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  useEffect(() => {
    const m = media()
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])

  const resolved: ResolvedTheme = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
  }, [resolved])

  const setPref = (p: ThemePref) => {
    setPrefState(p)
    try {
      if (p === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, p)
    } catch {
      /* storage unavailable — preference lasts for this session only */
    }
  }

  return <Ctx.Provider value={{ pref, resolved, setPref }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

/** SVG chart colors per theme (validated for contrast and color-vision separation). */
export interface ChartPalette {
  quick: string
  balanced: string
  deep: string
  bar: string
  grid: string
  axis: string
  label: string
  reference: string
}

const LIGHT: ChartPalette = {
  quick: '#2563eb',
  balanced: '#009488',
  deep: '#c26a06',
  bar: '#009488',
  grid: '#dbe4e9',
  axis: '#4f6175',
  label: '#334a5e',
  reference: '#98a2b3',
}

const DARK: ChartPalette = {
  quick: '#5b8def',
  balanced: '#14a69c',
  deep: '#c07812',
  bar: '#14a69c',
  grid: '#25303a',
  axis: '#7c8593',
  label: '#aeb6c2',
  reference: '#56606e',
}

export function useChartPalette(): ChartPalette {
  return useTheme().resolved === 'dark' ? DARK : LIGHT
}

/** Line dash per path — secondary encoding so paths stay distinguishable without color. */
export const PATH_DASH: Record<'quick' | 'balanced' | 'deep', string | undefined> = {
  quick: '5 4',
  balanced: undefined,
  deep: '2 3',
}
