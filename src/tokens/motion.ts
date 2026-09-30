/**
 * MD3 Expressive motion-physics (spring) tokens.
 *
 * Springs are defined by damping ratio + stiffness. These raw values serve
 * JS-driven animation (e.g. Web Animations, Framer Motion); CSS consumers use
 * the baked `--md-sys-motion-spring-*-duration` / `-easing` tokens in
 * tokens.css, generated from these tables (scripts/generate-motion-tokens.ts)
 * and switched per subtree by `ThemeProvider motionScheme`. Sourced from
 * androidx Compose `StandardMotionTokens` / `ExpressiveMotionTokens`.
 * See docs/md3-token-reference.md §5.
 */

export interface SpringToken {
  /** Damping ratio. < 1 overshoots (bounce); 1 is critically damped. */
  readonly damping: number
  /** Stiffness. Higher = faster. */
  readonly stiffness: number
}

/**
 * Compose `MotionScheme.standard()` / `.expressive()`. The library default is
 * `'expressive'` (see `ThemeProvider`'s `motionScheme` prop).
 */
export type MotionScheme = 'standard' | 'expressive'

/** Spatial springs animate position/size and may overshoot. */
export const spatialSprings: Record<MotionScheme, Record<'fast' | 'default' | 'slow', SpringToken>> = {
  standard: {
    fast: { damping: 0.9, stiffness: 1400 },
    default: { damping: 0.9, stiffness: 700 },
    slow: { damping: 0.9, stiffness: 300 },
  },
  expressive: {
    fast: { damping: 0.6, stiffness: 800 },
    default: { damping: 0.8, stiffness: 380 },
    slow: { damping: 0.8, stiffness: 200 },
  },
}

/** Effects springs animate color/opacity and never overshoot (damping = 1). */
export const effectsSprings: Record<'fast' | 'default' | 'slow', SpringToken> = {
  fast: { damping: 1.0, stiffness: 3800 },
  default: { damping: 1.0, stiffness: 1600 },
  slow: { damping: 1.0, stiffness: 800 },
}

/** CSS-compatible easing tokens, mirrored from tokens.css for JS access. */
export const easing = {
  linear: 'cubic-bezier(0, 0, 1, 1)',
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
} as const

export const duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
  long3: 550,
  long4: 600,
  extraLong1: 700,
  extraLong2: 800,
  extraLong3: 900,
  extraLong4: 1000,
} as const
