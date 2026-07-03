import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type SVGAttributes,
} from 'react'
import clsx from 'clsx'
import styles from './LoadingIndicator.module.css'

export type LoadingIndicatorVariant = 'uncontained' | 'contained'

export interface LoadingIndicatorProps
  extends Omit<SVGAttributes<SVGSVGElement>, 'role' | 'color'> {
  /** Progress `0..1` for the determinate indicator. Omit for indeterminate. */
  value?: number
  /** `uncontained` (shape only) or `contained` (shape on a PrimaryContainer circle). @default 'uncontained' */
  variant?: LoadingIndicatorVariant
  /** Rendered diameter in px. @default 48 */
  size?: number
  /** Active shape color (overrides the token default). */
  color?: string
  /** Container fill for the `contained` variant (overrides PrimaryContainer). */
  containerColor?: string
}

/* ===========================================================================
   Shape geometry — the seven Loading indicator shapes traced directly from the
   official Material 3 Design Kit (Figma) `Loading indicator` component vectors
   (`fillGeometry`). Each shape is sampled at SAMPLES equal-angle radii from the
   shape-container center, so all shapes share a common center and a 1:1 point
   correspondence for smooth vertex-interpolated morphing. Radii are in units of
   the 38dp shape-container radius (= 1), preserving the shapes' relative sizes.
   =========================================================================== */

const SAMPLES = 128
const VIEWBOX = 48
const CENTER = VIEWBOX / 2
const ACTIVE_RADIUS = 19 // 38dp shape container inside the 48dp indicator

type P = [number, number]

