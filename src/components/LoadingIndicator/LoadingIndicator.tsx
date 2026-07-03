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
   Shape geometry — reconstructed from androidx.compose.material3 MaterialShapes
   (RoundedPolygon.star / customPolygon definitions). Each shape is built as a
   dense rounded outline, centered on its bounding box, then resampled at a
   fixed count of equal-angle points so shapes share a common center and a
   1:1 point correspondence for smooth vertex-interpolated morphing.
   =========================================================================== */

const SAMPLES = 96
const VIEWBOX = 48
const CENTER = VIEWBOX / 2
const ACTIVE_RADIUS = 19 // 38dp active shape inside the 48dp container

type P = [number, number]
type Vert = { p: P; round: number }

function rotate([x, y]: P, a: number): P {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [x * c - y * s, x * s + y * c]
}

/** RoundedPolygon.star(n, innerRadius, rounding): 2n alternating outer/inner vertices. */
function starVerts(n: number, inner: number, round: number, phase = 0): Vert[] {
  const v: Vert[] = []
  for (let i = 0; i < n; i += 1) {
    v.push({ p: rotate([1, 0], phase + (2 * Math.PI * i) / n), round })
    v.push({ p: rotate([inner, 0], phase + (2 * Math.PI * (i + 0.5)) / n), round })
  }
  return v
}

/** customPolygon: repeat `points` `reps` times, rotating each block by i*360/reps. */
function customVerts(points: Vert[], reps: number): Vert[] {
  const v: Vert[] = []
  for (let i = 0; i < reps; i += 1) {
    const a = (2 * Math.PI * i) / reps
    for (const pt of points) v.push({ p: rotate(pt.p, a), round: pt.round })
  }
  return v
}

const SHAPE_VERTS: Record<string, Vert[]> = {
  // 8-point cookie, inner 0.8, gentle rounding.
  sunny: starVerts(8, 0.8, 0.15),
  // 9-point cookie, inner 0.8, heavy rounding, rotated -90°.
  cookie9: starVerts(9, 0.8, 0.5, -Math.PI / 2),
  // 10-fold soft burst: outer ≈0.55 / inner ≈0.38 (from customPolygon points).
  softBurst: customVerts(
    [
      { p: [-0.307, -0.223], round: 0.053 },
      { p: [-0.324, -0.445], round: 0.053 },
    ],
    10,
  ),
  // 4-lobed cookie: a rounded square with gently scooped (concave) sides.
  cookie4: customVerts(
    [
      { p: [0.7, 0.7], round: 0.42 },
      { p: [0, 0.5], round: 0.5 },
    ],
    4,
  ),
  // Convex pentagon, apex up.
  pentagon: [
    { p: [0, -0.509], round: 0.172 },
    { p: [0.53, -0.135], round: 0.164 },
    { p: [0.328, 0.47], round: 0.169 },
    { p: [-0.328, 0.47], round: 0.169 },
    { p: [-0.53, -0.135], round: 0.164 },
  ],
}

function quad(a: P, b: P, c: P, t: number): P {
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]
}

/** Dense rounded outline from vertices, rounding each corner with a quad bezier. */
function roundedOutline(verts: Vert[]): P[] {
  const n = verts.length
  const inP: P[] = []
  const outP: P[] = []
  for (let i = 0; i < n; i += 1) {
    const V = verts[i].p
    const A = verts[(i - 1 + n) % n].p
    const B = verts[(i + 1) % n].p
    const f = Math.min(0.5, Math.max(0, verts[i].round * 0.5))
    inP[i] = [V[0] + f * (A[0] - V[0]), V[1] + f * (A[1] - V[1])]
    outP[i] = [V[0] + f * (B[0] - V[0]), V[1] + f * (B[1] - V[1])]
  }
  const out: P[] = []
  for (let i = 0; i < n; i += 1) {
    for (let s = 0; s <= 10; s += 1) out.push(quad(inP[i], verts[i].p, outP[i], s / 10))
    const j = (i + 1) % n
    for (let s = 1; s < 4; s += 1) {
      const t = s / 4
      out.push([outP[i][0] + (inP[j][0] - outP[i][0]) * t, outP[i][1] + (inP[j][1] - outP[i][1]) * t])
    }
  }
  return out
}

function ellipseOutline(a: number, b: number, rot: number, m = 240): P[] {
  const out: P[] = []
  for (let i = 0; i < m; i += 1) out.push(rotate([Math.cos((2 * Math.PI * i) / m) * a, Math.sin((2 * Math.PI * i) / m) * b], rot))
  return out
}

/** Stadium (capsule) outline: straight half-length `s`, radius `w`. */
function capsuleOutline(s: number, w: number, m = 240): P[] {
  const out: P[] = []
  for (let i = 0; i < m; i += 1) {
    const t = (i / m) * 2 * Math.PI
    // Right cap on [-90°,90°], left cap on [90°,270°]; straight sides connect them.
    if (t <= Math.PI / 2 || t >= (3 * Math.PI) / 2) out.push([s + w * Math.cos(t), w * Math.sin(t)])
    else out.push([-s + w * Math.cos(t), w * Math.sin(t)])
  }
  return out
}

