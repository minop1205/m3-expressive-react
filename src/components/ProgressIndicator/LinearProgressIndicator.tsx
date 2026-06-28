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

const WAVY_AMPLITUDE = 3
const WAVY_WAVELENGTH = 40
const WAVY_SPEED_PER_MS = WAVY_WAVELENGTH / 1000
const PROGRESS_TRANSITION_DURATION_MS = 600

function getWavyHeight(thickness: LinearProgressIndicatorThickness) {
  return thickness + WAVY_AMPLITUDE * 2
}

function getWavyY(x: number, centerY: number, amplitude: number, phase: number) {
  return (
    centerY +
    Math.sin(((x + phase) / WAVY_WAVELENGTH) * Math.PI * 2) * amplitude
  )
}

function getWavySlope(x: number, amplitude: number, phase: number) {
  return (
    Math.cos(((x + phase) / WAVY_WAVELENGTH) * Math.PI * 2) *
    amplitude *
    (Math.PI * 2) /
    WAVY_WAVELENGTH
  )
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

  const step = 8
  let x = startX
  let y = getWavyY(
    startX,
    centerY,
    amplitude,
    phase,
  )
  let path = `M ${startX.toFixed(2)} ${y.toFixed(2)}`

  while (x < pathEndX) {
    const nextX = Math.min(x + step, pathEndX)
    const nextY = getWavyY(
      nextX,
      centerY,
      amplitude,
      phase,
    )
    const dx = nextX - x
    const control1X = x + dx / 3
    const control1Y =
      y + getWavySlope(x, amplitude, phase) * (dx / 3)
    const control2X = nextX - dx / 3
    const control2Y =
      nextY - getWavySlope(nextX, amplitude, phase) * (dx / 3)

    path += ` C ${control1X.toFixed(2)} ${control1Y.toFixed(2)} ${control2X.toFixed(2)} ${control2Y.toFixed(2)} ${nextX.toFixed(2)} ${nextY.toFixed(2)}`
    x = nextX
    y = nextY
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
  const wavyActiveVisible =
    wavy && (determinateProgress > 0 || wavyVisualProgress > 0.001)
  const wavyHeight = getWavyHeight(thickness)
  const wavyProgressWidth = width * displayProgress
  const wavyTrackStart = `${Math.min(
    width,
    Math.max(wavyProgressWidth, thickness) + 4,
  )}px`
  const wavyPath = getWavySegmentPath({
    amplitude: WAVY_AMPLITUDE,
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