const FIGMA_RADII: Record<string, number[]> = {
  softBurst: [0.7147,0.7227,0.7549,0.8007,0.8464,0.8895,0.906,0.9019,0.8745,0.8277,0.7817,0.7359,0.7147,0.7118,0.7251,0.7643,0.8087,0.8531,0.8894,0.8993,0.8903,0.8559,0.8111,0.7663,0.7241,0.7072,0.7068,0.7226,0.7634,0.8073,0.8511,0.8855,0.8947,0.8855,0.8511,0.8073,0.7634,0.7226,0.7068,0.7072,0.7241,0.7663,0.8111,0.8559,0.8903,0.8993,0.8894,0.8531,0.8087,0.7643,0.7251,0.7118,0.7147,0.7359,0.7817,0.8277,0.8745,0.9019,0.906,0.8895,0.8464,0.8007,0.7549,0.7227,0.7147,0.7227,0.7549,0.8007,0.8464,0.8895,0.906,0.9019,0.8745,0.8277,0.7817,0.7359,0.7147,0.7118,0.7251,0.7643,0.8087,0.8531,0.8894,0.8993,0.8903,0.8559,0.8111,0.7663,0.7241,0.7072,0.7068,0.7226,0.7634,0.8073,0.8511,0.8855,0.8947,0.8855,0.8511,0.8073,0.7634,0.7226,0.7068,0.7072,0.7241,0.7663,0.8111,0.8559,0.8903,0.8993,0.8894,0.8531,0.8087,0.7643,0.7251,0.7118,0.7147,0.7359,0.7817,0.8277,0.8745,0.9019,0.906,0.8895,0.8464,0.8007,0.7549,0.7227],
  cookie9: [0.8745,0.8889,0.8984,0.9032,0.9034,0.899,0.8899,0.8759,0.8568,0.8386,0.8294,0.8282,0.8348,0.8503,0.8702,0.8855,0.8959,0.9016,0.9026,0.8991,0.891,0.878,0.8602,0.8407,0.8296,0.8266,0.8314,0.8447,0.8647,0.8812,0.8928,0.8997,0.902,0.8997,0.8928,0.8812,0.8647,0.8447,0.8314,0.8266,0.8296,0.8407,0.8602,0.878,0.891,0.8991,0.9026,0.9016,0.8959,0.8855,0.8702,0.8503,0.8348,0.8282,0.8294,0.8386,0.8568,0.8759,0.8899,0.899,0.9034,0.9032,0.8984,0.8889,0.8745,0.855,0.8377,0.8293,0.829,0.8364,0.8529,0.8726,0.8874,0.8974,0.9026,0.9032,0.8992,0.8905,0.8769,0.8584,0.8395,0.8294,0.8273,0.8331,0.8474,0.8675,0.8833,0.8943,0.9005,0.9021,0.8992,0.8917,0.8795,0.8622,0.8423,0.8302,0.8263,0.8302,0.8423,0.8622,0.8795,0.8917,0.8992,0.9021,0.9005,0.8943,0.8833,0.8675,0.8474,0.8331,0.8273,0.8294,0.8395,0.8584,0.8769,0.8905,0.8992,0.9032,0.9026,0.8974,0.8874,0.8726,0.8529,0.8365,0.829,0.8293,0.8377,0.855],
  pentagon: [0.8497,0.8654,0.8827,0.8997,0.9122,0.9192,0.9217,0.9198,0.9134,0.9023,0.8856,0.867,0.8495,0.8341,0.8255,0.818,0.8106,0.8031,0.7957,0.7893,0.7947,0.8,0.8053,0.8107,0.816,0.8223,0.8352,0.8502,0.8664,0.8813,0.8914,0.8971,0.899,0.8971,0.8914,0.8813,0.8664,0.8502,0.8352,0.8223,0.816,0.8107,0.8053,0.8,0.7947,0.7893,0.7957,0.8031,0.8106,0.818,0.8255,0.8341,0.8495,0.867,0.8856,0.9023,0.9134,0.9198,0.9217,0.9192,0.9122,0.8997,0.8827,0.8654,0.8497,0.838,0.8311,0.8241,0.8172,0.8103,0.8034,0.8062,0.8118,0.8173,0.8229,0.8285,0.8348,0.8478,0.8628,0.8789,0.8933,0.9025,0.9071,0.9076,0.9041,0.8965,0.8843,0.8675,0.8499,0.8337,0.8196,0.8131,0.8066,0.8002,0.7937,0.7872,0.7808,0.7872,0.7937,0.8002,0.8066,0.8131,0.8196,0.8337,0.8499,0.8675,0.8843,0.8965,0.9041,0.9076,0.9071,0.9025,0.8933,0.8789,0.8628,0.8478,0.8348,0.8285,0.8229,0.8173,0.8118,0.8062,0.8034,0.8103,0.8172,0.8241,0.831,0.838],
  pill: [0.7804,0.774,0.7673,0.7604,0.7533,0.746,0.7385,0.7309,0.7232,0.7153,0.7075,0.6996,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6996,0.7075,0.7153,0.7232,0.7309,0.7385,0.746,0.7533,0.7604,0.7673,0.774,0.7804,0.7865,0.7924,0.7981,0.8033,0.8082,0.8128,0.8171,0.8209,0.8242,0.8272,0.8297,0.8318,0.8333,0.8344,0.8351,0.8353,0.8351,0.8344,0.8333,0.8318,0.8297,0.8272,0.8242,0.8209,0.817,0.8128,0.8082,0.8033,0.7981,0.7924,0.7865,0.7804,0.774,0.7673,0.7604,0.7533,0.746,0.7385,0.7309,0.7232,0.7153,0.7075,0.6996,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6966,0.6996,0.7075,0.7153,0.7232,0.7309,0.7385,0.746,0.7533,0.7604,0.7673,0.774,0.7804,0.7865,0.7924,0.7981,0.8033,0.8082,0.8128,0.817,0.8209,0.8242,0.8272,0.8297,0.8318,0.8333,0.8344,0.8351,0.8353,0.8351,0.8344,0.8333,0.8318,0.8297,0.8272,0.8242,0.8209,0.8171,0.8128,0.8082,0.8033,0.7981,0.7924,0.7865],
  sunny: [0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889,0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889,0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889,0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889,0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889,0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889,0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889,0.8947,0.8889,0.8692,0.8422,0.8196,0.799,0.7784,0.7619,0.7558,0.7619,0.7784,0.799,0.8196,0.8422,0.8692,0.8889],
  cookie4: [0.65,0.6521,0.6587,0.6703,0.6877,0.7129,0.7404,0.7683,0.7931,0.8149,0.8334,0.8489,0.8613,0.8708,0.8775,0.8815,0.8828,0.8815,0.8775,0.8708,0.8613,0.8489,0.8334,0.8149,0.7931,0.7683,0.7404,0.7129,0.6877,0.6703,0.6587,0.6521,0.65,0.6521,0.6587,0.6703,0.6877,0.7129,0.7404,0.7683,0.7931,0.8149,0.8334,0.8489,0.8613,0.8708,0.8775,0.8815,0.8828,0.8815,0.8775,0.8708,0.8613,0.8489,0.8334,0.8149,0.7931,0.7683,0.7404,0.7129,0.6877,0.6703,0.6587,0.6521,0.65,0.6521,0.6587,0.6703,0.6877,0.7129,0.7404,0.7683,0.7931,0.8149,0.8334,0.8489,0.8613,0.8708,0.8775,0.8815,0.8828,0.8815,0.8775,0.8708,0.8613,0.8489,0.8334,0.8149,0.7931,0.7683,0.7404,0.7129,0.6877,0.6703,0.6587,0.6521,0.65,0.6521,0.6587,0.6703,0.6877,0.7129,0.7404,0.7683,0.7931,0.8149,0.8334,0.8489,0.8613,0.8708,0.8775,0.8815,0.8828,0.8815,0.8775,0.8708,0.8613,0.8489,0.8334,0.8149,0.7931,0.7683,0.7404,0.7129,0.6877,0.6703,0.6587,0.6521],
  oval: [0.7195,0.7055,0.6922,0.6803,0.6687,0.6588,0.6492,0.641,0.6334,0.6268,0.6214,0.6161,0.6128,0.6095,0.6074,0.6063,0.6052,0.6063,0.6074,0.6095,0.6128,0.6161,0.6214,0.6268,0.6334,0.641,0.6492,0.6588,0.6687,0.6803,0.6922,0.7055,0.7195,0.7344,0.7502,0.7666,0.7838,0.8013,0.8191,0.837,0.8545,0.8713,0.8871,0.9014,0.9139,0.9242,0.9317,0.9364,0.9381,0.9364,0.9317,0.9242,0.9139,0.9014,0.8871,0.8713,0.8544,0.837,0.8191,0.8013,0.7838,0.7666,0.7502,0.7344,0.7195,0.7055,0.6922,0.6803,0.6687,0.6588,0.6492,0.641,0.6334,0.6268,0.6214,0.6161,0.6128,0.6095,0.6074,0.6063,0.6052,0.6063,0.6074,0.6095,0.6128,0.6161,0.6214,0.6268,0.6334,0.641,0.6492,0.6588,0.6687,0.6803,0.6922,0.7055,0.7195,0.7344,0.7502,0.7666,0.7838,0.8013,0.8191,0.837,0.8544,0.8713,0.8871,0.9014,0.9139,0.9242,0.9317,0.9364,0.9381,0.9364,0.9317,0.9242,0.9139,0.9014,0.8871,0.8713,0.8545,0.837,0.8191,0.8013,0.7838,0.7666,0.7502,0.7344],
  // A plain circle for the determinate morph (Circle → SoftBurst), sized to sit
  // between the shapes' extents.
  circle: Array.from({ length: SAMPLES }, () => 0.88),
}

