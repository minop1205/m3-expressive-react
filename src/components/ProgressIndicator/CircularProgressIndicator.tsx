import { forwardRef, type CSSProperties, type SVGAttributes } from 'react'
import clsx from 'clsx'
import styles from './ProgressIndicator.module.css'

export type CircularProgressIndicatorThickness = 4 | 8

export interface CircularProgressIndicatorProps
  extends Omit<SVGAttributes<SVGSVGElement>, 'role'> {
  /** Progress value from 0 to 1. Omit for indeterminate progress. */
  value?: number
  /** Diameter of the indicator in pixels. @default 48 */
  size?: number
  /** Indicator thickness in dp. @default 4 */
  thickness?: CircularProgressIndicatorThickness
}

const VIEWBOX_SIZE = 48
const CENTER = VIEWBOX_SIZE / 2

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value))
}

export const CircularProgressIndicator = forwardRef<
  SVGSVGElement,
  CircularProgressIndicatorProps
>(function CircularProgressIndicator(
  { value, size = 48, thickness = 4, className, style, ...rest },
  ref,
) {
  const indeterminate = value == null
  const progress = indeterminate ? undefined : clampProgress(value)
  const radius = (VIEWBOX_SIZE - thickness) / 2
  const indicatorStyle = {
    ...style,
    '--_progress': progress ?? 0,
    '--_remaining-progress': 1 - (progress ?? 0),
  } as CSSProperties

  return (
    <svg
      ref={ref}
      {...rest}
      role="progressbar"
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 1}
      aria-valuenow={progress}
      data-indeterminate={indeterminate || undefined}
      data-thickness={thickness}
      className={clsx(styles.circular, className)}
      style={indicatorStyle}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      width={size}
      height={size}
    >
      <circle
        className={styles.circularTrack}
        cx={CENTER}
        cy={CENTER}
        r={radius}
        strokeWidth={thickness}
        pathLength={1}
      />
      <g className={styles.circularLayer}>
        <circle
          className={styles.circularIndicator}
          cx={CENTER}
          cy={CENTER}
          r={radius}
          strokeWidth={thickness}
          pathLength={1}
        />
      </g>
    </svg>
  )
})