const DENSE: Record<string, P[]> = {
  softBurst: roundedOutline(SHAPE_VERTS.softBurst),
  cookie9: roundedOutline(SHAPE_VERTS.cookie9),
  pentagon: roundedOutline(SHAPE_VERTS.pentagon),
  pill: capsuleOutline(0.6, 0.4),
  sunny: roundedOutline(SHAPE_VERTS.sunny),
  cookie4: roundedOutline(SHAPE_VERTS.cookie4),
  oval: ellipseOutline(1, 0.64, -Math.PI / 4),
  circle: ellipseOutline(1, 1, 0),
}

/** Center a dense outline on its bounding box, then sample K equal-angle points
 *  (ray-cast radius), normalized so the max extent is 1 — shared center + 1:1
 *  point correspondence for morphing. */
function toUnit(dense: P[]): P[] {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of dense) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const ar = dense
    .map(([x, y]) => ({ a: Math.atan2(y - cy, x - cx), r: Math.hypot(x - cx, y - cy) }))
    .sort((p, q) => p.a - q.a)

  const radiusAt = (th: number) => {
    for (let i = 0; i < ar.length; i += 1) {
      const cur = ar[i]
      const nxt = ar[(i + 1) % ar.length]
      let a1 = nxt.a
      if (a1 < cur.a) a1 += 2 * Math.PI
      let t = th
      if (t < cur.a) t += 2 * Math.PI
      if (t >= cur.a && t <= a1) {
        const f = a1 === cur.a ? 0 : (t - cur.a) / (a1 - cur.a)
        return cur.r + (nxt.r - cur.r) * f
      }
    }
    return ar[0].r
  }

  const pts: P[] = []
  let maxr = 0
  for (let k = 0; k < SAMPLES; k += 1) {
    const th = -Math.PI + (2 * Math.PI * k) / SAMPLES
    const r = radiusAt(th)
    maxr = Math.max(maxr, r)
    pts.push([Math.cos(th) * r, Math.sin(th) * r])
  }
  return pts.map(([x, y]) => [x / maxr, y / maxr] as P)
}

const UNIT: Record<string, P[]> = Object.fromEntries(
  Object.keys(DENSE).map((name) => [name, toUnit(DENSE[name])]),
)

const SEQUENCE = ['softBurst', 'cookie9', 'pentagon', 'pill', 'sunny', 'cookie4', 'oval']
const HOLD_MS = 650
const GLOBAL_ROTATION_MS = 4666
// Compose morph spring: dampingRatio 0.6, stiffness 200 (StiffnessLow).
const SPRING_STIFFNESS = 200
const SPRING_DAMPING = 0.6
const OMEGA = Math.sqrt(SPRING_STIFFNESS)

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
 * A 48dp indicator whose 38dp active shape morphs through the seven
 * `MaterialShapes` (SoftBurst → Cookie9 → Pentagon → Pill → Sunny → Cookie4 →
 * Oval) while spinning — per Compose LoadingIndicator. Shapes are reconstructed
 * from the MaterialShapes geometry and centered; the morph + per-step 90° kick
 * run on a spring (damping 0.6, stiffness 200) over a linear global rotation,
 * for the Expressive ease-in/overshoot feel. `contained` puts the
 * OnPrimaryContainer shape on a PrimaryContainer circle; `value` gives the
 * determinate form (Circle → SoftBurst).
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
        ? { d: toPath(UNIT[SEQUENCE[0]]), rot: 0 }
        : { d: toPath(lerpPts(UNIT.circle, UNIT.softBurst, progress)), rot: progress * 90 },
    )

    useEffect(() => {
      if (!indeterminate) {
        setFrame({ d: toPath(lerpPts(UNIT.circle, UNIT.softBurst, progress)), rot: progress * 90 })
        return
      }
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        setFrame({ d: toPath(UNIT[SEQUENCE[0]]), rot: 0 })
        return
      }

      let raf = 0
      let startTime: number | undefined
      let prevTime: number | undefined
      let idx = 0
      let prog = 0
      let vel = 0
      let mode: 'hold' | 'morph' = 'hold'
      let holdElapsed = 0
      let rotAccum = 0

      const tick = (t: number) => {
        if (startTime == null) startTime = t
        if (prevTime == null) prevTime = t
        const dt = Math.min(0.05, (t - prevTime) / 1000)
        prevTime = t

        if (mode === 'hold') {
          holdElapsed += dt * 1000
          if (holdElapsed >= HOLD_MS) {
            mode = 'morph'
            prog = 0
            vel = 0
          }
        } else {
          // Under-damped spring toward 1 (overshoots → Expressive feel).
          const acc = -OMEGA * OMEGA * (prog - 1) - 2 * SPRING_DAMPING * OMEGA * vel
          vel += acc * dt
          prog += vel * dt
          if (Math.abs(prog - 1) < 0.002 && Math.abs(vel) < 0.02) {
            idx = (idx + 1) % SEQUENCE.length
            rotAccum = (rotAccum + 90) % 360
            prog = 0
            vel = 0
            mode = 'hold'
            holdElapsed = 0
          }
        }

        const global = (((t - startTime) / GLOBAL_ROTATION_MS) * 360) % 360
        const shapeT = Math.min(1, Math.max(0, prog))
        const a = UNIT[SEQUENCE[idx]]
        const b = UNIT[SEQUENCE[(idx + 1) % SEQUENCE.length]]
        setFrame({ d: toPath(lerpPts(a, b, shapeT)), rot: global + rotAccum + prog * 90 })
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
          className={styles.shapeGroup}
          style={{ transform: `rotate(${frame.rot}deg)` }}
        >
          <path className={styles.shape} d={frame.d} />
        </g>
      </svg>
    )
  },
)