/** Radii → points on the unit circle (θ matches the sampling used to trace). */
function radiiToPoints(r: number[]): P[] {
  return r.map((rv, k) => {
    const th = -Math.PI + (2 * Math.PI * k) / SAMPLES
    return [Math.cos(th) * rv, Math.sin(th) * rv]
  })
}

const UNIT: Record<string, P[]> = Object.fromEntries(
  Object.keys(FIGMA_RADII).map((name) => [name, radiiToPoints(FIGMA_RADII[name])]),
)

const SEQUENCE = ['softBurst', 'cookie9', 'pentagon', 'pill', 'sunny', 'cookie4', 'oval']
// Cadence measured from the m3.material.io reference (~0.6–0.67s/shape): hold
// ~350ms then a ~300ms springy morph. Each step also kicks the rotation by 90°,
// over a linear global rotation.
const HOLD_MS = 350
const MORPH_MS = 300
const GLOBAL_ROTATION_MS = 4666
// Subtle "centrifugal" scale pulse: normal size at rest, growing slightly mid-
// morph (while it spins) and returning to 1 by the next hold.
const SCALE_PULSE = 0.07
// Analytic underdamped spring step-response for the morph (dampingRatio 0.6),
// giving the Expressive ease-in + overshoot; effectively settled within
// MORPH_MS.
const SPRING_ZETA = 0.6
const SPRING_WN = 16.7
const SPRING_WD = SPRING_WN * Math.sqrt(1 - SPRING_ZETA * SPRING_ZETA)
function springStep(te: number) {
  return (
    1 -
    Math.exp(-SPRING_ZETA * SPRING_WN * te) *
      (Math.cos(SPRING_WD * te) + ((SPRING_ZETA * SPRING_WN) / SPRING_WD) * Math.sin(SPRING_WD * te))
  )
}

