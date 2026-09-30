import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import clsx from 'clsx'
import { KeyboardIcon, ScheduleIcon } from '../../internal/icons'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { IconButton } from '../IconButton/IconButton'
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
  /**
   * Accessible name of an hour on the dial and of the hour selector's value.
   * Receives the displayed hour (1–12 with AM/PM).
   * @default (hour) => `${hour} o'clock`
   */
  getHourLabel?: (hour: number, ampm: boolean) => string
  /**
   * Accessible name of a minute on the dial and of the minute selector's value.
   * @default (minute) => `${minute} minutes`
   */
  getMinuteLabel?: (minute: number) => string
}

// Dial geometry (Compose ClockDialContainerSize / OuterCircleToSizeRatio /
// ClockDialSelectorHandleContainerSize).
const DIAL_SIZE = 256
const CENTER = DIAL_SIZE / 2
const OUTER_RADIUS = 101
const HANDLE_SIZE = 48
// Pointer travel before a press on the dial becomes a drag.
const DRAG_SLOP = 6
// Compose `onTap`: the hour → minute auto-switch waits 100ms.
const AUTO_SWITCH_DELAY = 100

type Field = 'hour' | 'minute'

/** One number on the dial. `angle` is in degrees, clockwise from 12 o'clock. */
interface DialLabel {
  value: number
  text: string
  angle: number
  radius: number
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/** Clockwise angle (degrees, 0 = 12 o'clock) of a point relative to the center. */
function angleOf(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI
  return (deg + 360) % 360
}

function position(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return { left: CENTER + radius * Math.sin(rad), top: CENTER - radius * Math.cos(rad) }
}

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

const defaultHourLabel = (hour: number, ampm: boolean) =>
  ampm ? `${hour} o'clock` : `${hour} hours`
const defaultMinuteLabel = (minute: number) => `${minute} minutes`

/**
 * Material Design 3 Time picker (dial + input).
 *
 * SurfaceContainerHigh surface with hour/minute selector fields (PrimaryContainer
 * when active), an AM/PM toggle (TertiaryContainer selected), and either a 256dp
 * SurfaceContainerHighest clock dial with a Primary selector, or editable input
 * fields — toggled with the keyboard/clock button, per Compose TimePickerTokens.
 *
 * The dial follows Compose `ClockFace` / `ClockText`: tap a number or drag the
 * selector track (1-minute resolution while dragging); choosing an hour with a
 * pointer switches to minutes. The dial is one Tab stop (the selected number);
 * arrow keys move around the ring and Enter / Space selects. The hour / minute
 * selectors and AM / PM are radio groups.
 *
 * Input mode validates like Compose `TimeInput`: 2 digits max, out-of-range
 * text (hour outside 1–12, minute outside 0–59) shows an error and is not
 * committed, and an empty / invalid field reverts to the current value on
 * blur. `onChange` only ever receives valid values.
 */
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  function TimePicker(
    {
      value,
      defaultValue,
      onChange,
      mode = 'dial',
      getHourLabel = defaultHourLabel,
      getMinuteLabel = defaultMinuteLabel,
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<TimeValue>(
      defaultValue ?? { hour: 12, minute: 0 },
    )
    const current = isControlled ? value : internal
    const [activeField, setActiveField] = useState<Field>('hour')
    const [viewMode, setViewMode] = useState<TimePickerMode>(mode)
    const idBase = useId()

    const period: 'AM' | 'PM' = current.hour < 12 ? 'AM' : 'PM'
    const hour12 = current.hour % 12 === 0 ? 12 : current.hour % 12

    const commit = (next: TimeValue) => {
      if (next.hour === current.hour && next.minute === current.minute) return
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
      const errorId = `${idBase}-${field}-error`
      return (
        <div className={styles.fieldColumn}>
          <span className={styles.fieldStateLayer} aria-hidden="true" />
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
          {/* Compose SupportingText: the field name below it, swapped for the
              error message (announced politely) while out of range. */}
          <span className={styles.supportingText} aria-hidden="true" hidden={invalid}>
            {field === 'hour' ? 'Hour' : 'Minute'}
          </span>
          <span
            id={errorId}
            className={styles.supportingText}
            data-error="true"
            aria-live="polite"
          >
            {invalid ? FIELD_ERROR[field] : ''}
          </span>
        </div>
      )
    }

    // ---- Radio groups (hour / minute selectors, AM / PM) ------------------
    // APG radio group: one Tab stop (the checked radio); arrow keys move and
    // select, wrapping around.
    const selectorRefs = useRef<Record<Field, HTMLButtonElement | null>>({
      hour: null,
      minute: null,
    })
    const periodRefs = useRef<Record<'AM' | 'PM', HTMLButtonElement | null>>({
      AM: null,
      PM: null,
    })
    const radioKeyDown =
      <T extends string>(
        items: readonly T[],
        currentItem: T,
        refs: Record<T, HTMLButtonElement | null>,
        select: (item: T) => void,
      ) =>
      (event: KeyboardEvent<HTMLButtonElement>) => {
        const step =
          event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? 1
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? -1
              : 0
        if (!step) return
        event.preventDefault()
        const next =
          items[(items.indexOf(currentItem) + step + items.length) % items.length]
        select(next)
        refs[next]?.focus()
      }

    const selectField = (field: Field) => {
      clearTimeout(autoSwitchTimer.current)
      setSnap(false)
      setActiveField(field)
    }

    // ---- Dial (Compose ClockFace / ClockText) ------------------------------
    const isInput = viewMode === 'input'
    const isHourDial = activeField === 'hour'

    const labels: DialLabel[] = isHourDial
      ? HOURS_12.map((h, i) => ({
          value: h,
          text: String(h),
          angle: i * 30,
          radius: OUTER_RADIUS,
        }))
      : MINUTES.map((m, i) => ({
          value: m,
          text: pad2(m),
          angle: i * 30,
          radius: OUTER_RADIUS,
        }))

    // The label that owns the dial's single Tab stop: the selected value, or
    // the nearest 5-minute mark for an in-between minute (Compose ClockText
    // `isTheSelectedValue`).
    const entryValue = isHourDial ? hour12 : (Math.round(current.minute / 5) * 5) % 60
    // Exactly the selected value (announced as the current one).
    const isCurrent = (label: DialLabel) =>
      isHourDial ? label.value === hour12 : label.value === current.minute

    const dialRef = useRef<HTMLDivElement>(null)
    const labelRefs = useRef<(HTMLButtonElement | null)[]>([])
    // Roving tab stop: the focused number while focus is inside the dial,
    // otherwise the selected value.
    const [focusStop, setFocusStop] = useState<{ field: Field; index: number } | null>(null)
    const autoSwitchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
    useEffect(() => () => clearTimeout(autoSwitchTimer.current), [])

    // Hand motion: pointer taps and field switches animate (Compose
    // DefaultSpatial spring, shortest path); keyboard selection snaps; while
    // dragging the hand follows the pointer, then settles on the value.
    const [snap, setSnap] = useState(false)
    const [dragAngle, setDragAngle] = useState<number | null>(null)
    const pointer = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(
      null,
    )

    const valueAngle = isHourDial ? (hour12 % 12) * 30 : current.minute * 6
    const handRadius = OUTER_RADIUS
    const targetAngle = dragAngle ?? valueAngle
    // Unwrap the angle so the CSS transition rotates the short way round
    // (e.g. 330° → 30° turns +60°, not −300°). Idempotent per render.
    const lastAngle = useRef(targetAngle)
    let diff = (targetAngle - lastAngle.current) % 360
    if (diff > 180) diff -= 360
    if (diff <= -180) diff += 360
    const handAngle = lastAngle.current + diff
    lastAngle.current = handAngle

    const selectFromDial = (angle: number, dragging: boolean) => {
      if (isHourDial) {
        setHour12(Math.round(angle / 30) % 12 || 12)
      } else {
        // Taps snap to the 5-minute marks, drags have 1-minute resolution.
        setMinute(
          dragging ? Math.round(angle / 6) % 60 : (Math.round(angle / 30) * 5) % 60,
        )
      }
    }

    const pointAngle = (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      return angleOf(
        event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2),
      )
    }

    const onDialPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      clearTimeout(autoSwitchTimer.current)
      // Compose clears focus on press: pointer input never parks focus on
      // a dial number (the mousedown default is prevented below).
      const active = document.activeElement
      if (active instanceof HTMLElement && event.currentTarget.contains(active)) active.blur()
      pointer.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    const onDialPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      const p = pointer.current
      if (!p || p.id !== event.pointerId) return
      if (
        !p.dragging &&
        Math.hypot(event.clientX - p.x, event.clientY - p.y) < DRAG_SLOP
      ) {
        return
      }
      p.dragging = true
      const angle = pointAngle(event)
      setSnap(true)
      setDragAngle(angle)
      selectFromDial(angle, true)
    }

