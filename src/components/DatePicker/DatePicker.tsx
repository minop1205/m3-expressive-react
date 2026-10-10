import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react'
import clsx from 'clsx'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { TextField } from '../TextField'
import { Calendar, type CalendarView } from './Calendar'
import { CalendarIcon, EditIcon } from '../../internal/icons'
import { assignRefs, useModal } from '../../internal/useModal'
import {
  defaultErrorLabel,
  formatDateInput,
  getDatePattern,
  isWithin,
  parseDateInput,
  sameDay,
  type DateInputError,
} from './dateUtils'
import styles from './DatePicker.module.css'

/** `[start, end]` — either may be null while selecting. */
export type DateRange = [Date | null, Date | null]

/** How the picker is showing dates: the calendar grid or text fields. */
export type DatePickerMode = 'calendar' | 'input'

/**
 * Why a modal picker closed — the shared Phase B vocabulary (B7): OK / Enter
 * (`accept`), the Cancel button (`cancel`), Escape (`escapeKeyDown`) or a
 * scrim click (`backdropClick`).
 */
export type DatePickerCloseReason = 'accept' | 'cancel' | 'escapeKeyDown' | 'backdropClick'

export interface DatePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Select a start/end range instead of a single date. @default false */
  range?: boolean
  /** Controlled value — a `Date` (single) or `[start, end]` (range). */
  value?: Date | DateRange | null
  /** Uncontrolled initial value. */
  defaultValue?: Date | DateRange | null
  /**
   * Fires with the new value (`Date` in single mode, `[start, end]` in range)
   * on every pick — with the action row this is the draft; `onAccept` commits.
   */
  onChange?: (value: Date | DateRange) => void
  /** Earliest selectable date (inclusive). */
  min?: Date
  /** Latest selectable date (inclusive). */
  max?: Date
  /** BCP-47 locale for month / weekday names, the week's first day and the input format. @default 'en-US' */
  locale?: string

  /**
   * OK / Enter commits the draft. Passing `onAccept`, `onCancel` or `open`
   * renders the Cancel / OK action row (m3 anatomy; Compose
   * `DatePickerDialog`). OK is enabled once a date (or a full range) is set.
   */
  onAccept?: (value: Date | DateRange) => void
  /**
   * Cancel, Escape or a scrim click: the value reverts to what it was when
   * the picker opened (or was last accepted) — reported through `onChange`
   * when it can be expressed (a date, or a range) — and this fires.
   */
  onCancel?: () => void
  /**
   * Show the picker as a modal dialog (scrim, focus trap, Escape) — the
   * Compose `DatePickerDialog` equivalent. Omit for an inline picker.
   */
  open?: boolean
  /** Modal only: the picker asks to close, with the reason (B7 vocabulary). */
  onClose?: (reason: DatePickerCloseReason) => void

  /** Controlled display mode (calendar grid or text input). */
  mode?: DatePickerMode
  /** Uncontrolled initial display mode. @default 'calendar' */
  defaultMode?: DatePickerMode
  /** Fires when the header toggle switches the display mode. */
  onModeChange?: (mode: DatePickerMode) => void
  /** Show the header's calendar / text-input toggle (m3: date input via the edit icon). @default true */
  showModeToggle?: boolean

  /** Header title. @default 'Select date' ('Select dates' in range mode, 'Enter dates' for range input) */
  titleLabel?: string
  /** Headline shown while no date is selected (single mode). @default 'Selected date' ('Entered date' in input mode) */
  noSelectionLabel?: string
  /** Accessible label of the previous-month button. @default 'Previous month' */
  previousMonthLabel?: string
  /** Accessible label of the next-month button. @default 'Next month' */
  nextMonthLabel?: string
  /** Accessible name of the year picker list. @default 'Select year' */
  selectYearLabel?: string
  /** Prefix announced on today's cell. @default 'Today' */
  todayLabel?: string
  /** Range start: cell prefix, headline placeholder and input label. @default 'Start date' */
  startDateLabel?: string
  /** Range end: cell prefix, headline placeholder and input label. @default 'End date' */
  endDateLabel?: string
  /** Prefix announced on days inside the range. @default 'In range' */
  inRangeLabel?: string
  /** Label of the single-date text field in input mode. @default 'Date' */
  inputLabel?: string
  /** Accessible label of the toggle while showing the calendar. @default 'Switch to text input mode' */
  switchToInputLabel?: string
  /** Accessible label of the toggle while showing the text input. @default 'Switch to calendar input mode' */
  switchToCalendarLabel?: string
  /** Input-mode error message. Defaults to Compose's English strings. */
  getErrorLabel?: (error: DateInputError, pattern: string) => string
  /** Confirm button label. @default 'OK' */
  okLabel?: string
  /** Dismiss button label. @default 'Cancel' */
  cancelLabel?: string
}

