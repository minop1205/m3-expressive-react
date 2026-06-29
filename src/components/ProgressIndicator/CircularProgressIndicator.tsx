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

export type CircularProgressIndicatorThickness = 4 | 8

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
const WAVY_SPEED_PER_MS = WAVY_WAVELENGTH / 1000
const PROGRESS_TRANSITION_DURATION_MS = 600
const AMPLITUDE_TRANSITION_DURATION_MS = 500

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

function getCircularWavyPath(
  progress: number,
  radius: number,
  phase: number,
  amplitude: number,
) {
  if (progress <= 0) {
    return ''
  }

  const startAngle = -Math.PI / 2
  const endAngle = startAngle + Math.PI * 2 * progress
  const circumference = 2 * Math.PI * radius
  const cycles = circumference / WAVY_WAVELENGTH
  const steps = Math.max(8, Math.ceil(progress * cycles * 8))
  let path = ''

  for (let index = 0; index <= steps; index += 1) {
    const fraction = index / steps
    const angle = startAngle + (endAngle - startAngle) * fraction
    const arcLength = circumference * progress * fraction
    const wave = Math.sin(((arcLength + phase) / WAVY_WAVELENGTH) * Math.PI * 2)
    const point = polarToPoint(radius + wave * amplitude, angle)

    path += `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(3)} ${point.y.toFixed(3)} `
  }

  return path.trim()
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
  const circumference = 2 * Math.PI * radius
  const visualGap = (GAP + thickness) / circumference
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
    if (!wavy || indeterminate || determinateProgress <= 0) {
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
        const nextPhase = currentPhase + delta * WAVY_SPEED_PER_MS
        return nextPhase >= WAVY_WAVELENGTH
          ? nextPhase % WAVY_WAVELENGTH
          : nextPhase
      })
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [determinateProgress, indeterminate, wavy])

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
        {(indeterminate || trackArc) && (
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
        {wavy && !indeterminate ? (
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
