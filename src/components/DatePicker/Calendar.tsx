import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { IconButton } from '../IconButton'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { ChevronLeftIcon, ChevronRightIcon } from '../../internal/icons'
import {
  daysInMonth,
  getFirstDayOfWeek,
  getMonthGrid,
  sameDay,
  startOfDay,
} from './dateUtils'
import styles from './DatePicker.module.css'

export interface CalendarView {
  year: number
  month: number
}

export interface CalendarLabels {
  previousMonth: string
  nextMonth: string
  today: string
  startDate: string
  endDate: string
  inRange: string
}

export interface CalendarProps {
  range: boolean
  /** Selected date (single mode). */
  selected: Date | null
  /** Range endpoints (range mode). */
  rangeStart: Date | null
  rangeEnd: Date | null
  min: Date | null
  max: Date | null
  locale: string
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  /** `viaEnter` is true when the day was chosen with the Enter key. */
  onSelect: (date: Date, viaEnter: boolean) => void
  labels: CalendarLabels
  /** Move focus to the roving day cell on mount. */
  autoFocus?: boolean
}

/** Date `d` moved by `months`, clamping the day to the target month's length. */
function addMonths(d: Date, months: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const day = Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth()))
  return new Date(target.getFullYear(), target.getMonth(), day)
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * The month view shared by the modal `DatePicker` and the docked
 * `DatePickerField`: month navigation row, weekday header and a 6×7 day grid.
 *
 * Grid semantics follow the APG date picker dialog and m3 accessibility:
 * `role="grid"` labelled by the month, `columnheader`s with the full weekday
 * name, and day `gridcell`s (native buttons) named with the full date plus
 * Compose's range/today prefixes, `aria-selected` on the selection and
 * `aria-current="date"` on today. The grid is a single Tab stop with a roving
 * tabindex (selected → today → 1st); arrows move by day / week, PageUp/Down by
 * month, Shift+PageUp/Down by year, Home/End to the first/last day of the
 * month (m3 key table), and Enter/Space select.
 */
