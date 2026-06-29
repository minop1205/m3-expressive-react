import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import clsx from 'clsx'
import styles from './ProgressIndicator.module.css'

export type LinearProgressIndicatorThickness = 4 | 8
export type ProgressIndicatorShape = 'flat' | 'wavy'

export interface LinearProgressIndicatorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Progress value from 0 to 1. Omit for indeterminate progress. */
  value?: number
  /** Indicator thickness in dp. @default 4 */
  thickness?: LinearProgressIndicatorThickness
  /** Indicator shape. @default "flat" */
  shape?: ProgressIndicatorShape
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value))
}

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

  for (let i = 0; i < 4; i += 1) {
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

const WAVY_AMPLITUDE = 3
const WAVY_WAVELENGTH = 40
const WAVY_SPEED_PER_MS = WAVY_WAVELENGTH / 1000
const PROGRESS_TRANSITION_DURATION_MS = 600
const AMPLITUDE_TRANSITION_DURATION_MS = 500

function getWavyHeight(thickness: LinearProgressIndicatorThickness) {
  return thickness + WAVY_AMPLITUDE * 2
}

function getWavyTargetAmplitude(progress: number) {
  if (progress <= 0.1 || progress >= 0.95) {
    return 0
  }

  return WAVY_AMPLITUDE
}

type Point = {
  x: number
  y: number
}

function getQuadraticPoint(p0: Point, p1: Point, p2: Point, time: number) {
  const inverseTime = 1 - time

  return {
    x:
      inverseTime * inverseTime * p0.x +
      2 * inverseTime * time * p1.x +
      time * time * p2.x,
    y:
      inverseTime * inverseTime * p0.y +
      2 * inverseTime * time * p1.y +
      time * time * p2.y,
  }
}

function getQuadraticDerivative(
  p0: Point,
  p1: Point,
  p2: Point,
  time: number,
) {
  const inverseTime = 1 - time

  return {
    x: 2 * (inverseTime * (p1.x - p0.x) + time * (p2.x - p1.x)),
    y: 2 * (inverseTime * (p1.y - p0.y) + time * (p2.y - p1.y)),
  }
}

function getQuadraticSubcurve(
  p0: Point,
  p1: Point,
  p2: Point,
  startTime: number,
  endTime: number,
) {
  const q0 = getQuadraticPoint(p0, p1, p2, startTime)
  const q2 = getQuadraticPoint(p0, p1, p2, endTime)
  const derivative = getQuadraticDerivative(p0, p1, p2, startTime)
  const timeScale = endTime - startTime

  return {
    start: q0,
    control: {
      x: q0.x + (derivative.x * timeScale) / 2,
      y: q0.y + (derivative.y * timeScale) / 2,
    },
    end: q2,
  }
}

function getWavySegmentPath({
  amplitude,
  endX,
  phase,
  thickness,
}: {
  amplitude: number
  endX: number
  phase: number
  thickness: LinearProgressIndicatorThickness
}) {
  const centerY = getWavyHeight(thickness) / 2
  const startX = thickness / 2
  const pathEndX = endX - thickness / 2

  if (pathEndX <= startX) {
    return ''
  }

  const halfWavelength = WAVY_WAVELENGTH / 2
  const controlOffsetY = amplitude * 2
  const firstSegmentIndex = Math.floor((startX + phase) / halfWavelength)
  let segmentIndex = firstSegmentIndex
  let path = ''

  while (segmentIndex * halfWavelength - phase < pathEndX) {
    const segmentStartX = segmentIndex * halfWavelength - phase
    const segmentEndX = segmentStartX + halfWavelength
    const visibleStartX = Math.max(startX, segmentStartX)
    const visibleEndX = Math.min(pathEndX, segmentEndX)

    if (visibleEndX > visibleStartX) {
      const direction = segmentIndex % 2 === 0 ? 1 : -1
      const p0 = { x: segmentStartX, y: centerY }
      const p1 = {
        x: segmentStartX + halfWavelength / 2,
        y: centerY + controlOffsetY * direction,
      }
      const p2 = { x: segmentEndX, y: centerY }
      const startTime = (visibleStartX - segmentStartX) / halfWavelength
      const endTime = (visibleEndX - segmentStartX) / halfWavelength
      const curve = getQuadraticSubcurve(p0, p1, p2, startTime, endTime)

      if (!path) {
        path = `M ${curve.start.x.toFixed(2)} ${curve.start.y.toFixed(2)}`
      }

      path += ` Q ${curve.control.x.toFixed(2)} ${curve.control.y.toFixed(2)} ${curve.end.x.toFixed(2)} ${curve.end.y.toFixed(2)}`
    }

    segmentIndex += 1
  }

  return path
}

export const LinearProgressIndicator = forwardRef<
  HTMLDivElement,
  LinearProgressIndicatorProps
>(function LinearProgressIndicator(
  { value, thickness = 4, shape = 'flat', className, style, ...rest },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [wavyPhase, setWavyPhase] = useState(0)
  const indeterminate = value == null
  const wavy = shape === 'wavy'
  const progress = indeterminate ? undefined : clampProgress(value)
  const determinateProgress = progress ?? 0
  const [wavyVisualProgress, setWavyVisualProgress] =
    useState(determinateProgress)
  const wavyVisualProgressRef = useRef(determinateProgress)
  const displayProgress = wavy ? wavyVisualProgress : determinateProgress
  const targetWavyAmplitude = getWavyTargetAmplitude(displayProgress)
  const [wavyAmplitude, setWavyAmplitude] = useState(() =>
    getWavyTargetAmplitude(determinateProgress),
  )
  const wavyAmplitudeRef = useRef(wavyAmplitude)
  const wavyActiveVisible =
    wavy && (determinateProgress > 0 || wavyVisualProgress > 0.001)
  const wavyHeight = getWavyHeight(thickness)
  const wavyProgressWidth = width * displayProgress
  const wavyTrackStart = `${Math.min(
    width,
    Math.max(wavyProgressWidth, thickness) + 4,
  )}px`
  const wavyPath = getWavySegmentPath({
    amplitude: wavyAmplitude,
    endX: wavyProgressWidth,
    phase: wavyPhase,
    thickness,
  })
  const trackStart =
    wavy && displayProgress > 0 && displayProgress < 1
      ? wavyTrackStart
      : determinateProgress > 0 && determinateProgress < 1
      ? `calc(${determinateProgress * 100}% + 4px)`
      : `${determinateProgress * 100}%`
  const progressStyle = {
    ...style,
    '--_progress': `${(progress ?? 0) * 100}%`,
    '--_track-start': indeterminate ? '0px' : trackStart,
  } as CSSProperties

  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement)

  useEffect(() => {
    if (!rootRef.current || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(rootRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!wavy || indeterminate) {
      wavyVisualProgressRef.current = determinateProgress
      setWavyVisualProgress(determinateProgress)
      return
    }

    const from = wavyVisualProgressRef.current
    const to = determinateProgress

    if (Math.abs(from - to) < 0.001) {
      wavyVisualProgressRef.current = to
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
      const easedProgress = standardEasing(progressTime)
      const nextProgress = from + (to - from) * easedProgress
      wavyVisualProgressRef.current = nextProgress
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
      wavyAmplitudeRef.current = targetWavyAmplitude
      setWavyAmplitude(targetWavyAmplitude)
      return
    }

    const from = wavyAmplitudeRef.current
    const to = targetWavyAmplitude

    if (Math.abs(from - to) < 0.001) {
      wavyAmplitudeRef.current = to
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
      const easedProgress = easing(progressTime)
      const nextAmplitude = from + (to - from) * easedProgress
      wavyAmplitudeRef.current = nextAmplitude
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
    if (!wavy || indeterminate || !wavyActiveVisible) {
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
  }, [indeterminate, wavy, wavyActiveVisible])

  return (
    <div
      ref={rootRef}
      {...rest}
      role="progressbar"
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 1}
      aria-valuenow={progress}
      data-indeterminate={indeterminate || undefined}
      data-shape={shape}
      data-thickness={thickness}
      className={clsx(styles.linear, className)}
      style={progressStyle}
    >
      <span className={styles.linearTrack} aria-hidden="true" />
      {indeterminate ? (
        <span className={styles.linearIndeterminate} aria-hidden="true">
          <span className={styles.linearIndeterminateSegment} />
          <span
            className={clsx(
              styles.linearIndeterminateSegment,
              styles.linearIndeterminateSegmentIncoming,
            )}
          />
        </span>
      ) : (
        <>
          {wavyActiveVisible && (
            <span className={styles.linearWavyIndicator} aria-hidden="true">
              <svg
                className={styles.linearWavySvg}
                width="100%"
                height={wavyHeight}
                viewBox={`0 0 ${Math.max(width, 1)} ${wavyHeight}`}
                preserveAspectRatio="none"
              >
                <path
                  className={styles.linearWavyPath}
                  d={wavyPath}
                  strokeWidth={thickness}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
          )}
          {determinateProgress > 0 && !wavy && (
            <span className={styles.linearIndicator} aria-hidden="true" />
          )}
          {determinateProgress < 1 && (
            <span className={styles.linearStop} aria-hidden="true" />
          )}
        </>
      )}
    </div>
  )
})
