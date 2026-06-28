import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
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

const WAVY_AMPLITUDE = 3
const WAVY_WAVELENGTH = 40

function getWavyHeight(thickness: LinearProgressIndicatorThickness) {
  return thickness + WAVY_AMPLITUDE * 2
}

function getFullWavyPath(
  width: number,
  thickness: LinearProgressIndicatorThickness,
) {
  const centerY = getWavyHeight(thickness) / 2
  const halfWavelength = WAVY_WAVELENGTH / 2
  const fullWidth = Math.max(width, 1) + WAVY_WAVELENGTH * 2
  let anchorX = halfWavelength
  let controlX = halfWavelength / 2
  let controlY = centerY + WAVY_AMPLITUDE * 2
  let path = `M 0 ${centerY}`

  while (anchorX <= fullWidth + halfWavelength) {
    path += ` Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${anchorX.toFixed(2)} ${centerY}`
    anchorX += halfWavelength
    controlX += halfWavelength
    controlY = centerY * 2 - controlY
  }

  return path
}

function getWavyAmplitudeScale(progress: number) {
  if (progress <= 0.1 || progress >= 0.95) {
    return 0
  }

  return 1
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
  const indeterminate = value == null
  const wavy = shape === 'wavy'
  const progress = indeterminate ? undefined : clampProgress(value)
  const determinateProgress = progress ?? 0
  const wavyHeight = getWavyHeight(thickness)
  const wavyAmplitudeScale = getWavyAmplitudeScale(determinateProgress)
  const wavyCapInset = thickness / 2
  const wavyGapSize = 4 + wavyCapInset
  const wavyProgressWidth = width * determinateProgress
  const wavyTrackStart = `${Math.min(
    width,
    Math.max(wavyProgressWidth, thickness) + wavyGapSize,
  )}px`
  const fullWavyWidth = Math.max(width, 1) + WAVY_WAVELENGTH * 2
  const wavyVisibleWidth = Math.max(0, wavyProgressWidth - thickness)
  const fullWavyPath = useMemo(
    () => getFullWavyPath(width, thickness),
    [thickness, width],
  )
  const trackStart =
    wavy && determinateProgress > 0 && determinateProgress < 1
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
          {determinateProgress > 0 && wavy && (
            <span className={styles.linearWavyIndicator} aria-hidden="true">
              <svg
                className={styles.linearWavySvg}
                width="100%"
                height={wavyHeight}
                viewBox={`0 0 ${Math.max(width, 1)} ${wavyHeight}`}
                preserveAspectRatio="none"
              >
                <g
                  className={styles.linearWavyAmplitude}
                  transform={`translate(0 ${((1 - wavyAmplitudeScale) * wavyHeight) / 2}) scale(1 ${wavyAmplitudeScale})`}
                >
                  <g className={styles.linearWavyPhase}>
                    <g transform={`translate(${wavyCapInset} 0)`}>
                      <path
                        className={styles.linearWavyPath}
                        d={fullWavyPath}
                        pathLength={fullWavyWidth}
                        strokeWidth={thickness}
                        strokeDasharray={`${wavyVisibleWidth} ${fullWavyWidth}`}
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  </g>
                </g>
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
