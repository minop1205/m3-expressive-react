import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type SVGAttributes,
} from 'react'
import clsx from 'clsx'
import styles from './ProgressIndicator.module.css'
import type { ProgressIndicatorShape } from './LinearProgressIndicator'

/** Stroke thickness in dp. The two baseline values are 4 and 8, but any number is accepted. */
export type CircularProgressIndicatorThickness = number

export interface CircularProgressIndicatorProps
  extends Omit<SVGAttributes<SVGSVGElement>, 'role'> {
  /** Progress value from 0 to 1. Omit for indeterminate progress. */
  value?: number
  /**
   * Outer diameter of the indicator in pixels. The stroke thickness, the 4dp
   * track gap and the wave keep their dp size whatever the diameter.
   * @default 40 (flat) / 48 (wavy) for a 4dp thickness; each extra dp of
   * thickness adds 1 (flat 8dp = 44, wavy 8dp = 52)
   */
  size?: number
  /** Indicator thickness in dp. @default 4 */
  thickness?: CircularProgressIndicatorThickness
  /** Indicator shape. @default "flat" */
  shape?: ProgressIndicatorShape
}

/** Compose CircularProgressIndicatorTokens.Size / WaveSize (4dp thickness). */
const FLAT_SIZE = 40
const WAVY_SIZE = 48
const BASE_THICKNESS = 4
const GAP = 4
const WAVY_AMPLITUDE = 1.6
const WAVY_WAVELENGTH = 15
const PROGRESS_TRANSITION_DURATION_MS = 600
const AMPLITUDE_TRANSITION_DURATION_MS = 500
// Indeterminate motion — Compose ProgressIndicator.kt
// (`circularIndeterminate*AnimationSpec`), shared by flat and wavy.
const INDETERMINATE_DURATION_MS = 6000
const INDETERMINATE_GLOBAL_ROTATION = 1080
const INDETERMINATE_MIN_PROGRESS = 0.1
const INDETERMINATE_MAX_PROGRESS = 0.87
const ADDITIONAL_ROTATION_DELAY_MS = 1500
const ADDITIONAL_ROTATION_DURATION_MS = 300
/**
 * Frame shown under prefers-reduced-motion. The arc then keeps only a slow
 * constant rotation (CSS), without the sweep growing and shrinking (B3).
 */
const REDUCED_MOTION_FRAME_MS = 1800
const MIN_CIRCULAR_VERTEX_COUNT = 5

type Point = { x: number; y: number }

function cubicBezier(
  progress: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const sampleCurveX = (time: number) =>
    ((1 - 3 * x2 + 3 * x1) * time + (3 * x2 - 6 * x1)) * time * time +
    3 * x1 * time
  const sampleCurveY = (time: number) =>
    ((1 - 3 * y2 + 3 * y1) * time + (3 * y2 - 6 * y1)) * time * time +
    3 * y1 * time
  const sampleCurveDerivativeX = (time: number) =>
    (3 * (1 - 3 * x2 + 3 * x1) * time + 2 * (3 * x2 - 6 * x1)) *
      time +
    3 * x1

  let time = progress

  for (let index = 0; index < 4; index += 1) {
    const currentX = sampleCurveX(time) - progress
    const currentSlope = sampleCurveDerivativeX(time)

    if (Math.abs(currentX) < 0.001 || currentSlope === 0) {
      break
    }

    time -= currentX / currentSlope
  }

  return sampleCurveY(Math.min(1, Math.max(0, time)))
}

function standardEasing(progress: number) {
  return cubicBezier(progress, 0.2, 0, 0, 1)
}

function emphasizedAccelerateEasing(progress: number) {
  return cubicBezier(progress, 0.3, 0, 0.8, 0.15)
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value))
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

function getWavyTargetAmplitude(progress: number) {
  if (progress <= 0.1 || progress >= 0.95) {
    return 0
  }

  return WAVY_AMPLITUDE
}

/**
 * Gap (as a fraction of the circumference) between the active arc and the
 * track. It shrinks with the sweep at low progress (Compose
 * `min(sweep, gapSizeSweep)`), so the arc and track do not jump apart. The
 * stroke width is added because the round caps overhang both arcs.
 */
function getGapFraction(
  sweep: number,
  circumference: number,
  strokeWidth: number,
) {
  return Math.min(sweep, (GAP + strokeWidth) / circumference)
}