export function Calendar({
  range,
  selected,
  rangeStart,
  rangeEnd,
  min,
  max,
  locale,
  view,
  onViewChange,
  onSelect,
  labels,
  autoFocus = false,
}: CalendarProps) {
  const monthLabelId = useId()
  const gridRef = useRef<HTMLDivElement>(null)
  const [focusedDate, setFocusedDate] = useState<Date | null>(null)
  // Set by keyboard navigation: focus the roving cell after the next render.
  const pendingFocus = useRef(autoFocus)

  const today = startOfDay(new Date())
  const minDay = min ? startOfDay(min) : null
  const maxDay = max ? startOfDay(max) : null
  const inView = (d: Date | null | undefined): boolean =>
    d != null && d.getFullYear() === view.year && d.getMonth() === view.month

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(view.year, view.month, 1))

  // Weeks start on the locale's first day (Compose `firstDayOfWeek`).
  const firstDayOfWeek = getFirstDayOfWeek(locale)
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2023, 0, 1 + ((firstDayOfWeek + i) % 7)) // 2023-01-01 is a Sunday
    return {
      narrow: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d),
      long: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d),
    }
  })
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Always 6 weeks so the container height never jumps while paging
  // (Compose lays out MaxCalendarRows = 6).
  const rows = getMonthGrid(view.year, view.month, firstDayOfWeek)

  const isDisabled = (date: Date) =>
    (minDay != null && date < minDay) || (maxDay != null && date > maxDay)

  // Roving tab stop: the focused date when it is in view, else selected →
  // today → the 1st of the displayed month.
  const tabbable: Date =
    [focusedDate, range ? rangeStart : selected, range ? rangeEnd : null, today].find(
      (d): d is Date => inView(d),
    ) ?? new Date(view.year, view.month, 1)

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-date="${dateKey(tabbable)}"]`)
      ?.focus()
  })

  const moveFocus = (next: Date) => {
    if (!inView(next)) onViewChange({ year: next.getFullYear(), month: next.getMonth() })
    setFocusedDate(next)
    pendingFocus.current = true
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    const rtl = gridRef.current ? getComputedStyle(gridRef.current).direction === 'rtl' : false
    const dir = rtl ? -1 : 1
    const addDays = (n: number) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
    let next: Date | null = null
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(-dir)
        break
      case 'ArrowRight':
        next = addDays(dir)
        break
      case 'ArrowUp':
        next = addDays(-7)
        break
      case 'ArrowDown':
        next = addDays(7)
        break
      case 'PageUp':
        next = addMonths(date, event.shiftKey ? -12 : -1)
        break
      case 'PageDown':
        next = addMonths(date, event.shiftKey ? 12 : 1)
        break
      case 'Home':
        next = new Date(date.getFullYear(), date.getMonth(), 1)
        break
      case 'End':
        next = new Date(
          date.getFullYear(),
          date.getMonth(),
          daysInMonth(date.getFullYear(), date.getMonth()),
        )
        break
      case 'Enter':
        event.preventDefault()
        if (!isDisabled(date)) onSelect(date, true)
        return
      default:
        return
    }
    event.preventDefault()
    moveFocus(next)
  }

  const describe = (date: Date) => {
    const parts: string[] = []
    if (range) {
      const complete = rangeStart != null && rangeEnd != null
      if (sameDay(rangeStart, date)) parts.push(labels.startDate)
      else if (sameDay(rangeEnd, date)) parts.push(labels.endDate)
      else if (complete && date > rangeStart && date < rangeEnd) parts.push(labels.inRange)
    }
    if (sameDay(today, date)) parts.push(labels.today)
    parts.push(fullDate.format(date))
    return parts.join(', ')
  }

  const changeMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1)
    onViewChange({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <>
      <div className={styles.nav}>
        <span id={monthLabelId} className={styles.monthLabel} aria-live="polite">
          {monthLabel}
        </span>
        <div className={styles.navButtons}>
          <IconButton
            variant="standard"
            icon={<ChevronLeftIcon />}
            aria-label={labels.previousMonth}
            onClick={() => changeMonth(-1)}
          />
          <IconButton
            variant="standard"
            icon={<ChevronRightIcon />}
            aria-label={labels.nextMonth}
            onClick={() => changeMonth(1)}
          />
        </div>
      </div>

      <div ref={gridRef} role="grid" aria-labelledby={monthLabelId} className={styles.grid}>
        <div role="row" className={styles.row}>
          {weekdays.map((w, i) => (
            <span key={i} role="columnheader" className={styles.weekday}>
              <span aria-hidden="true">{w.narrow}</span>
              <span className={styles.visuallyHidden}>{w.long}</span>
            </span>
          ))}
        </div>
        {rows.map((week, r) => (
          <div key={r} role="row" className={styles.row}>
            {week.map(({ date, outside }) => {
              if (outside) {
                return <span key={dateKey(date)} role="gridcell" className={styles.empty} />
              }
              const disabled = isDisabled(date)
              const isStart = range && sameDay(rangeStart, date)
              const isEnd = range && sameDay(rangeEnd, date)
              const complete = range && rangeStart != null && rangeEnd != null
              const isSelected = range ? isStart || isEnd : sameDay(selected, date)
              const inRange = complete && date > rangeStart! && date < rangeEnd!
              const isToday = sameDay(today, date)
              return (
                <button
                  key={dateKey(date)}
                  type="button"
                  role="gridcell"
                  tabIndex={sameDay(tabbable, date) ? 0 : -1}
                  aria-label={describe(date)}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-disabled={disabled || undefined}
                  data-date={dateKey(date)}
                  data-selected={isSelected || undefined}
                  data-in-range={inRange || undefined}
                  data-range-start={(complete && isStart) || undefined}
                  data-range-end={(complete && isEnd) || undefined}
                  data-today={isToday || undefined}
                  data-disabled={disabled || undefined}
                  className={styles.day}
                  onFocus={() => setFocusedDate(date)}
                  onKeyDown={(e) => handleKeyDown(e, date)}
                  onClick={() => {
                    if (!disabled) onSelect(date, false)
                  }}
                >
                  <span className={styles.dayIndicator} aria-hidden="true">
                    {date.getDate()}
                  </span>
                  <Ripple disabled={disabled} className={styles.dayRipple} />
                  <FocusRing className={styles.dayFocusRing} />
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
