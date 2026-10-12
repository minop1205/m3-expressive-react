import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react'
import clsx from 'clsx'
import { TextField } from '../TextField'
import { IconButton } from '../IconButton'
import { Calendar, type CalendarView } from './Calendar'
import { CalendarIcon } from '../../internal/icons'
import { assignRefs } from '../../internal/useModal'
import { usePopupPosition } from '../../internal/usePopupPosition'
import {
  defaultErrorLabel,
  formatDateInput,
  getDatePattern,
  isWithin,
  parseDateInput,
  startOfDay,
  type DateInputError,
} from './dateUtils'
import pickerStyles from './DatePicker.module.css'
import styles from './DatePickerField.module.css'

export type { DateInputError } from './dateUtils'

/** Gap between the field and the calendar popup. */
const ANCHOR_GAP_PX = 4

/** Minimum distance the popup keeps from the viewport edges when clamped. */
const VIEWPORT_MARGIN_PX = 8

export interface DatePickerFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled selected date. */
  value?: Date | null
  /** Uncontrolled initial date. */
  defaultValue?: Date | null
  /** Fires with the newly selected / committed typed date (or null when cleared). */
  onChange?: (date: Date | null) => void
  /** Field label. @default 'Date' */
  label?: string
  /** Earliest selectable date. */
  min?: Date
  /** Latest selectable date. */
  max?: Date
  /** BCP-47 locale — display format, typed-date field order, week start. @default 'en-US' */
  locale?: string
  disabled?: boolean
  className?: string
  /**
   * Helper text under the field. Defaults to the locale's input format
   * (e.g. `MM/DD/YYYY`), as m3 accessibility asks.
   */
  supportingText?: string
  /** Accessible label of the calendar toggle. @default 'Open calendar' */
  openCalendarLabel?: string
  /** Accessible name of the calendar popup (`role="dialog"`). @default 'Choose date' */
  dialogLabel?: string
  /**
   * Error message for rejected typed text. Defaults to Compose's English
   * strings: "Date does not match expected pattern: MM/DD/YYYY" / "Date not
   * allowed".
   */
  getErrorLabel?: (error: DateInputError, pattern: string) => string
  /** Accessible label of the previous-month button. @default 'Previous month' */
  previousMonthLabel?: string
  /** Accessible label of the next-month button. @default 'Next month' */
  nextMonthLabel?: string
  /** Accessible label of the previous-year button. @default 'Previous year' */
  previousYearLabel?: string
  /** Accessible label of the next-year button. @default 'Next year' */
  nextYearLabel?: string
  /** Accessible name of the month menu list. @default 'Select month' */
  selectMonthLabel?: string
  /** Accessible name of the year menu list. @default 'Select year' */
  selectYearLabel?: string
  /** Prefix announced on today's cell. @default 'Today' */
  todayLabel?: string
}

/**
 * Material Design 3 Docked date picker.
 *
 * An outlined text field (type a date directly) with a trailing calendar
 * button that opens the calendar in a dropdown — the docked variant per
 * m3.material.io (16dp corners, a 64dp header with month and year menu
 * buttons and arrows, neighbouring-month days at 38%). Typed text is parsed on Enter or blur in the locale's field
 * order (no input mask; `-`, `/`, `.` and spaces all work) and rejected text
 * shows an error; the helper text states the format.
 *
 * The popup is a non-modal `role="dialog"`: opening moves focus to the
 * selected day (else today), Escape or a pick closes it and returns focus to
 * the toggle, and it closes when focus or a click leaves the field. It is
 * drawn in the top layer (Popover API) below the field — above it when it
 * doesn't fit below — and kept inside the viewport.
 */