/** Track arc after the active arc, as pathLength=1 dash values. */
function getTrackArc(sweep: number, circumference: number, strokeWidth: number) {
  if (sweep <= 0) {
    return { dasharray: '1 0', dashoffset: 0 }
  }

  if (sweep >= 1) {
    return null
  }

  const gap = getGapFraction(sweep, circumference, strokeWidth)
  const trackLength = Math.max(0, 1 - sweep - gap * 2)

  if (trackLength <= 0) {
    return null
  }

  return {
    dasharray: `${trackLength} ${1 - trackLength}`,
    dashoffset: -(sweep + gap),
  }
}

function polarToPoint(center: number, radius: number, angle: number): Point {
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  }
}

function rotatePoint(center: number, point: Point, angle: number): Point {
  const x = point.x - center
  const y = point.y - center
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: center + x * cos - y * sin,
    y: center + x * sin + y * cos,
  }
}

function getCircularVertexCount(radius: number) {
  return Math.max(
    MIN_CIRCULAR_VERTEX_COUNT,
    Math.round((2 * Math.PI * radius) / WAVY_WAVELENGTH),
  )
}

function getCircularWavyPath(
  progress: number,
  center: number,
  radius: number,
  phase: number,
  amplitude: number,
) {
  if (progress <= 0) {
    return ''
  }

  const circumference = 2 * Math.PI * radius
  const vertexCount = getCircularVertexCount(radius)
  const sampleCount = vertexCount * 24
  const samples: Array<Point & { distance: number }> = []
  let totalLength = 0

  for (let index = 0; index <= sampleCount; index += 1) {
    const fraction = index / sampleCount
    const angle = -Math.PI / 2 + Math.PI * 2 * fraction
    const wave = Math.cos(fraction * vertexCount * Math.PI * 2)
    const point = polarToPoint(center, radius + wave * amplitude, angle)

    if (index > 0) {
      const previous = samples[index - 1]
      totalLength += Math.hypot(point.x - previous.x, point.y - previous.y)
    }

    samples.push({ ...point, distance: totalLength })
  }

  const phaseDistance = (phase / circumference) * totalLength
  const rotation = -(phase / circumference) * Math.PI * 2
  const segmentLength = progress * totalLength
  const steps = Math.max(8, Math.ceil(progress * vertexCount * 10))
  let path = ''

  for (let index = 0; index <= steps; index += 1) {
    const fraction = index / steps
    const distance = (phaseDistance + segmentLength * fraction) % totalLength
    let sampleIndex = 1

    while (
      sampleIndex < samples.length - 1 &&
      samples[sampleIndex].distance < distance
    ) {
      sampleIndex += 1
    }

    const previous = samples[sampleIndex - 1]
    const next = samples[sampleIndex]
    const span = next.distance - previous.distance || 1
    const sampleFraction = (distance - previous.distance) / span
    const point = rotatePoint(
      center,
      {
        x: previous.x + (next.x - previous.x) * sampleFraction,
        y: previous.y + (next.y - previous.y) * sampleFraction,
      },
      rotation,
    )

    path += `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(3)} ${point.y.toFixed(3)} `
  }

  return path.trim()
}

function getCircularArcPath(
  startProgress: number,
  endProgress: number,
  center: number,
  radius: number,
) {
  if (endProgress <= startProgress) {
    return ''
  }

  const startAngle = -Math.PI / 2 + Math.PI * 2 * startProgress
  const endAngle = -Math.PI / 2 + Math.PI * 2 * endProgress
  const steps = Math.max(4, Math.ceil((endProgress - startProgress) * 48))
  let path = ''

  for (let index = 0; index <= steps; index += 1) {
    const fraction = index / steps
    const angle = startAngle + (endAngle - startAngle) * fraction
    const point = polarToPoint(center, radius, angle)

    path += `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(3)} ${point.y.toFixed(3)} `
  }

  return path.trim()
}

/**
 * Indeterminate sweep: 0.1 → 0.87 over the first 3000ms (linear — Compose's
 * keyframe easing applies to the interval *starting* at a keyframe), then
 * back to 0.1 with standard easing (`CircularProgressEasing`).
 */
export function getIndeterminateSweep(cycleTime: number) {
  const half = INDETERMINATE_DURATION_MS / 2
  const range = INDETERMINATE_MAX_PROGRESS - INDETERMINATE_MIN_PROGRESS

  if (cycleTime <= half) {
    return INDETERMINATE_MIN_PROGRESS + range * (cycleTime / half)
  }

  return (
    INDETERMINATE_MAX_PROGRESS -
    range * standardEasing((cycleTime - half) / half)
  )
}

