import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
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

type Field = 'hour' | 'minute'

/**
 * Status of a time-input field's text:
 * - `valid` — a committable value (`value` is set);
 * - `pending` — an incomplete entry (empty, or a lone leading `0` in the hour
 *   field): no error, nothing committed;
 * - `invalid` — out of range (e.g. hour `13` / `00`, minute `75`): error state,
 *   nothing committed.
 */
type FieldStatus =
  | { status: 'valid'; value: number }
  | { status: 'pending' }
  | { status: 'invalid' }

function parseField(field: Field, text: string): FieldStatus {
  if (text === '' || (field === 'hour' && text === '0')) return { status: 'pending' }
  const n = Number(text)
  const [min, max] = field === 'hour' ? [1, 12] : [0, 59]
  return n >= min && n <= max ? { status: 'valid', value: n } : { status: 'invalid' }
}

const FIELD_ERROR: Record<Field, string> = {
  hour: 'Hour must be 1–12',
  minute: 'Minute must be 0–59',
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * Material Design 3 Time picker (dial + input).
 *
 * SurfaceContainerHigh surface with hour/minute selector fields (PrimaryContainer
 * when active), an AM/PM toggle (TertiaryContainer selected), and either a 256dp
 * SurfaceContainerHighest clock dial with a Primary selector, or editable input
 * fields — toggled with the keyboard/clock button, per Compose TimePickerTokens.
 *
 * Input mode validates like Compose `TimeInput`: 2 digits max, out-of-range
 * text (hour outside 1–12, minute outside 0–59) shows an error and is not
 * committed, and an empty / invalid field reverts to the current value on
 * blur. `onChange` only ever receives valid values.
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

    // ---- Input mode (Compose `TimeInputTransformation`) -------------------
    // Each field keeps a text draft while focused. Rules:
    // - digits only, at most 2; a digit typed into a full field (collapsed
    //   caret) replaces the whole field with that digit instead of appending;
    // - only in-range text commits (`onChange`); out-of-range text stays
    //   visible with an error state and is never clamped; an empty field is
    //   allowed while editing;
    // - on blur the draft is dropped, so an empty / invalid field reverts to
    //   the last committed value;
    // - the hour auto-advances to the minute field once it is a valid 2-digit
    //   hour, or a typed 2–9 (can't start a valid 2-digit 12h hour); Enter
    //   on a valid hour also advances.
    const [drafts, setDrafts] = useState<Record<Field, string | null>>({
      hour: null,
      minute: null,
    })
    const minuteInputRef = useRef<HTMLInputElement>(null)
    const errorIdBase = useId()

    const fieldText: Record<Field, string> = {
      hour: drafts.hour ?? pad2(hour12),
      minute: drafts.minute ?? pad2(current.minute),
    }

    const applyText = (field: Field, text: string, typed: boolean) => {
      setDrafts((d) => ({ ...d, [field]: text }))
      const parsed = parseField(field, text)
      if (parsed.status !== 'valid') return
      if (field === 'hour') {
        if (parsed.value !== hour12) setHour12(parsed.value)
        if (text.length === 2 || (typed && parsed.value >= 2 && parsed.value <= 9)) {
          minuteInputRef.current?.focus()
        }
      } else if (parsed.value !== current.minute) {
        setMinute(parsed.value)
      }
    }

    const onFieldChange = (field: Field) => (event: ChangeEvent<HTMLInputElement>) => {
      const prev = fieldText[field]
      let text = event.target.value
      if (!/^\d*$/.test(text)) return
      // Deletions never auto-advance (Compose `hasInsertedText`).
      const inputType = (event.nativeEvent as InputEvent).inputType
      const typed = inputType ? inputType.startsWith('insert') : text.length >= prev.length
      if (text.length > 2) {
        // A single digit inserted into a full field replaces it (Compose).
        if (text.length !== prev.length + 1 || prev.length !== 2) return
        const caret = event.target.selectionStart ?? text.length
        text = text.charAt(Math.max(0, caret - 1))
      }
      applyText(field, text, typed)
    }

    const onFieldKeyDown = (field: Field) => (event: KeyboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      if (
        /^\d$/.test(event.key) &&
        input.value.length >= 2 &&
        input.selectionStart === input.selectionEnd
      ) {
        // `maxLength` would block the keystroke — replace instead.
        event.preventDefault()
        applyText(field, event.key, true)
      } else if (
        event.key === 'Enter' &&
        field === 'hour' &&
        parseField('hour', input.value).status === 'valid'
      ) {
        event.preventDefault()
        minuteInputRef.current?.focus()
      }
    }

    const renderFieldInput = (field: Field) => {
      const invalid = parseField(field, fieldText[field]).status === 'invalid'
      const errorId = `${errorIdBase}-${field}-error`
      return (
        <div className={styles.fieldColumn}>
          <input
            ref={field === 'minute' ? minuteInputRef : undefined}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            autoComplete="off"
            className={styles.fieldInput}
            aria-label={field === 'hour' ? 'Hour' : 'Minute'}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            data-error={invalid || undefined}
            value={fieldText[field]}
            onFocus={(event) => {
              setActiveField(field)
              setDrafts((d) => ({ ...d, [field]: fieldText[field] }))
              event.currentTarget.select()
            }}
            onBlur={() => setDrafts((d) => ({ ...d, [field]: null }))}
            onChange={onFieldChange(field)}
            onKeyDown={onFieldKeyDown(field)}
          />
          <span id={errorId} className={styles.supportingText} aria-live="polite">
            {invalid ? FIELD_ERROR[field] : ''}
          </span>
        </div>
      )
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
              renderFieldInput('hour')
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
              renderFieldInput('minute')
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