export const DatePickerField = forwardRef<HTMLDivElement, DatePickerFieldProps>(
  function DatePickerField(
    {
      value,
      defaultValue,
      onChange,
      label = 'Date',
      min,
      max,
      locale = 'en-US',
      disabled,
      className,
      supportingText,
      openCalendarLabel = 'Open calendar',
      dialogLabel = 'Choose date',
      getErrorLabel = defaultErrorLabel,
      previousMonthLabel = 'Previous month',
      nextMonthLabel = 'Next month',
      previousYearLabel = 'Previous year',
      nextYearLabel = 'Next year',
      selectMonthLabel = 'Select month',
      selectYearLabel = 'Select year',
      todayLabel = 'Today',
      onKeyDown,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const popupId = useId()
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<Date | null>(defaultValue ?? null)
    const current = isControlled ? value ?? null : internal
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<DateInputError | null>(null)
    const wrapRef = useRef<HTMLDivElement | null>(null)
    const toggleRef = useRef<HTMLButtonElement>(null)
    const popupRef = useRef<HTMLDivElement>(null)
    const pattern = getDatePattern(locale)

    const [text, setText] = useState(current ? formatDateInput(current, locale) : '')
    const [view, setView] = useState<CalendarView>(() => {
      const d = current ?? new Date()
      return { year: d.getFullYear(), month: d.getMonth() }
    })

    const currentTime = current ? current.getTime() : null
    useEffect(() => {
      setText(current ? formatDateInput(current, locale) : '')
      setError(null)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTime, locale])

    // Clicks outside close without moving focus (the click target keeps it).
    useEffect(() => {
      if (!open) return
      const onDown = (e: globalThis.MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', onDown)
      return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    const commit = (d: Date | null) => {
      if (!isControlled) setInternal(d)
      onChange?.(d)
    }

    const close = (restoreFocus: boolean) => {
      setOpen(false)
      if (restoreFocus) toggleRef.current?.focus()
    }

    const openPopup = () => {
      const d = current ?? new Date()
      setView({ year: d.getFullYear(), month: d.getMonth() })
      setOpen(true)
    }

    // Parse / format on Enter or blur only — never per keystroke (#159).
    const commitText = () => {
      const trimmed = text.trim()
      if (trimmed === '') {
        setError(null)
        if (current !== null) commit(null)
        return
      }
      const parsed = parseDateInput(trimmed, locale)
      if (!parsed) {
        setError('invalid')
        return
      }
      if (!isWithin(parsed, min, max)) {
        setError('outOfRange')
        return
      }
      setError(null)
      setText(formatDateInput(parsed, locale))
      if (!current || parsed.getTime() !== startOfDay(current).getTime()) commit(parsed)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.key === 'Escape' && open) {
        // Keep the Escape from also closing an enclosing Dialog.
        event.stopPropagation()
        close(true)
      }
    }

    // Close when focus leaves the field + popup. Deferred so that focus
    // moving between day cells (the old cell unmounts when paging months)
    // settles first.
    const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event)
      if (!open) return
      setTimeout(() => {
        const root = wrapRef.current
        if (root && !root.contains(document.activeElement)) setOpen(false)
      })
    }

    // Below the field (start-aligned), flipped above / clamped into the
    // viewport, in the top layer — the shared popup helper (B4).
    usePopupPosition({
      open,
      anchorRef: wrapRef,
      popupRef,
      side: 'bottom',
      align: 'start',
      gap: ANCHOR_GAP_PX,
      margin: VIEWPORT_MARGIN_PX,
    })

    const showError = error !== null && !disabled

    return (
      <div
        {...rest}
        ref={(node) => assignRefs(node, wrapRef, ref)}
        className={clsx(styles.field, className)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        <TextField
          variant="outlined"
          label={label}
          value={text}
          disabled={disabled}
          supportingText={supportingText ?? pattern}
          error={showError}
          errorText={showError ? getErrorLabel(error, pattern) : undefined}
          onChange={(event) => {
            setText(event.target.value)
            if (error) setError(null)
          }}
          onBlur={commitText}
          inputProps={{
            onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') commitText()
            },
          }}
          endIcon={
            <IconButton
              ref={toggleRef}
              variant="standard"
              className={styles.toggle}
              icon={<CalendarIcon />}
              aria-label={openCalendarLabel}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={open ? popupId : undefined}
              disabled={disabled}
              onClick={() => (open ? close(false) : openPopup())}
            />
          }
        />
        {open && (
          <div
            ref={popupRef}
            id={popupId}
            role="dialog"
            aria-label={dialogLabel}
            tabIndex={-1}
            className={clsx(pickerStyles.picker, pickerStyles.docked, styles.popup)}
          >
            <Calendar
              layout="docked"
              range={false}
              selected={current}
              rangeStart={null}
              rangeEnd={null}
              min={min ?? null}
              max={max ?? null}
              locale={locale}
              view={view}
              onViewChange={setView}
              autoFocus
              onSelect={(date) => {
                // Also when re-picking the current date (no value change to
                // re-sync from): drop stale typed text and its error.
                setText(formatDateInput(date, locale))
                setError(null)
                commit(date)
                close(true)
              }}
              labels={{
                previousMonth: previousMonthLabel,
                nextMonth: nextMonthLabel,
                previousYear: previousYearLabel,
                nextYear: nextYearLabel,
                selectMonth: selectMonthLabel,
                selectYear: selectYearLabel,
                today: todayLabel,
                startDate: 'Start date',
                endDate: 'End date',
                inRange: 'In range',
              }}
            />
          </div>
        )}
      </div>
    )
  },
)