function asRange(v: Date | DateRange | null | undefined): DateRange {
  return Array.isArray(v) ? v : [null, null]
}

function sameDate(a: Date | null | undefined, b: Date | null | undefined) {
  return (a == null && b == null) || sameDay(a, b)
}

function sameValue(a: Date | DateRange | null, b: Date | DateRange | null) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const [a0, a1] = asRange(a)
    const [b0, b1] = asRange(b)
    return sameDate(a0, b0) && sameDate(a1, b1)
  }
  return sameDate(a, b)
}

function isComplete(v: Date | DateRange | null): v is Date | DateRange {
  return Array.isArray(v) ? v[0] != null && v[1] != null : v != null
}

/**
 * Material Design 3 Date picker (modal calendar, with date input).
 *
 * SurfaceContainerHigh panel, 28dp corners, 360dp wide, elevation 3. Day cells
 * are 40dp round; selected fills Primary / OnPrimary, today shows a 1dp Primary
 * outline. In `range` mode two dates are picked and the span is highlighted with
 * SecondaryContainer — per Compose DatePickerModalTokens. The day grid is an
 * APG grid (single Tab stop, arrow / Page / Home / End keys); the month label
 * is a menu button that swaps the grid for a year picker, and the header's
 * edit icon switches to text input (m3 "modal date input").
 *
 * Draft / commit (Phase B B6): `onChange` reports every pick; passing
 * `onAccept` / `onCancel` adds the Cancel / OK row, and `open` shows the
 * picker as a modal dialog — no separate `DatePickerDialog`. For the docked
 * variant use `DatePickerField`.
 *
 * Built-in strings are English by default and can be replaced through the
 * `*Label` props.
 */
