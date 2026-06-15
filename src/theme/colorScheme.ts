/**
 * Dynamic Color scheme generation.
 *
 * Produces a full MD3 system-color role map from a single seed color using
 * @material/material-color-utilities, resolving each role through
 * MaterialDynamicColors so output matches the M3 spec role-by-role.
 * See docs/md3-token-reference.md §6.
 */
import {
  argbFromHex,
  hexFromArgb,
  Hct,
  DynamicScheme,
  MaterialDynamicColors,
  SchemeTonalSpot,
  SchemeExpressive,
  SchemeVibrant,
  SchemeNeutral,
  SchemeMonochrome,
  SchemeFidelity,
  SchemeContent,
} from '@material/material-color-utilities'

export type ColorMode = 'light' | 'dark'

/**
 * MD3 dynamic-scheme variants. `tonalSpot` is the Material default;
 * `expressive` and `vibrant` lean into the Expressive aesthetic.
 */
export type SchemeVariant =
  | 'tonalSpot'
  | 'expressive'
  | 'vibrant'
  | 'neutral'
  | 'monochrome'
  | 'fidelity'
  | 'content'

const SCHEME_CTORS: Record<
  SchemeVariant,
  new (sourceColorHct: Hct, isDark: boolean, contrastLevel: number) => DynamicScheme
> = {
  tonalSpot: SchemeTonalSpot,
  expressive: SchemeExpressive,
  vibrant: SchemeVibrant,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
  fidelity: SchemeFidelity,
  content: SchemeContent,
}

/** Maps a CSS color-role name to its MaterialDynamicColors resolver. */
const COLOR_ROLES = {
  'primary': MaterialDynamicColors.primary,
  'on-primary': MaterialDynamicColors.onPrimary,
  'primary-container': MaterialDynamicColors.primaryContainer,
  'on-primary-container': MaterialDynamicColors.onPrimaryContainer,
  'secondary': MaterialDynamicColors.secondary,
  'on-secondary': MaterialDynamicColors.onSecondary,
  'secondary-container': MaterialDynamicColors.secondaryContainer,
  'on-secondary-container': MaterialDynamicColors.onSecondaryContainer,
  'tertiary': MaterialDynamicColors.tertiary,
  'on-tertiary': MaterialDynamicColors.onTertiary,
  'tertiary-container': MaterialDynamicColors.tertiaryContainer,
  'on-tertiary-container': MaterialDynamicColors.onTertiaryContainer,
  'error': MaterialDynamicColors.error,
  'on-error': MaterialDynamicColors.onError,
  'error-container': MaterialDynamicColors.errorContainer,
  'on-error-container': MaterialDynamicColors.onErrorContainer,
  'background': MaterialDynamicColors.background,
  'on-background': MaterialDynamicColors.onBackground,
  'surface': MaterialDynamicColors.surface,
  'on-surface': MaterialDynamicColors.onSurface,
  'surface-variant': MaterialDynamicColors.surfaceVariant,
  'on-surface-variant': MaterialDynamicColors.onSurfaceVariant,
  'outline': MaterialDynamicColors.outline,
  'outline-variant': MaterialDynamicColors.outlineVariant,
  'shadow': MaterialDynamicColors.shadow,
  'scrim': MaterialDynamicColors.scrim,
  'inverse-surface': MaterialDynamicColors.inverseSurface,
  'inverse-on-surface': MaterialDynamicColors.inverseOnSurface,
  'inverse-primary': MaterialDynamicColors.inversePrimary,
  'surface-tint': MaterialDynamicColors.surfaceTint,
  'surface-dim': MaterialDynamicColors.surfaceDim,
  'surface-bright': MaterialDynamicColors.surfaceBright,
  'surface-container-lowest': MaterialDynamicColors.surfaceContainerLowest,
  'surface-container-low': MaterialDynamicColors.surfaceContainerLow,
  'surface-container': MaterialDynamicColors.surfaceContainer,
  'surface-container-high': MaterialDynamicColors.surfaceContainerHigh,
  'surface-container-highest': MaterialDynamicColors.surfaceContainerHighest,
  'primary-fixed': MaterialDynamicColors.primaryFixed,
  'primary-fixed-dim': MaterialDynamicColors.primaryFixedDim,
  'on-primary-fixed': MaterialDynamicColors.onPrimaryFixed,
  'on-primary-fixed-variant': MaterialDynamicColors.onPrimaryFixedVariant,
  'secondary-fixed': MaterialDynamicColors.secondaryFixed,
  'secondary-fixed-dim': MaterialDynamicColors.secondaryFixedDim,
  'on-secondary-fixed': MaterialDynamicColors.onSecondaryFixed,
  'on-secondary-fixed-variant': MaterialDynamicColors.onSecondaryFixedVariant,
  'tertiary-fixed': MaterialDynamicColors.tertiaryFixed,
  'tertiary-fixed-dim': MaterialDynamicColors.tertiaryFixedDim,
  'on-tertiary-fixed': MaterialDynamicColors.onTertiaryFixed,
  'on-tertiary-fixed-variant': MaterialDynamicColors.onTertiaryFixedVariant,
} as const

export type ColorRole = keyof typeof COLOR_ROLES

/** Hex color value for every MD3 system color role. */
export type ColorScheme = Record<ColorRole, string>

export interface GenerateSchemeOptions {
  seedColor: string
  mode: ColorMode
  variant?: SchemeVariant
  /** -1 (low) … 0 (default) … 1 (high). Drives WCAG contrast. */
  contrastLevel?: number
}

/** Generate a full color-role map (role → hex) for one mode. */
export function generateColorScheme({
  seedColor,
  mode,
  variant = 'tonalSpot',
  contrastLevel = 0,
}: GenerateSchemeOptions): ColorScheme {
  const sourceHct = Hct.fromInt(argbFromHex(seedColor))
  const Ctor = SCHEME_CTORS[variant]
  const scheme = new Ctor(sourceHct, mode === 'dark', contrastLevel)

  const result = {} as ColorScheme
  for (const role in COLOR_ROLES) {
    const dynamicColor = COLOR_ROLES[role as ColorRole]
    result[role as ColorRole] = hexFromArgb(dynamicColor.getArgb(scheme))
  }
  return result
}

/** Convert a color-role map into `--md-sys-color-*` CSS custom properties. */
export function schemeToCssVars(scheme: ColorScheme): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const role in scheme) {
    vars[`--md-sys-color-${role}`] = scheme[role as ColorRole]
  }
  return vars
}

/** Serialize a color-role map to a CSS declaration block body. */
export function schemeToCssText(scheme: ColorScheme): string {
  return Object.entries(schemeToCssVars(scheme))
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n')
}