    const onDialPointerUp = (event: PointerEvent<HTMLDivElement>) => {
      const p = pointer.current
      if (!p || p.id !== event.pointerId) return
      pointer.current = null
      setSnap(false)
      setDragAngle(null)
      if (p.dragging) {
        // Compose onDragEnd: switch to minutes right away.
        if (isHourDial) setActiveField('minute')
        return
      }
      selectFromDial(pointAngle(event), false)
      if (isHourDial) {
        autoSwitchTimer.current = setTimeout(
          () => setActiveField('minute'),
          AUTO_SWITCH_DELAY,
        )
      }
    }

    const onDialPointerCancel = () => {
      pointer.current = null
      setSnap(false)
      setDragAngle(null)
    }

    // Keyboard / assistive-technology activation (a click with no pointer
    // behind it): select without switching to minutes (Compose ClockText).
    const onLabelClick = (label: DialLabel) => (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail !== 0) return // pointer clicks are handled by the dial
      setSnap(true)
      if (isHourDial) setHour12(label.value)
      else setMinute(label.value)
    }

    const onLabelKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
      const count = labels.length
      let next: number | null = null
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % count
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
        next = (index - 1 + count) % count
      else if (event.key === 'Tab' && event.shiftKey) {
        // Compose: Shift+Tab leaves the dial for the active selector.
        event.preventDefault()
        selectorRefs.current[activeField]?.focus()
        return
      }
      if (next === null) return
      event.preventDefault()
      labelRefs.current[next]?.focus()
    }

    // Cross-fade the numbers only when the dial switches between hours and
    // minutes (Compose Crossfade), not on first render.
    const shownField = useRef(activeField)
    const fieldSwitched = useRef(false)
    if (shownField.current !== activeField) {
      shownField.current = activeField
      fieldSwitched.current = true
    }

    const hourValueId = `${idBase}-hour-value`
    const minuteValueId = `${idBase}-minute-value`

    const renderSelector = (field: Field) => {
      const checked = activeField === field
      return (
        <button
          ref={(node) => {
            selectorRefs.current[field] = node
          }}
          type="button"
          role="radio"
          aria-checked={checked}
          tabIndex={checked ? 0 : -1}
          data-active={checked || undefined}
          className={styles.field}
          aria-label={field === 'hour' ? 'Select hour' : 'Select minutes'}
          aria-describedby={field === 'hour' ? hourValueId : minuteValueId}
          onClick={() => selectField(field)}
          onKeyDown={radioKeyDown(
            ['hour', 'minute'] as const,
            activeField,
            selectorRefs.current,
            selectField,
          )}
        >
          {field === 'hour' ? pad2(hour12) : pad2(current.minute)}
          <FocusRing />
          <Ripple />
        </button>
      )
    }

    const renderLabelText = (label: DialLabel) => (
      <span
        key={label.value}
        className={styles.labelText}
        style={position(label.angle, label.radius)}
      >
        {label.text}
      </span>
    )

    return (
      <div
        ref={ref}
        {...rest}
        data-mode={viewMode}
        className={clsx(styles.picker, className)}
      >
        <div className={styles.fields}>
          {isInput ? (
            <div className={styles.timeFields}>
              {renderFieldInput('hour')}
              <span className={styles.separator} aria-hidden="true">
                :
              </span>
              {renderFieldInput('minute')}
            </div>
          ) : (
            <div className={styles.timeFields} role="radiogroup">
              {renderSelector('hour')}
              <span className={styles.separator} aria-hidden="true">
                :
              </span>
              {renderSelector('minute')}
              <span id={hourValueId} className={styles.visuallyHidden}>
                {getHourLabel(hour12, true)}
              </span>
              <span id={minuteValueId} className={styles.visuallyHidden}>
                {getMinuteLabel(current.minute)}
              </span>
            </div>
          )}
          <div className={styles.period} role="radiogroup" aria-label="AM or PM">
            {(['AM', 'PM'] as const).map((p) => (
              <button
                key={p}
                ref={(node) => {
                  periodRefs.current[p] = node
                }}
                type="button"
                role="radio"
                aria-checked={period === p}
                tabIndex={period === p ? 0 : -1}
                data-selected={period === p || undefined}
                className={styles.periodButton}
                onClick={() => setPeriod(p)}
                onKeyDown={radioKeyDown(['AM', 'PM'] as const, period, periodRefs.current, setPeriod)}
              >
                {p}
                <FocusRing />
                <Ripple />
              </button>
            ))}
          </div>
        </div>

        {!isInput && (
          <div
            ref={dialRef}
            className={styles.dial}
            role="group"
            aria-label={isHourDial ? 'Hour' : 'Minute'}
            data-dragging={dragAngle !== null || undefined}
            onPointerDown={onDialPointerDown}
            onPointerMove={onDialPointerMove}
            onPointerUp={onDialPointerUp}
            onPointerCancel={onDialPointerCancel}
            onMouseDown={(event) => event.preventDefault()}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setFocusStop(null)
              }
            }}
          >
            {/* Numbers (OnSurface) — decorative; the buttons carry the names. */}
            <div
              key={`text-${activeField}`}
              className={styles.labelLayer}
              data-animate={fieldSwitched.current || undefined}
              aria-hidden="true"
            >
              {labels.map(renderLabelText)}
            </div>

            {/* Selector: track from the center to the 48dp handle; the handle
                re-draws the numbers beneath it in OnPrimary (Compose
                drawSelector), counter-rotated so they stay put. */}
            <div
              className={styles.arm}
              data-snap={snap || undefined}
              style={{ transform: `rotate(${handAngle}deg)` }}
              aria-hidden="true"
            >
              <span
                className={styles.track}
                style={{ height: handRadius - HANDLE_SIZE / 2 }}
              />
              <span
                className={styles.handle}
                style={{ top: CENTER - handRadius - HANDLE_SIZE / 2 }}
              >
                <span
                  className={styles.handleLabels}
                  data-snap={snap || undefined}
                  style={{
                    top: -(CENTER - handRadius - HANDLE_SIZE / 2),
                    left: -(CENTER - HANDLE_SIZE / 2),
                    transform: `rotate(${-handAngle}deg)`,
                  }}
                >
                  <span
                    key={`text-${activeField}`}
                    className={styles.labelLayer}
                    data-animate={fieldSwitched.current || undefined}
                  >
                    {labels.map(renderLabelText)}
                  </span>
                </span>
              </span>
            </div>
            <span className={styles.center} aria-hidden="true" />

            {/* 48dp targets (Compose MinimumInteractiveSize), one Tab stop. */}
            {labels.map((label, i) => {
              const isEntry = label.value === entryValue
              const isTabStop =
                focusStop?.field === activeField ? focusStop.index === i : isEntry
              return (
                <button
                  key={`${activeField}-${label.value}`}
                  ref={(node) => {
                    labelRefs.current[i] = node
                  }}
                  type="button"
                  className={styles.number}
                  style={position(label.angle, label.radius)}
                  tabIndex={isTabStop ? 0 : -1}
                  aria-label={
                    isHourDial ? getHourLabel(label.value, true) : getMinuteLabel(label.value)
                  }
                  aria-current={isCurrent(label) ? 'time' : undefined}
                  data-entry={isEntry || undefined}
                  onClick={onLabelClick(label)}
                  onKeyDown={onLabelKeyDown(i)}
                  onFocus={() => setFocusStop({ field: activeField, index: i })}
                >
                  <FocusRing />
                  <Ripple />
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.actions}>
          <IconButton
            variant="standard"
            icon={isInput ? <ScheduleIcon /> : <KeyboardIcon />}
            aria-label={isInput ? 'Toggle dial picker' : 'Toggle input picker'}
            onClick={() => setViewMode(isInput ? 'dial' : 'input')}
          />
        </div>
      </div>
    )
  },
)