function lerpPts(a: P[], b: P[], t: number): P[] {
  return a.map(([ax, ay], i) => [ax + (b[i][0] - ax) * t, ay + (b[i][1] - ay) * t])
}
function toPath(pts: P[]): string {
  return (
    pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${(CENTER + x * ACTIVE_RADIUS).toFixed(2)} ${(CENTER + y * ACTIVE_RADIUS).toFixed(2)}`)
      .join(' ') + ' Z'
  )
}
function clampProgress(v: number) {
  return Math.min(1, Math.max(0, v))
}

/**
 * Material Design 3 (Expressive) Loading indicator.
 *
 * A 48dp indicator whose 38dp active shape morphs through the seven Material
 * shapes (SoftBurst → Cookie9 → Pentagon → Pill → Sunny → Cookie4 → Oval) while
 * spinning. The shapes are traced from the official Material 3 Design Kit
 * vectors; the morph + per-step 90° kick run on a spring (dampingRatio 0.6) over
 * a linear global rotation, with cadence measured from the m3.material.io
 * reference. `contained` puts the OnPrimaryContainer shape on a PrimaryContainer
 * circle; `value` gives the determinate form (Circle → SoftBurst).
 */
export const LoadingIndicator = forwardRef<SVGSVGElement, LoadingIndicatorProps>(
  function LoadingIndicator(
    { value, variant = 'uncontained', size = 48, color, containerColor, className, style, ...rest },
    ref,
  ) {
    const indeterminate = value == null
    const progress = indeterminate ? 0 : clampProgress(value)

    const [frame, setFrame] = useState(() =>
      indeterminate
        ? { d: toPath(UNIT[SEQUENCE[0]]), rot: 0, scale: 1 }
        : { d: toPath(lerpPts(UNIT.circle, UNIT.softBurst, progress)), rot: progress * 90, scale: 1 },
    )

    useEffect(() => {
      if (!indeterminate) {
        setFrame({ d: toPath(lerpPts(UNIT.circle, UNIT.softBurst, progress)), rot: progress * 90, scale: 1 })
        return
      }
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        setFrame({ d: toPath(UNIT[SEQUENCE[0]]), rot: 0, scale: 1 })
        return
      }

      let raf = 0
      let startTime: number | undefined
      let prevTime: number | undefined
      let idx = 0
      let mode: 'hold' | 'morph' = 'hold'
      let elapsed = 0 // ms spent in the current phase
      let rotAccum = 0

      const tick = (t: number) => {
        if (startTime == null) startTime = t
        if (prevTime == null) prevTime = t
        const dt = Math.min(0.05, (t - prevTime) / 1000)
        prevTime = t

        let x = 0 // morph progress (spring), overshoots past 1
        let pulse = 0 // 0 at holds, 1 mid-morph
        if (mode === 'hold') {
          elapsed += dt * 1000
          if (elapsed >= HOLD_MS) {
            mode = 'morph'
            elapsed = 0
          }
        } else {
          elapsed += dt * 1000
          x = springStep(elapsed / 1000)
          pulse = Math.sin(Math.PI * Math.min(1, elapsed / MORPH_MS))
          if (elapsed >= MORPH_MS) {
            idx = (idx + 1) % SEQUENCE.length
            rotAccum = (rotAccum + 90) % 360
            mode = 'hold'
            elapsed = 0
            x = 0
            pulse = 0
          }
        }

        const global = (((t - startTime) / GLOBAL_ROTATION_MS) * 360) % 360
        const shapeT = Math.min(1, Math.max(0, x))
        const a = UNIT[SEQUENCE[idx]]
        const b = UNIT[SEQUENCE[(idx + 1) % SEQUENCE.length]]
        // Shape eases to the target (clamped); rotation keeps the spring
        // overshoot for the Expressive kick; a slight scale pulse mid-morph
        // reads as centrifugal growth.
        setFrame({ d: toPath(lerpPts(a, b, shapeT)), rot: global + rotAccum + x * 90, scale: 1 + SCALE_PULSE * pulse })
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }, [indeterminate, progress])

    const shapeColor =
      color ?? (variant === 'contained' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-primary)')

    const rootStyle = {
      ...style,
      '--_shape-color': shapeColor,
      '--_container-color': containerColor ?? 'var(--md-sys-color-primary-container)',
    } as CSSProperties

    return (
      <svg
        ref={ref}
        {...rest}
        role="progressbar"
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : 1}
        aria-valuenow={indeterminate ? undefined : progress}
        data-indeterminate={indeterminate || undefined}
        data-variant={variant}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width={size}
        height={size}
        className={clsx(styles.svg, className)}
        style={rootStyle}
      >
        {variant === 'contained' && (
          <circle className={styles.container} cx={CENTER} cy={CENTER} r={CENTER} />
        )}
        <g
          transform={`translate(${CENTER} ${CENTER}) rotate(${frame.rot}) scale(${frame.scale}) translate(${-CENTER} ${-CENTER})`}
        >
          <path className={styles.shape} d={frame.d} />
        </g>
      </svg>
    )
  },
)
