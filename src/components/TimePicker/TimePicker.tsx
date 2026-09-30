import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
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
import { assignRefs, useModal } from '../../internal/useModal'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import styles from './TimePicker.module.css'

export interface TimeValue {
  /** Hour in 24-hour form (0–23). */
  hour: number
  /** Minute (0–59). */
  minute: number
}

export type TimePickerMode = 'dial' | 'input'

/**
 * Why a modal picker closed (shared picker vocabulary, Phase B B7): OK /
 * Enter (`accept`), Cancel (`cancel`), Escape (`escapeKeyDown`) or a scrim
 * click (`backdropClick`).
 */
export type TimePickerCloseReason = 'accept' | 'cancel' | 'escapeKeyDown' | 'backdropClick'

export interface TimePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled value. */
  value?: TimeValue
  /** Uncontrolled initial value. @default { hour: 12, minute: 0 } */
  defaultValue?: TimeValue
  /**
   * Fires with the new value on every change — with the action row this is
   * the draft; `onAccept` commits.
   */
  onChange?: (value: TimeValue) => void
  /**
   * OK (or Enter in the minute field) commits the draft. Passing `onAccept`,
   * `onCancel` or `open` adds the headline and the Cancel / OK row.
   */
  onAccept?: (value: TimeValue) => void
  /**
   * Cancel, Escape or a scrim click: the value reverts (through `onChange`)
   * to what it was when the picker opened or was last accepted.
   */
  onCancel?: () => void
  /**
   * Show the picker as a modal dialog (scrim, focus trap, Escape) — the
   * Compose `TimePickerDialog` equivalent. Renders nothing while `false`.
   */
  open?: boolean
  /** A modal picker asks to close, with the reason. */
  onClose?: (reason: TimePickerCloseReason) => void
  /**
   * Display mode: clock `dial` or keyboard `input`. Controlled when
   * `onModeChange` is also passed.
   *
   * @deprecated Passing `mode` **without** `onModeChange` keeps the v1.0
   * behavior — it only sets the initial mode and the toggle still switches.
   * Use `defaultMode` for that; in v2 `mode` will always be controlled.
   */
  mode?: TimePickerMode
  /** Uncontrolled initial display mode. @default 'dial' */
  defaultMode?: TimePickerMode
  /** Fires when the toggle switches the display mode. */
  onModeChange?: (mode: TimePickerMode) => void
  /** Show the dial / input toggle. @default true */
  showModeToggle?: boolean
  /**
   * 12-hour clock with AM / PM (`true`) or 24-hour clock (`false`).
   * Defaults to the `locale`'s hour cycle.
   */
  ampm?: boolean
  /** Locale whose hour cycle sets the default `ampm`. @default 'en-US' */
  locale?: string
  /** Headline. @default 'Select time' ('Enter time' in input mode) */
  titleLabel?: string
  /** Name of the hour input / dial and its supporting text. @default 'Hour' */
  hourLabel?: string
  /** Name of the minute input / dial and its supporting text. @default 'Minute' */
  minuteLabel?: string
  /** Name of the hour selector. @default 'Select hour' */
  selectHourLabel?: string
  /** Name of the minute selector. @default 'Select minutes' */
  selectMinuteLabel?: string
  /** Name of the AM / PM group. @default 'AM or PM' */
  periodLabel?: string
  /** @default 'AM' */
  amLabel?: string
  /** @default 'PM' */
  pmLabel?: string
  /** Name of the toggle while showing the dial. @default 'Toggle input picker' */
  switchToInputLabel?: string
  /** Name of the toggle while showing the text input. @default 'Toggle dial picker' */
  switchToDialLabel?: string
  /**
   * Accessible name of an hour on the dial and of the hour selector's value.
   * Receives the displayed hour (1–12 with AM/PM, 0–23 without).
   * @default (hour, ampm) => ampm ? `${hour} o'clock` : `${hour} hours`
   */
  getHourLabel?: (hour: number, ampm: boolean) => string
  /**
   * Accessible name of a minute on the dial and of the minute selector's value.
   * @default (minute) => `${minute} minutes`
   */
  getMinuteLabel?: (minute: number) => string
  /**
   * Input-mode error for an out-of-range field.
   * @default 'Hour must be 1–12' / 'Hour must be 0–23' / 'Minute must be 0–59'
   */
  getErrorLabel?: (field: 'hour' | 'minute', ampm: boolean) => string
  /** @default 'OK' */
  okLabel?: string
  /** @default 'Cancel' */
  cancelLabel?: string
}

