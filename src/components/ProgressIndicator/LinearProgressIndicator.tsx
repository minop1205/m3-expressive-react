import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './ProgressIndicator.module.css'

export type LinearProgressIndicatorThickness = 4 | 8

export interface LinearProgressIndicatorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Progress value from 0 to 1. Omit for indeterminate progress. */
  value?: number
  /** Indicator thickness in dp. @default 4 */
  thickness?: LinearProgressIndicatorThickness
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value))
}

export const LinearProgressIndicator = forwardRef<
  HTMLDivElement,
  LinearProgressIndicatorProps
>(function LinearProgressIndicator(
  { value, thickness = 4, className, style, ...rest },
  ref,
) {
  const indeterminate = value == null
  const progress = indeterminate ? undefined : clampProgress(value)
  const determinateProgress = progress ?? 0
  const trackStart =
    determinateProgress > 0 && determinateProgress < 1
      ? `calc(${determinateProgress * 100}% + 4px)`
      : `${determinateProgress * 100}%`
  const progressStyle = {
    ...style,
    '--_progress': `${(progress ?? 0) * 100}%`,
    '--_track-start': indeterminate ? '0px' : trackStart,
  } as CSSProperties

  return (
    <div
      ref={ref}
      {...rest}
      role="progressbar"
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 1}
      aria-valuenow={progress}
      data-indeterminate={indeterminate || undefined}
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
          {determinateProgress > 0 && (
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
