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
  /** Diameter of the indicator in pixels. @default 48 */
  size?: number
  /** Indicator thickness in dp. @default 4 */
  thickness?: CircularProgressIndicatorThickness
  /** Indicator shape. @default "flat" */
  shape?: ProgressIndicatorShape
}

const VIEWBOX_SIZE = 48
const CENTER = VIEWBOX_SIZE / 2
const GAP = 4
const WAVY_AMPLITUDE = 1.6
const WAVY_WAVELENGTH = 15
const PROGRESS_TRANSITION_DURATION_MS = 600
const AMPLITUDE_TRANSITION_DURATION_MS = 500
const INDETERMINATE_DURATION_MS = 6000
const INDETERMINATE_MIN_PROGRESS = 0.1
const INDETERMINATE_MAX_PROGRESS = 0.87
const ADDITIONAL_ROTATION_DELAY_MS = 1500
const ADDITIONAL_ROTATION_DURATION_MS = 1500
const MIN_CIRCULAR_VERTEX_COUNT = 5

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

function emphasizedDecelerateEasing(progress: number) {
  return cubicBezier(progress, 0.05, 0.7, 0.1, 1)
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value))
}

function getWavyTargetAmplitude(progress: number) {
  if (progress <= 0.1 || progress >= 0.95) {
    return 0
  }

  return WAVY_AMPLITUDE
}

function getTrackArc(
  progress: number,
  radius: number,
  strokeWidth: CircularProgressIndicatorThickness,
) {
  if (progress <= 0) {
    return { dasharray: '1 0', dashoffset: 0 }
  }

  if (progress >= 1) {
    return null
  }

  const circumference = 2 * Math.PI * radius
  const gap = (GAP + strokeWidth) / circumference
  const trackLength = Math.max(0, 1 - progress - gap * 2)

  if (trackLength <= 0) {
    return null
  }

  return {
    dasharray: `${trackLength} ${1 - trackLength}`,
    dashoffset: -(progress + gap),
  }
}

function polarToPoint(radius: number, angle: number) {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  }
}

