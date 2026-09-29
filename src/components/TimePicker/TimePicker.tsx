import {
  forwardRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import clsx from 'clsx'
import { KeyboardIcon, ScheduleIcon } from '../../internal/icons'
import styles from './TimePicker.module.css'

export interface TimeValue {
  /** Hour in 24-hour form (0–23). */
  hour: number
  /** Minute (0–59). */
  minute: number
}

export type TimePickerMode = 'dial' | 'input'

export interface TimePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled value. */
  value?: TimeValue
  /** Uncontrolled initial value. @default { hour: 12, minute: 0 } */
  defaultValue?: TimeValue
  /** Fires with the new value. */
  onChange?: (value: TimeValue) => void
  /** Initial entry mode: clock `dial` or keyboard `input`. @default 'dial' */
  mode?: TimePickerMode
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
 * Material Design 3 Time picker (dial + input).
 *
 * SurfaceContainerHigh surface with hour/minute selector fields (PrimaryContainer
 * when active), an AM/PM toggle (TertiaryContainer selected), and either a 256dp
 * SurfaceContainerHighest clock dial with a Primary selector, or editable input
 * fields — toggled with the keyboard/clock button, per Compose TimePickerTokens.
 */
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  function TimePicker(
    { value, defaultValue, onChange, mode = 'dial', className, ...rest },
    ref,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<TimeValue>(
      defaultValue ?? { hour: 12, minute: 0 },
    )
    const current = isControlled ? value : internal
    const [activeField, setActiveField] = useState<'hour' | 'minute'>('hour')
    const [viewMode, setViewMode] = useState<TimePickerMode>(mode)

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

    const onHourInput = (event: ChangeEvent<HTMLInputElement>) => {
      const n = Number(event.target.value)
      if (Number.isNaN(n)) return
      setHour12(Math.min(12, Math.max(1, n)))
    }
    const onMinuteInput = (event: ChangeEvent<HTMLInputElement>) => {
      const n = Number(event.target.value)
      if (Number.isNaN(n)) return
      setMinute(Math.min(59, Math.max(0, n)))
    }

    const hours = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5)
    const handIndex =
      activeField === 'hour' ? hour12 % 12 : Math.round(current.minute / 5) % 12
    const handAngle = (handIndex / 12) * 360

    const isInput = viewMode === 'input'

    return (
      <div
        ref={ref}
        {...rest}
        data-mode={viewMode}
        className={clsx(styles.picker, className)}
      >
        <div className={styles.fields}>
          <div className={styles.timeFields}>
            {isInput ? (
              <input
                type="text"
                inputMode="numeric"
                className={styles.fieldInput}
                aria-label="Hour"
                value={String(hour12).padStart(2, '0')}
                onFocus={() => setActiveField('hour')}
                onChange={onHourInput}
              />
            ) : (
              <button
                type="button"
                data-active={activeField === 'hour' || undefined}
                className={styles.field}
                aria-label="Hour"
                onClick={() => setActiveField('hour')}
              >
                {String(hour12).padStart(2, '0')}
              </button>
            )}
            <span className={styles.separator}>:</span>
            {isInput ? (
              <input
                type="text"
                inputMode="numeric"
                className={styles.fieldInput}
                aria-label="Minute"
                value={String(current.minute).padStart(2, '0')}
                onFocus={() => setActiveField('minute')}
                onChange={onMinuteInput}
              />
            ) : (
              <button
                type="button"
                data-active={activeField === 'minute' || undefined}
                className={styles.field}
                aria-label="Minute"
                onClick={() => setActiveField('minute')}
              >
                {String(current.minute).padStart(2, '0')}
              </button>
            )}
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

        {!isInput && (
          <div className={styles.dial} style={{ width: DIAL_SIZE, height: DIAL_SIZE }}>
            <span className={styles.center} />
            <span
              className={styles.hand}
              style={{ transform: `translateX(-50%) rotate(${handAngle}deg)` }}
            />
            {(activeField === 'hour' ? hours : minutes).map((n, i) => {
              const selected =
                activeField === 'hour'
                  ? n % 12 === hour12 % 12
                  : n === (Math.round(current.minute / 5) * 5) % 60
              return (
                <button
                  key={n}
                  type="button"
                  data-selected={selected || undefined}
                  className={styles.number}
                  style={pointFor(i, 12)}
                  onClick={() =>
                    activeField === 'hour' ? setHour12(n) : setMinute(n)
                  }
                >
                  {activeField === 'minute' ? String(n).padStart(2, '0') : n}
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.modeToggle}
            aria-label={isInput ? 'Switch to dial' : 'Switch to keyboard input'}
            onClick={() => setViewMode(isInput ? 'dial' : 'input')}
          >
            {isInput ? <ScheduleIcon /> : <KeyboardIcon />}
          </button>
        </div>
      </div>
    )
  },
)
