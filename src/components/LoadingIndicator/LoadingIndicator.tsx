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

/* ---- Shape geometry (radial approximations of the MaterialShapes used by
   Compose LoadingIndicator: SoftBurst, Cookie9Sided, Pentagon, Pill, Sunny,
   Cookie4Sided, Oval, plus Circle for the determinate morph). --------------- */

const SAMPLES = 64
const VIEWBOX = 48
const CENTER = VIEWBOX / 2
const ACTIVE_RADIUS = 19 // 38dp active shape inside the 48dp container

function ellipseR(theta: number, a: number, b: number, rot: number) {
  const t = theta - rot
  return 1 / Math.hypot(Math.cos(t) / a, Math.sin(t) / b)
}
function polygonR(theta: number, n: number, phase: number) {
  const seg = (2 * Math.PI) / n
  const a = (((theta - phase) % seg) + seg) % seg
  return Math.cos(Math.PI / n) / Math.cos(a - Math.PI / n)
}

const RADIAL: Record<string, (theta: number) => number> = {
  softBurst: (t) => 0.82 + 0.18 * Math.cos(10 * t),
  cookie9: (t) => 0.9 + 0.1 * Math.cos(9 * t - Math.PI / 2),
  pentagon: (t) => 0.85 * polygonR(t, 5, -Math.PI / 2) + 0.15,
  pill: (t) => ellipseR(t, 1, 0.42, 0),
  sunny: (t) => 0.87 + 0.13 * Math.cos(8 * t),
  cookie4: (t) => 0.85 + 0.15 * Math.cos(4 * t),
  oval: (t) => ellipseR(t, 1, 0.64, -Math.PI / 4),
  circle: () => 1,
}

type Pts = Array<[number, number]>

/** Sample a radial shape into unit points normalized to a max extent of 1. */
function unitPoints(name: string): Pts {
  const fn = RADIAL[name]
  const raw: Pts = []
  let max = 0
  for (let i = 0; i < SAMPLES; i += 1) {
    const th = (2 * Math.PI * i) / SAMPLES
    const r = fn(th)
    max = Math.max(max, r)
    raw.push([Math.cos(th) * r, Math.sin(th) * r])
  }
  return raw.map(([x, y]) => [x / max, y / max])
}

const UNIT: Record<string, Pts> = Object.fromEntries(
  Object.keys(RADIAL).map((name) => [name, unitPoints(name)]),
)

const SEQUENCE = [
  'softBurst',
  'cookie9',
  'pentagon',
  'pill',
  'sunny',
  'cookie4',
  'oval',
]
const STEP_MS = 650

function lerpPts(a: Pts, b: Pts, t: number): Pts {
  return a.map(([ax, ay], i) => [ax + (b[i][0] - ax) * t, ay + (b[i][1] - ay) * t])
}
function toPath(pts: Pts): string {
  return (
    pts
      .map(
        ([x, y], i) =>
          `${i === 0 ? 'M' : 'L'} ${(CENTER + x * ACTIVE_RADIUS).toFixed(2)} ${(
            CENTER +
            y * ACTIVE_RADIUS
          ).toFixed(2)}`,
      )
      .join(' ') + ' Z'
  )
}
/** easeOutBack — a springy overshoot approximating the Compose morph spring. */
function easeSpring(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

function clampProgress(v: number) {
  return Math.min(1, Math.max(0, v))
}

/**
 * Material Design 3 (Expressive) Loading indicator.
 *
 * A 48dp indicator whose 38dp active shape morphs through the seven
 * `MaterialShapes` (SoftBurst → Cookie9 → Pentagon → Pill → Sunny → Cookie4 →
 * Oval) while spinning — per Compose LoadingIndicator. `contained` places the
 * OnPrimaryContainer shape on a PrimaryContainer circle; `value` gives the
 * determinate form (Circle → SoftBurst morph). Distinct from ProgressIndicator.
 */
export const LoadingIndicator = forwardRef<SVGSVGElement, LoadingIndicatorProps>(
  function LoadingIndicator(
    { value, variant = 'uncontained', size = 48, color, containerColor, className, style, ...rest },
    ref,
  ) {
    const indeterminate = value == null
    const progress = indeterminate ? 0 : clampProgress(value)

    const [path, setPath] = useState(() =>
      indeterminate
        ? toPath(UNIT[SEQUENCE[0]])
        : toPath(lerpPts(UNIT.circle, UNIT.softBurst, progress)),
    )

    useEffect(() => {
      if (!indeterminate) {
        setPath(toPath(lerpPts(UNIT.circle, UNIT.softBurst, progress)))
        return
      }
      let raf = 0
      let start: number | undefined
      const total = SEQUENCE.length * STEP_MS
      const tick = (t: number) => {
        if (start == null) start = t
        const p = ((t - start) % total) / STEP_MS
        const seg = Math.floor(p) % SEQUENCE.length
        const local = easeSpring(p - Math.floor(p))
        const a = UNIT[SEQUENCE[seg]]
        const b = UNIT[SEQUENCE[(seg + 1) % SEQUENCE.length]]
        setPath(toPath(lerpPts(a, b, local)))
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }, [indeterminate, progress])

    const shapeColor =
      color ??
      (variant === 'contained'
        ? 'var(--md-sys-color-on-primary-container)'
        : 'var(--md-sys-color-primary)')

    const rootStyle = {
      ...style,
      '--_shape-color': shapeColor,
      '--_container-color':
        containerColor ?? 'var(--md-sys-color-primary-container)',
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
          className={indeterminate ? styles.spin : undefined}
          style={
            indeterminate
              ? undefined
              : { transformBox: 'fill-box', transformOrigin: 'center', transform: `rotate(${progress * 90}deg)` }
          }
        >
          <path className={styles.shape} d={path} />
        </g>
      </svg>
    )
  },
)