/**
 * Additional rotation: +90° over 300ms (linear), then hold until the next
 * 1500ms step — four steps per 6000ms cycle.
 */
export function getAdditionalRotation(cycleTime: number) {
  const step = Math.floor(cycleTime / ADDITIONAL_ROTATION_DELAY_MS)
  const stepTime = cycleTime - step * ADDITIONAL_ROTATION_DELAY_MS
  const stepProgress = Math.min(1, stepTime / ADDITIONAL_ROTATION_DURATION_MS)

  return step * 90 + 90 * stepProgress
}

/** Global linear rotation (1080° per cycle) + the stepped additional rotation. */
export function getIndeterminateRotation(cycleTime: number) {
  return (
    (INDETERMINATE_GLOBAL_ROTATION * cycleTime) / INDETERMINATE_DURATION_MS +
    getAdditionalRotation(cycleTime)
  )
}

export const CircularProgressIndicator = forwardRef<
  SVGSVGElement,
  CircularProgressIndicatorProps
>(function CircularProgressIndicator(
  {
    value,
    size: sizeProp,
    thickness = 4,
    shape = 'flat',
    className,
    style,
    ...rest
  },
  ref,
) {
  const [wavyPhase, setWavyPhase] = useState(0)
  const [indeterminateCycleTime, setIndeterminateCycleTime] = useState(0)
  const indeterminate = value == null
  const wavy = shape === 'wavy'
  const progress = indeterminate ? undefined : clampProgress(value)
  const determinateProgress = progress ?? 0
  const [wavyVisualProgress, setWavyVisualProgress] =
    useState(determinateProgress)
  const displayProgress = wavy ? wavyVisualProgress : determinateProgress
  const targetWavyAmplitude = getWavyTargetAmplitude(displayProgress)
  const [wavyAmplitude, setWavyAmplitude] = useState(() =>
    getWavyTargetAmplitude(determinateProgress),
  )

  // Geometry in real px: the viewBox matches the rendered size so the stroke,
  // the gap and the wave are never scaled with the diameter.
  const size =
    sizeProp ?? (wavy ? WAVY_SIZE : FLAT_SIZE) + (thickness - BASE_THICKNESS)
  const center = size / 2
  // The stroke (and, for wavy, the wave crest) stays inside the box.
  const radius = Math.max(
    1,
    (size - thickness) / 2 - (wavy ? WAVY_AMPLITUDE : 0),
  )
  const circumference = 2 * Math.PI * radius
  const wavyVertexCount = getCircularVertexCount(radius)
  const wavyActualWavelength = circumference / wavyVertexCount

  const indeterminateSweep = getIndeterminateSweep(indeterminateCycleTime)
  const indeterminateRotation = getIndeterminateRotation(indeterminateCycleTime)
  const sweep = indeterminate ? indeterminateSweep : displayProgress
  const trackArc = getTrackArc(sweep, circumference, thickness)

  const wavyPath = wavy
    ? getCircularWavyPath(
        sweep,
        center,
        radius,
        wavyPhase,
        indeterminate ? WAVY_AMPLITUDE : wavyAmplitude,
      )
    : undefined
  const indeterminateGap = getGapFraction(
    indeterminateSweep,
    circumference,
    thickness,
  )
  const indeterminateWavyTrackPath =
    wavy && indeterminate
      ? getCircularArcPath(
          Math.min(1, indeterminateSweep + indeterminateGap),
          Math.max(0, 1 - indeterminateGap),
          center,
          radius,
        )
      : ''
  const indicatorStyle = {
    ...style,
    '--_progress': sweep,
    '--_remaining-progress': 1 - sweep,
  } as CSSProperties

  useEffect(() => {
    if (!wavy || indeterminate) {
      setWavyVisualProgress(determinateProgress)
      return
    }

    const from = wavyVisualProgress
    const to = determinateProgress

    if (Math.abs(from - to) < 0.001 || prefersReducedMotion()) {
      setWavyVisualProgress(to)
      return
    }

    let animationFrame = 0
    let startTime: number | undefined

    const tick = (time: number) => {
      if (startTime == null) {
        startTime = time
      }

      const elapsed = time - startTime
      const progressTime = Math.min(
        1,
        elapsed / PROGRESS_TRANSITION_DURATION_MS,
      )
      const nextProgress =
        from + (to - from) * standardEasing(progressTime)
      setWavyVisualProgress(nextProgress)

      if (progressTime < 1) {
        animationFrame = requestAnimationFrame(tick)
      }
    }

    animationFrame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [determinateProgress, indeterminate, wavy])

  useEffect(() => {
    if (!wavy || indeterminate) {
      setWavyAmplitude(targetWavyAmplitude)
      return
    }

    const from = wavyAmplitude
    const to = targetWavyAmplitude

    if (Math.abs(from - to) < 0.001 || prefersReducedMotion()) {
      setWavyAmplitude(to)
      return
    }

    const easing =
      from < to ? standardEasing : emphasizedAccelerateEasing
    let animationFrame = 0
    let startTime: number | undefined

    const tick = (time: number) => {
      if (startTime == null) {
        startTime = time
      }

      const elapsed = time - startTime
      const progressTime = Math.min(
        1,
        elapsed / AMPLITUDE_TRANSITION_DURATION_MS,
      )
      const nextAmplitude =
        from + (to - from) * easing(progressTime)
      setWavyAmplitude(nextAmplitude)

      if (progressTime < 1) {
        animationFrame = requestAnimationFrame(tick)
      }
    }

    animationFrame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [indeterminate, targetWavyAmplitude, wavy])

  // Wave travel (1 wavelength / second). Stopped under reduced motion.
  useEffect(() => {
    if (!wavy || (!indeterminate && determinateProgress <= 0)) {
      setWavyPhase(0)
      return
    }
    if (prefersReducedMotion()) {
      setWavyPhase(0)
      return
    }

    let animationFrame = 0
    let previousTime: number | undefined

    const tick = (time: number) => {
      if (previousTime == null) {
        previousTime = time
      }

      const delta = time - previousTime
      previousTime = time
      setWavyPhase((currentPhase) => {
        const nextPhase = currentPhase + (delta * wavyActualWavelength) / 1000
        return nextPhase >= circumference
          ? nextPhase % circumference
          : nextPhase
      })
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [
    circumference,
    determinateProgress,
    indeterminate,
    wavy,
    wavyActualWavelength,
  ])

  // One indeterminate driver for flat and wavy (Compose constants).
  useEffect(() => {
    if (!indeterminate) {
      setIndeterminateCycleTime(0)
      return
    }
    if (prefersReducedMotion()) {
      // Fixed sweep; the CSS keeps a slow constant rotation (B3).
      setIndeterminateCycleTime(REDUCED_MOTION_FRAME_MS)
      return
    }

    let animationFrame = 0
    let startTime: number | undefined

    const tick = (time: number) => {
      if (startTime == null) {
        startTime = time
      }

      setIndeterminateCycleTime(
        (time - startTime) % INDETERMINATE_DURATION_MS,
      )
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [indeterminate])

  const track =
    wavy && indeterminate ? (
      indeterminateWavyTrackPath && (
        <path
          className={styles.circularWavyTrack}
          d={indeterminateWavyTrackPath}
          strokeWidth={thickness}
        />
      )
    ) : (
      trackArc && (
        <circle
          className={styles.circularTrack}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={thickness}
          pathLength={1}
          strokeDasharray={trackArc.dasharray}
          strokeDashoffset={trackArc.dashoffset}
        />
      )
    )

  const indicator = wavy ? (
    <path
      className={styles.circularIndicator}
      d={wavyPath}
      strokeWidth={thickness}
    />
  ) : (
    <circle
      className={styles.circularIndicator}
      cx={center}
      cy={center}
      r={radius}
      strokeWidth={thickness}
      pathLength={1}
    />
  )

  return (
    <svg
      ref={ref}
      {...rest}
      role="progressbar"
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 1}
      aria-valuenow={progress}
      data-indeterminate={indeterminate || undefined}
      data-shape={shape}
      data-thickness={thickness}
      className={clsx(styles.circular, className)}
      style={indicatorStyle}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
    >
      <g
        key={indeterminate ? `indeterminate-${thickness}` : 'determinate'}
        className={styles.circularLayer}
      >
        {indeterminate ? (
          <g
            style={{
              transform: `rotate(${indeterminateRotation}deg)`,
              transformOrigin: 'center',
            }}
          >
            {track}
            {indicator}
          </g>
        ) : (
          <>
            {track}
            {indicator}
          </>
        )}
      </g>
    </svg>
  )
})
