import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  generateColorScheme,
  schemeToCssVars,
  type ColorMode,
  type ColorScheme,
  type SchemeVariant,
} from './colorScheme'

export interface ThemeContextValue {
  mode: ColorMode
  seedColor: string
  variant: SchemeVariant
  scheme: ColorScheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export interface ThemeProviderProps {
  /** Seed color (hex) the Dynamic Color scheme is generated from. */
  seedColor?: string
  mode?: ColorMode
  variant?: SchemeVariant
  /** -1 (low) … 0 (default) … 1 (high) contrast. */
  contrastLevel?: number
  /** Render element. Defaults to a `div`. */
  as?: 'div' | 'section' | 'main' | 'body'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * Generates an MD3 Dynamic Color scheme from `seedColor` for the active `mode`
 * and exposes it as `--md-sys-color-*` custom properties on a wrapper element.
 * Static foundations (type, shape, elevation, motion) come from tokens.css.
 */
export function ThemeProvider({
  seedColor = '#6750A4',
  mode = 'light',
  variant = 'tonalSpot',
  contrastLevel = 0,
  as: Element = 'div',
  className,
  style,
  children,
}: ThemeProviderProps) {
  const scheme = useMemo(
    () => generateColorScheme({ seedColor, mode, variant, contrastLevel }),
    [seedColor, mode, variant, contrastLevel],
  )

  const cssVars = useMemo(() => schemeToCssVars(scheme), [scheme])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, seedColor, variant, scheme }),
    [mode, seedColor, variant, scheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      <Element
        data-md-color-scheme={mode}
        className={className}
        style={{ ...cssVars, ...style } as CSSProperties}
      >
        {children}
      </Element>
    </ThemeContext.Provider>
  )
}

/** Access the active theme (mode, seed, variant, resolved color scheme). */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return ctx
}