function rotatePoint(point: { x: number; y: number }, angle: number) {
  const x = point.x - CENTER
  const y = point.y - CENTER
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: CENTER + x * cos - y * sin,
    y: CENTER + x * sin + y * cos,
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
  const samples: Array<{ x: number; y: number; distance: number }> = []
  let totalLength = 0

  for (let index = 0; index <= sampleCount; index += 1) {
    const fraction = index / sampleCount
    const angle = -Math.PI / 2 + Math.PI * 2 * fraction
    const wave = Math.cos(fraction * vertexCount * Math.PI * 2)
    const point = polarToPoint(radius + wave * amplitude, angle)

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

function getCircularArcPath(startProgress: number, endProgress: number, radius: number) {
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
    const point = polarToPoint(radius, angle)

    path += `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(3)} ${point.y.toFixed(3)} `
  }

  return path.trim()
}

function getIndeterminateSweep(cycleTime: number) {
  if (cycleTime <= INDETERMINATE_DURATION_MS / 2) {
    return (
      INDETERMINATE_MIN_PROGRESS +
      (INDETERMINATE_MAX_PROGRESS - INDETERMINATE_MIN_PROGRESS) *
        standardEasing(cycleTime / (INDETERMINATE_DURATION_MS / 2))
    )
  }

  return (
    INDETERMINATE_MAX_PROGRESS -
    (INDETERMINATE_MAX_PROGRESS - INDETERMINATE_MIN_PROGRESS) *
      standardEasing(
        (cycleTime - INDETERMINATE_DURATION_MS / 2) /
          (INDETERMINATE_DURATION_MS / 2),
      )
  )
}

function getAdditionalRotation(cycleTime: number) {
  const step = Math.floor(cycleTime / ADDITIONAL_ROTATION_DELAY_MS)
  const stepTime = cycleTime - step * ADDITIONAL_ROTATION_DELAY_MS
  const baseRotation = step * 90

  if (stepTime >= ADDITIONAL_ROTATION_DURATION_MS) {
    return baseRotation + 90
  }

  return (
    baseRotation +
    90 *
      emphasizedDecelerateEasing(stepTime / ADDITIONAL_ROTATION_DURATION_MS)
  )
}

export const CircularProgressIndicator = forwardRef<
  SVGSVGElement,
  CircularProgressIndicatorProps
>(function CircularProgressIndicator(
  {
    value,
    size = 48,
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
  const radius = (VIEWBOX_SIZE - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const wavyVertexCount = getCircularVertexCount(radius)
  const wavyActualWavelength = circumference / wavyVertexCount
  const wavyPath = wavy
    ? getCircularWavyPath(
        displayProgress,
        radius,
        wavyPhase,
        wavyAmplitude,
      )
    : undefined
  const trackArc = indeterminate
    ? undefined
    : getTrackArc(displayProgress, radius, thickness)
  const visualGap = (GAP + thickness) / circumference
  const indeterminateSweep = getIndeterminateSweep(indeterminateCycleTime)
  const indeterminateRotation =
    (1080 * indeterminateCycleTime) / INDETERMINATE_DURATION_MS +
    getAdditionalRotation(indeterminateCycleTime)
  const indeterminateWavyPath =
    wavy && indeterminate
      ? getCircularWavyPath(
          indeterminateSweep,
          radius,
          wavyPhase,
          WAVY_AMPLITUDE,
        )
      : ''
  const indeterminateWavyTrackPath =
    wavy && indeterminate
      ? getCircularArcPath(
          Math.min(1, indeterminateSweep + visualGap),
          Math.max(0, 1 - visualGap),
          radius,
        )
      : ''
  const indicatorStyle = {
    ...style,
    '--_progress': progress ?? 0,
    '--_remaining-progress': 1 - (progress ?? 0),
    '--_circular-gap': visualGap,
    '--_circular-gap-pair': visualGap * 2,
  } as CSSProperties

  useEffect(() => {
    if (!wavy || indeterminate) {
      setWavyVisualProgress(determinateProgress)
      return
    }

    const from = wavyVisualProgress
    const to = determinateProgress

    if (Math.abs(from - to) < 0.001) {
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

    if (Math.abs(from - to) < 0.001) {
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

  useEffect(() => {
    if (!wavy || (!indeterminate && determinateProgress <= 0)) {
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

  useEffect(() => {
    if (!indeterminate || !wavy) {
      setIndeterminateCycleTime(0)
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
  }, [indeterminate, wavy])

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
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      width={size}
      height={size}
    >
      <g
        key={indeterminate ? `indeterminate-${thickness}` : 'determinate'}
        className={styles.circularLayer}
      >
        {wavy && indeterminate ? (
          <g
            style={{
              transform: `rotate(${indeterminateRotation}deg)`,
              transformOrigin: 'center',
            }}
          >
            {indeterminateWavyTrackPath && (
              <path
                className={styles.circularWavyTrack}
                d={indeterminateWavyTrackPath}
                strokeWidth={thickness}
              />
            )}
            <path
              className={styles.circularIndicator}
              d={indeterminateWavyPath}
              strokeWidth={thickness}
            />
          </g>
        ) : (indeterminate || trackArc) && (
          <circle
            className={styles.circularTrack}
            cx={CENTER}
            cy={CENTER}
            r={radius}
            strokeWidth={thickness}
            pathLength={1}
            strokeDasharray={trackArc?.dasharray}
            strokeDashoffset={trackArc?.dashoffset}
          />
        )}
        {wavy && indeterminate ? null : wavy && !indeterminate ? (
          <path
            className={styles.circularIndicator}
            d={wavyPath}
            strokeWidth={thickness}
          />
        ) : (
          <circle
            className={styles.circularIndicator}
            cx={CENTER}
            cy={CENTER}
            r={radius}
            strokeWidth={thickness}
            pathLength={1}
          />
        )}
      </g>
    </svg>
  )
})
