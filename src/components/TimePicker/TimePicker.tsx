import {
  forwardRef,
  useState,
  type ChangeEvent,
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

const KeyboardIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-9 3h2v2h-2zm0 3h2v2h-2zM8 8h2v2H8zm0 3h2v2H8zm-1 2H5v-2h2zm0-3H5V8h2zm9 7H8v-2h8zm0-4h-2v-2h2zm0-3h-2V8h2zm3 3h-2v-2h2zm0-3h-2V8h2z" />
  </svg>
)
const ClockIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16m.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </svg>
)

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
            {isInput ? ClockIcon : KeyboardIcon}
          </button>
        </div>
      </div>
    )
  },
)
