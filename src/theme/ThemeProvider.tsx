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
import type { MotionScheme } from '../tokens/motion'

export interface ThemeContextValue {
  mode: ColorMode
  seedColor: string
  variant: SchemeVariant
  scheme: ColorScheme
  /** Active motion scheme (`'expressive'` unless overridden). */
  motionScheme: MotionScheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export interface ThemeProviderProps {
  /** Seed color (hex) the Dynamic Color scheme is generated from. */
  seedColor?: string
  mode?: ColorMode
  variant?: SchemeVariant
  /** -1 (low) … 0 (default) … 1 (high) contrast. */
  contrastLevel?: number
  /**
   * Motion scheme for everything inside this provider — Compose
   * `MotionScheme.expressive()` / `.standard()`.
   *
   * - `'expressive'` (default): spatial springs are under-damped, so size /
   *   position / shape changes overshoot slightly ("bounce").
   * - `'standard'`: the same springs, damped to (almost) no overshoot.
   *
   * Written to the root as `data-md-motion-scheme`, which switches the
   * `--md-sys-motion-spring-*` tokens from tokens.css (effects springs are
   * identical in both schemes). Providers can be nested.
   * @default 'expressive'
   */
  motionScheme?: MotionScheme
  /** Render element. Defaults to a `div`. */
  as?: 'div' | 'section' | 'main' | 'body'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * Generates an MD3 Dynamic Color scheme from `seedColor` for the active `mode`
 * and exposes it as `--md-sys-color-*` custom properties on a wrapper element.
 * Static foundations (type, shape, elevation, motion) come from tokens.css;
 * `motionScheme` selects which spring token set applies to the subtree.
 */
export function ThemeProvider({
  seedColor = '#6750A4',
  mode = 'light',
  variant = 'tonalSpot',
  contrastLevel = 0,
  motionScheme = 'expressive',
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
    () => ({ mode, seedColor, variant, scheme, motionScheme }),
    [mode, seedColor, variant, scheme, motionScheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      <Element
        data-md-color-scheme={mode}
        data-md-motion-scheme={motionScheme}
        className={className}
        style={{ ...cssVars, ...style } as CSSProperties}
      >
        {children}
      </Element>
    </ThemeContext.Provider>
  )
}

/** Access the active theme (mode, seed, variant, color and motion scheme). */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return ctx
}