export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  function DatePicker(
    {
      range = false,
      value,
      defaultValue,
      onChange,
      min,
      max,
      locale = 'en-US',
      onAccept,
      onCancel,
      open,
      onClose,
      mode: modeProp,
      defaultMode = 'calendar',
      onModeChange,
      showModeToggle = true,
      titleLabel,
      noSelectionLabel,
      previousMonthLabel = 'Previous month',
      nextMonthLabel = 'Next month',
      selectYearLabel = 'Select year',
      todayLabel = 'Today',
      startDateLabel = 'Start date',
      endDateLabel = 'End date',
      inRangeLabel = 'In range',
      inputLabel = 'Date',
      switchToInputLabel = 'Switch to text input mode',
      switchToCalendarLabel = 'Switch to calendar input mode',
      getErrorLabel = defaultErrorLabel,
      okLabel = 'OK',
      cancelLabel = 'Cancel',
      className,
      ...rest
    },
    ref,
  ) {
    const titleId = useId()
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<Date | DateRange | null>(
      defaultValue ?? (range ? [null, null] : null),
    )
    const currentValue = isControlled ? value ?? null : internal

    const [internalMode, setInternalMode] = useState<DatePickerMode>(defaultMode)
    const mode = modeProp ?? internalMode
    const inputMode = mode === 'input'

    const modal = open !== undefined
    const isOpen = modal ? !!open : true
    const hasActions = modal || onAccept != null || onCancel != null

    const single = range ? null : (currentValue as Date | null)
    const [rStart, rEnd] = range ? asRange(currentValue) : [null, null]

    const anchor = single ?? rStart
    const [view, setView] = useState<CalendarView>(() => {
      const d = anchor ?? new Date()
      return { year: d.getFullYear(), month: d.getMonth() }
    })

    // Follow a value set from outside (e.g. a controlled reset) into view;
    // picks made in the grid are already in the displayed month.
    const anchorTime = anchor?.getTime() ?? null
    const lastAnchor = useRef(anchorTime)
    useEffect(() => {
      if (lastAnchor.current === anchorTime) return
      lastAnchor.current = anchorTime
      if (anchor) setView({ year: anchor.getFullYear(), month: anchor.getMonth() })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorTime])

    // The committed value Cancel reverts to: captured when a modal opens,
    // otherwise on mount and on each accept.
    const committed = useRef<Date | DateRange | null>(currentValue)
    const wasOpen = useRef(false)
    if (isOpen && !wasOpen.current) committed.current = currentValue
    wasOpen.current = isOpen

    const commit = (next: Date | DateRange) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    }

    const accept = (next: Date | DateRange | null = currentValue) => {
      if (!isComplete(next)) return
      committed.current = next
      onAccept?.(next)
      if (modal) onClose?.('accept')
    }

    const dismiss = (reason: Exclude<DatePickerCloseReason, 'accept'>) => {
      const back = committed.current
      if (!sameValue(currentValue, back)) {
        if (!isControlled) setInternal(back)
        // onChange cannot carry "no date" in single mode; a range can.
        const revert = back ?? (range ? ([null, null] as DateRange) : null)
        if (revert != null) onChange?.(revert)
      }
      onCancel?.()
      if (modal) onClose?.(reason)
    }
    const dismissRef = useRef(dismiss)
    dismissRef.current = dismiss

    const selectDay = (date: Date, viaEnter: boolean) => {
      let next: Date | DateRange
      if (!range) {
        next = date
      } else if (!rStart || rEnd || date < rStart) {
        // Range: first pick sets start; second sets end (or restarts) —
        // Compose updateDateSelection.
        next = [date, null]
      } else {
        next = [rStart, date]
      }
      commit(next)
      // m3 key table: Enter saves the selected date (and closes a modal).
      if (viaEnter && hasActions) accept(next)
    }

    // Fade the content in only on a mode switch, not on first render.
    const modeSwitched = useRef(false)
    const setMode = (next: DatePickerMode) => {
      modeSwitched.current = true
      if (modeProp === undefined) setInternalMode(next)
      onModeChange?.(next)
    }

    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    // Escape dismisses a modal picker (only when it is the topmost modal).
    useModal({
      active: modal && !!open,
      rootRef,
      surfaceRef,
      onEscape: () => dismissRef.current('escapeKeyDown'),
    })

    if (modal && !open) return null

    const fmt = (d: Date) =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(d)
    const title =
      titleLabel ?? (range ? (inputMode ? 'Enter dates' : 'Select dates') : 'Select date')
    const headline = range
      ? `${rStart ? fmt(rStart) : startDateLabel} – ${rEnd ? fmt(rEnd) : endDateLabel}`
      : single
        ? fmt(single)
        : (noSelectionLabel ?? (inputMode ? 'Entered date' : 'Selected date'))

    const surface = (
      <div
        ref={(node) => assignRefs(node, surfaceRef, ref)}
        {...(modal
          ? { role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, tabIndex: -1 }
          : {})}
        {...rest}
        className={clsx(styles.picker, modal && styles.modalSurface, className)}
        data-mode={mode}
      >
        <div className={styles.header} data-range={range || undefined}>
          <span id={titleId} className={styles.supporting}>
            {title}
          </span>
          <div className={styles.headlineRow}>
            {/* Compose announces selection changes politely ("Current selection"). */}
            <span className={styles.headline} aria-live="polite">
              {headline}
            </span>
            {showModeToggle && (
              <IconButton
                variant="standard"
                icon={inputMode ? <CalendarIcon /> : <EditIcon />}
                aria-label={inputMode ? switchToCalendarLabel : switchToInputLabel}
                onClick={() => setMode(inputMode ? 'calendar' : 'input')}
              />
            )}
          </div>
        </div>

        <div
          key={mode}
          className={styles.content}
          data-animate={modeSwitched.current || undefined}
        >
          {inputMode ? (
            <DateInputs
              range={range}
              single={single}
              rStart={rStart}
              rEnd={rEnd}
              min={min}
              max={max}
              locale={locale}
              labels={{ single: inputLabel, start: startDateLabel, end: endDateLabel }}
              getErrorLabel={getErrorLabel}
              onCommit={(next, viaEnter) => {
                commit(next)
                if (viaEnter && hasActions) accept(next)
              }}
            />
          ) : (
            <Calendar
              range={range}
              selected={single}
              rangeStart={rStart}
              rangeEnd={rEnd}
              min={min ?? null}
              max={max ?? null}
              locale={locale}
              view={view}
              onViewChange={setView}
              onSelect={selectDay}
              labels={{
                previousMonth: previousMonthLabel,
                nextMonth: nextMonthLabel,
                previousYear: '',
                nextYear: '',
                selectYear: selectYearLabel,
                selectMonth: '',
                today: todayLabel,
                startDate: startDateLabel,
                endDate: endDateLabel,
                inRange: inRangeLabel,
              }}
            />
          )}
        </div>

        {hasActions && (
          <div className={styles.actions}>
            <Button variant="text" onClick={() => dismiss('cancel')}>
              {cancelLabel}
            </Button>
            <Button variant="text" disabled={!isComplete(currentValue)} onClick={() => accept()}>
              {okLabel}
            </Button>
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

interface DateInputsProps {
  range: boolean
  single: Date | null
  rStart: Date | null
  rEnd: Date | null
  min?: Date
  max?: Date
  locale: string
  labels: { single: string; start: string; end: string }
  getErrorLabel: (error: DateInputError, pattern: string) => string
  onCommit: (value: Date | DateRange, viaEnter: boolean) => void
}

type InputKey = 'single' | 'start' | 'end'

/**
 * Input mode (m3 "modal date input", Compose `DateInput`): outlined text
 * fields with the locale pattern as placeholder. Parsed on Enter / blur, no
 * input mask; rejected text keeps the value and shows an error.
 */
function DateInputs({
  range,
  single,
  rStart,
  rEnd,
  min,
  max,
  locale,
  labels,
  getErrorLabel,
  onCommit,
}: DateInputsProps) {
  const pattern = getDatePattern(locale)
  const fields: [InputKey, string, Date | null][] = range
    ? [
        ['start', labels.start, rStart],
        ['end', labels.end, rEnd],
      ]
    : [['single', labels.single, single]]
  const [text, setText] = useState<Partial<Record<InputKey, string>>>(() =>
    Object.fromEntries(fields.map(([key, , d]) => [key, d ? formatDateInput(d, locale) : ''])),
  )
  const [errors, setErrors] = useState<Partial<Record<InputKey, DateInputError | null>>>({})

  const commitField = (key: InputKey, viaEnter: boolean) => {
    const raw = (text[key] ?? '').trim()
    const setError = (e: DateInputError | null) => setErrors((prev) => ({ ...prev, [key]: e }))
    if (raw === '') {
      setError(null)
      if (key === 'start' && rStart) onCommit([null, rEnd], false)
      if (key === 'end' && rEnd) onCommit([rStart, null], false)
      return
    }
    const parsed = parseDateInput(raw, locale)
    if (!parsed) return setError('invalid')
    if (!isWithin(parsed, min, max)) return setError('outOfRange')
    if (key === 'end' && rStart && parsed < rStart) return setError('invalidRange')
    if (key === 'start' && rEnd && parsed > rEnd) return setError('invalidRange')
    setError(null)
    setText((prev) => ({ ...prev, [key]: formatDateInput(parsed, locale) }))
    const current = key === 'single' ? single : key === 'start' ? rStart : rEnd
    if (sameDay(current, parsed) && !viaEnter) return
    if (key === 'single') onCommit(parsed, viaEnter)
    else if (key === 'start') onCommit([parsed, rEnd], viaEnter)
    else onCommit([rStart, parsed], viaEnter)
  }

  return (
    <div className={styles.inputs}>
      {fields.map(([key, label], i) => {
        const error = errors[key] ?? null
        return (
          <TextField
            key={key}
            variant="outlined"
            className={styles.inputField}
            label={label}
            placeholder={pattern}
            value={text[key] ?? ''}
            error={error != null}
            errorText={error ? getErrorLabel(error, pattern) : undefined}
            onChange={(event) => {
              const next = event.target.value
              setText((prev) => ({ ...prev, [key]: next }))
              if (error) setErrors((prev) => ({ ...prev, [key]: null }))
            }}
            onBlur={() => commitField(key, false)}
            inputProps={{
              ...(i === 0 ? { 'data-autofocus': true } : {}),
              onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') commitField(key, true)
              },
            }}
          />
        )
      })}
    </div>
  )
}