// Dial geometry (Compose ClockDialContainerSize / OuterCircleToSizeRatio /
// InnerCircleToSizeRatio / ClockDialSelectorHandleContainerSize / MaxDistance).
const DIAL_SIZE = 256
const CENTER = DIAL_SIZE / 2
const OUTER_RADIUS = 101
const INNER_RADIUS = 69
const HANDLE_SIZE = 48
// A 24h tap / drag closer than this to the center picks the inner ring.
const INNER_RING_MAX_DISTANCE = 74
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

const pad2 = (n: number) => String(n).padStart(2, '0')

const HOURS_12: DialLabel[] = Array.from({ length: 12 }, (_, i) => ({
  value: i === 0 ? 12 : i,
  text: String(i === 0 ? 12 : i),
  angle: i * 30,
  radius: OUTER_RADIUS,
}))
// 24h (Compose): outer ring 0–11, inner ring 12–23, keyboard order outer → inner.
const HOURS_24: DialLabel[] = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  text: i === 0 ? '00' : String(i),
  angle: (i % 12) * 30,
  radius: i < 12 ? OUTER_RADIUS : INNER_RADIUS,
}))
const MINUTES: DialLabel[] = Array.from({ length: 12 }, (_, i) => ({
  value: i * 5,
  text: pad2(i * 5),
  angle: i * 30,
  radius: OUTER_RADIUS,
}))

/** Clockwise angle (degrees, 0 = 12 o'clock) of a point relative to the center. */
function angleOf(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI
  return (deg + 360) % 360
}

function position(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return { left: CENTER + radius * Math.sin(rad), top: CENTER - radius * Math.cos(rad) }
}

/** Whether `locale` formats hours with a 12-hour cycle (B8). */
function localeUsesAmPm(locale: string): boolean {
  try {
    const options: { hourCycle?: string; hour12?: boolean } = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
    }).resolvedOptions()
    if (options.hourCycle) return options.hourCycle === 'h12' || options.hourCycle === 'h11'
    return options.hour12 ?? true
  } catch {
    return true
  }
}

/**
 * Status of a time-input field's text:
 * - `valid` — a committable value (`value` is set);
 * - `pending` — an incomplete entry (empty, or a lone leading `0` in a 12h
 *   hour field): no error, nothing committed;
 * - `invalid` — out of range (e.g. 12h hour `13` / `00`, minute `75`): error
 *   state, nothing committed.
 */
type FieldStatus =
  | { status: 'valid'; value: number }
  | { status: 'pending' }
  | { status: 'invalid' }

function parseField(field: Field, text: string, ampm: boolean): FieldStatus {
  if (text === '' || (field === 'hour' && ampm && text === '0')) return { status: 'pending' }
  const n = Number(text)
  const [min, max] = field === 'minute' ? [0, 59] : ampm ? [1, 12] : [0, 23]
  return n >= min && n <= max ? { status: 'valid', value: n } : { status: 'invalid' }
}

