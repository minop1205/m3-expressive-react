import {
  forwardRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import clsx from 'clsx'
import styles from './TimePicker.module.css'

export interface TimeValue {
  /** Hour in 24-hour form (0–23). */
  hour: number
  /** Minute (0–59). */
  minute: number
}

export interface TimePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled value. */
  value?: TimeValue
  /** Uncontrolled initial value. @default { hour: 12, minute: 0 } */
  defaultValue?: TimeValue
  /** Fires with the new value. */
  onChange?: (value: TimeValue) => void
}

const DIAL_SIZE = 256
const CENTER = DIAL_SIZE / 2
const RADIUS = 100

function pointFor(index: number, count: number): CSSProperties {
  const angle = (-90 + (index / count) * 360) * (Math.PI / 180)
  return {
    left: CENTER + RADIUS * Math.cos(angle),
    top: CENTER + RADIUS * Math.sin(angle),
  }
}

/**
 * Material Design 3 Time picker (clock dial).
 *
 * SurfaceContainerHigh dialog surface with hour/minute selector fields
 * (PrimaryContainer when active), an AM/PM toggle (TertiaryContainer selected),
 * and a 256dp SurfaceContainerHighest clock dial with a Primary selector — per
 * Compose TimePickerTokens. Tap a field to switch the dial, tap a number to set.
 */
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  function TimePicker({ value, defaultValue, onChange, className, ...rest }, ref) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<TimeValue>(
      defaultValue ?? { hour: 12, minute: 0 },
    )
    const current = isControlled ? value : internal
    const [mode, setMode] = useState<'hour' | 'minute'>('hour')

    const period: 'AM' | 'PM' = current.hour < 12 ? 'AM' : 'PM'
    const hour12 = current.hour % 12 === 0 ? 12 : current.hour % 12

    const commit = (next: TimeValue) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    }

    const setHour12 = (h12: number) => {
      const base = h12 % 12
      commit({ ...current, hour: period === 'PM' ? base + 12 : base })
    }
    const setMinute = (m: number) => commit({ ...current, minute: m })
    const setPeriod = (p: 'AM' | 'PM') => {
      if (p === period) return
      commit({ ...current, hour: (current.hour + 12) % 24 })
    }

    const hours = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

    // Selector-hand angle for the active value.
    const handIndex =
      mode === 'hour' ? hour12 % 12 : Math.round(current.minute / 5) % 12
    const handAngle = (handIndex / 12) * 360

    return (
      <div ref={ref} {...rest} className={clsx(styles.picker, className)}>
        <div className={styles.fields}>
          <div className={styles.timeFields}>
            <button
              type="button"
              data-active={mode === 'hour' || undefined}
              className={styles.field}
              aria-label="Hour"
              onClick={() => setMode('hour')}
            >
              {String(hour12).padStart(2, '0')}
            </button>
            <span className={styles.separator}>:</span>
            <button
              type="button"
              data-active={mode === 'minute' || undefined}
              className={styles.field}
              aria-label="Minute"
              onClick={() => setMode('minute')}
            >
              {String(current.minute).padStart(2, '0')}
            </button>
          </div>
          <div className={styles.period} role="group" aria-label="AM or PM">
            <button
              type="button"
              data-selected={period === 'AM' || undefined}
              className={styles.periodButton}
              onClick={() => setPeriod('AM')}
            >
              AM
            </button>
            <button
              type="button"
              data-selected={period === 'PM' || undefined}
              className={styles.periodButton}
              onClick={() => setPeriod('PM')}
            >
              PM
            </button>
          </div>
        </div>

        <div className={styles.dial} style={{ width: DIAL_SIZE, height: DIAL_SIZE }}>
          <span className={styles.center} />
          <span
            className={styles.hand}
            style={{ transform: `translateX(-50%) rotate(${handAngle}deg)` }}
          />
          {(mode === 'hour' ? hours : minutes).map((n, i) => {
            const selected =
              mode === 'hour'
                ? n % 12 === hour12 % 12
                : n === Math.round(current.minute / 5) * 5 % 60
            return (
              <button
                key={n}
                type="button"
                data-selected={selected || undefined}
                className={styles.number}
                style={pointFor(i, 12)}
                onClick={() => (mode === 'hour' ? setHour12(n) : setMinute(n))}
              >
                {mode === 'minute' ? String(n).padStart(2, '0') : n}
              </button>
            )
          })}
        </div>
      </div>
    )
  },
)