const defaultErrorLabel = (field: Field, ampm: boolean) =>
  field === 'minute' ? 'Minute must be 0–59' : ampm ? 'Hour must be 1–12' : 'Hour must be 0–23'
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
 * selectors and AM / PM are radio groups. With `ampm={false}` (or a 24-hour
 * `locale`) the dial has an inner 12–23 ring and there is no AM / PM.
 *
 * Input mode validates like Compose `TimeInput`: 2 digits max, out-of-range
 * text shows an error and is not committed, and an empty / invalid field
 * reverts to the current value on blur. `onChange` only ever receives valid
 * values.
 *
 * `onAccept` / `onCancel` add the "Select time" headline and Cancel / OK
 * (Compose `TimePickerDialog`), with draft / commit semantics; `open` shows
 * the picker as a modal dialog that reports `onClose(reason)`.
 */
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  function TimePicker(
    {
      value,
      defaultValue,
      onChange,
      onAccept,
      onCancel,
      open,
      onClose,
      mode: modeProp,
      defaultMode,
      onModeChange,
      showModeToggle = true,
      ampm: ampmProp,
      locale = 'en-US',
      titleLabel,
      hourLabel = 'Hour',
      minuteLabel = 'Minute',
      selectHourLabel = 'Select hour',
      selectMinuteLabel = 'Select minutes',
      periodLabel = 'AM or PM',
      amLabel = 'AM',
      pmLabel = 'PM',
      switchToInputLabel = 'Toggle input picker',
      switchToDialLabel = 'Toggle dial picker',
      getHourLabel = defaultHourLabel,
      getMinuteLabel = defaultMinuteLabel,
      getErrorLabel = defaultErrorLabel,
      okLabel = 'OK',
      cancelLabel = 'Cancel',
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
    const idBase = useId()
    const titleId = `${idBase}-title`

    const localeAmPm = useMemo(() => localeUsesAmPm(locale), [locale])
    const ampm = ampmProp ?? localeAmPm

    // `mode` is controlled only together with `onModeChange`; on its own it
    // is the deprecated v1.0 initial-mode prop.
    const modeControlled = modeProp !== undefined && onModeChange !== undefined
    const [internalMode, setInternalMode] = useState<TimePickerMode>(
      defaultMode ?? modeProp ?? 'dial',
    )
    const viewMode = modeControlled ? modeProp : internalMode
    const isInput = viewMode === 'input'

    const modal = open !== undefined
    const isOpen = modal ? !!open : true
    const hasActions = modal || onAccept != null || onCancel != null

    const period: 'AM' | 'PM' = current.hour < 12 ? 'AM' : 'PM'
    const hour12 = current.hour % 12 === 0 ? 12 : current.hour % 12
    // The hour as shown (selector, dial, input): 1–12 or 0–23.
    const displayHour = ampm ? hour12 : current.hour

    const commit = (next: TimeValue) => {
      if (next.hour === current.hour && next.minute === current.minute) return
      if (!isControlled) setInternal(next)
      onChange?.(next)
    }

    /** Set the hour from its displayed form (1–12 keeps the period). */
    const setDisplayHour = (h: number) => {
      if (!ampm) {
        commit({ ...current, hour: h })
        return
      }
      const base = h % 12
      commit({ ...current, hour: period === 'PM' ? base + 12 : base })
    }
    const setMinute = (m: number) => commit({ ...current, minute: m })
    const setPeriod = (p: 'AM' | 'PM') => {
      if (p === period) return
      commit({ ...current, hour: (current.hour + 12) % 24 })
    }

    // ---- Draft / commit (B6) ------------------------------------------------
    // The committed value Cancel reverts to: captured when a modal opens,
    // otherwise on mount and on each accept.
    const committed = useRef<TimeValue>(current)
    const wasOpen = useRef(false)
    if (isOpen && !wasOpen.current) committed.current = current
    wasOpen.current = isOpen

    const accept = () => {
      committed.current = current
      onAccept?.(current)
      if (modal) onClose?.('accept')
    }

    const dismiss = (reason: Exclude<TimePickerCloseReason, 'accept'>) => {
      setDrafts({ hour: null, minute: null })
      commit(committed.current)
      onCancel?.()
      if (modal) onClose?.(reason)
    }
    const dismissRef = useRef(dismiss)
    dismissRef.current = dismiss

    // Escape dismisses a modal picker.
    useEffect(() => {
      if (!modal || !open) return
      const handle = (event: globalThis.KeyboardEvent) => {
        if (event.key === 'Escape') dismissRef.current('escapeKeyDown')
      }
      document.addEventListener('keydown', handle)
      return () => document.removeEventListener('keydown', handle)
    }, [modal, open])

    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    useModal({ active: modal && !!open, rootRef, surfaceRef })

    const setMode = (next: TimePickerMode) => {
      if (!modeControlled) setInternalMode(next)
      onModeChange?.(next)
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
    //   hour, or a typed digit that can't start a valid 2-digit hour (2–9 on
    //   a 12h clock, 3–9 on a 24h clock); Enter on a valid hour also advances,
    //   and Enter on a valid minute accepts when there is an action row.
    const [drafts, setDrafts] = useState<Record<Field, string | null>>({
      hour: null,
      minute: null,
    })
    const minuteInputRef = useRef<HTMLInputElement>(null)

    const fieldText: Record<Field, string> = {
      hour: drafts.hour ?? pad2(displayHour),
      minute: drafts.minute ?? pad2(current.minute),
    }

    const applyText = (field: Field, text: string, typed: boolean) => {
      setDrafts((d) => ({ ...d, [field]: text }))
      const parsed = parseField(field, text, ampm)
      if (parsed.status !== 'valid') return
      if (field === 'hour') {
        if (parsed.value !== displayHour) setDisplayHour(parsed.value)
        const lone = ampm ? parsed.value >= 2 : parsed.value >= 3
        if (text.length === 2 || (typed && text.length === 1 && lone)) {
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
        parseField(field, input.value, ampm).status === 'valid'
      ) {
        if (field === 'hour') {
          event.preventDefault()
          minuteInputRef.current?.focus()
        } else if (hasActions) {
          event.preventDefault()
          accept()
        }
      }
    }

    const renderFieldInput = (field: Field) => {
      const invalid = parseField(field, fieldText[field], ampm).status === 'invalid'
      const errorId = `${idBase}-${field}-error`
      const label = field === 'hour' ? hourLabel : minuteLabel
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
            aria-label={label}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            data-error={invalid || undefined}
            {...(field === 'hour' ? { 'data-autofocus': true } : {})}
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
            {label}
          </span>
          <span
            id={errorId}
            className={styles.supportingText}
            data-error="true"
            aria-live="polite"
          >
            {invalid ? getErrorLabel(field, ampm) : ''}
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
    const isHourDial = activeField === 'hour'
    const labels = isHourDial ? (ampm ? HOURS_12 : HOURS_24) : MINUTES

    // The label that owns the dial's single Tab stop: the selected value, or
    // the nearest 5-minute mark for an in-between minute (Compose ClockText
    // `isTheSelectedValue`).
    const entryValue = isHourDial ? displayHour : (Math.round(current.minute / 5) * 5) % 60
    // Exactly the selected value (announced as the current one).
    const isCurrent = (label: DialLabel) =>
      label.value === (isHourDial ? displayHour : current.minute)

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

    const valueAngle = isHourDial ? (current.hour % 12) * 30 : current.minute * 6
    const handRadius =
      isHourDial && !ampm && current.hour >= 12 ? INNER_RADIUS : OUTER_RADIUS
    const targetAngle = dragAngle ?? valueAngle
    // Unwrap the angle so the CSS transition rotates the short way round
    // (e.g. 330° → 30° turns +60°, not −300°). Idempotent per render.
    const lastAngle = useRef(targetAngle)
    let diff = (targetAngle - lastAngle.current) % 360
    if (diff > 180) diff -= 360
    if (diff <= -180) diff += 360
    const handAngle = lastAngle.current + diff
    lastAngle.current = handAngle

    const selectFromDial = (angle: number, distance: number, dragging: boolean) => {
      if (isHourDial) {
        const index = Math.round(angle / 30) % 12
        if (ampm) setDisplayHour(index || 12)
        else setDisplayHour(index + (distance < INNER_RING_MAX_DISTANCE ? 12 : 0))
      } else {
        // Taps snap to the 5-minute marks, drags have 1-minute resolution.
        setMinute(
          dragging ? Math.round(angle / 6) % 60 : (Math.round(angle / 30) * 5) % 60,
        )
      }
    }

    const pointerPolar = (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      // Distances in dial units (the dial may be scaled).
      const scale = rect.width ? DIAL_SIZE / rect.width : 1
      return { angle: angleOf(dx, dy), distance: Math.hypot(dx, dy) * scale }
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
      const { angle, distance } = pointerPolar(event)
      setSnap(true)
      setDragAngle(angle)
      selectFromDial(angle, distance, true)
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
      const { angle, distance } = pointerPolar(event)
      selectFromDial(angle, distance, false)
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
      if (isHourDial) setDisplayHour(label.value)
      else setMinute(label.value)
    }

    const onLabelKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
      // One loop through every number: in 24h the outer ring continues
      // into the inner ring and back (Compose focus loop).
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

    if (modal && !open) return null

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
          {...(checked ? { 'data-autofocus': true } : {})}
          className={styles.field}
          aria-label={field === 'hour' ? selectHourLabel : selectMinuteLabel}
          aria-describedby={field === 'hour' ? hourValueId : minuteValueId}
          onClick={() => selectField(field)}
          onKeyDown={radioKeyDown(
            ['hour', 'minute'] as const,
            activeField,
            selectorRefs.current,
            selectField,
          )}
        >
          {field === 'hour' ? pad2(displayHour) : pad2(current.minute)}
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

    const surface = (
      <div
        ref={(node) => assignRefs(node, surfaceRef, ref)}
        {...(modal
          ? { role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, tabIndex: -1 }
          : {})}
        {...rest}
        data-mode={viewMode}
        data-24h={!ampm || undefined}
        className={clsx(styles.picker, modal && styles.modalSurface, className)}
      >
        {hasActions && (
          <span id={titleId} className={styles.headline}>
            {titleLabel ?? (isInput ? 'Enter time' : 'Select time')}
          </span>
        )}

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
                {getHourLabel(displayHour, ampm)}
              </span>
              <span id={minuteValueId} className={styles.visuallyHidden}>
                {getMinuteLabel(current.minute)}
              </span>
            </div>
          )}
          {ampm && (
            <div className={styles.period} role="radiogroup" aria-label={periodLabel}>
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
                  onKeyDown={radioKeyDown(
                    ['AM', 'PM'] as const,
                    period,
                    periodRefs.current,
                    setPeriod,
                  )}
                >
                  {p === 'AM' ? amLabel : pmLabel}
                  <FocusRing />
                  <Ripple />
                </button>
              ))}
            </div>
          )}
        </div>

        {!isInput && (
          <div
            className={styles.dial}
            role="group"
            aria-label={isHourDial ? hourLabel : minuteLabel}
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
                    isHourDial ? getHourLabel(label.value, ampm) : getMinuteLabel(label.value)
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

        {(showModeToggle || hasActions) && (
          <div className={styles.actions}>
            {showModeToggle && (
              <IconButton
                variant="standard"
                icon={isInput ? <ScheduleIcon /> : <KeyboardIcon />}
                aria-label={isInput ? switchToDialLabel : switchToInputLabel}
                onClick={() => setMode(isInput ? 'dial' : 'input')}
              />
            )}
            {hasActions && (
              <>
                <span className={styles.actionsSpacer} />
                <Button variant="text" onClick={() => dismiss('cancel')}>
                  {cancelLabel}
                </Button>
                <Button variant="text" onClick={accept}>
                  {okLabel}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    )

    if (!modal) return surface

    return (
      <div ref={rootRef} className={styles.modalRoot}>
        <div
          className={styles.scrim}
          aria-hidden="true"
          onClick={() => dismiss('backdropClick')}
        />
        {surface}
      </div>
    )
  },
)
