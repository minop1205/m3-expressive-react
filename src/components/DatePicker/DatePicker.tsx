import { forwardRef, useState, type HTMLAttributes } from 'react'
import clsx from 'clsx'
import { ChevronLeftIcon, ChevronRightIcon } from '../../internal/icons'
import styles from './DatePicker.module.css'

/** `[start, end]` — either may be null while selecting. */
export type DateRange = [Date | null, Date | null]

export interface DatePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Select a start/end range instead of a single date. @default false */
  range?: boolean
  /** Controlled value — a `Date` (single) or `[start, end]` (range). */
  value?: Date | DateRange | null
  /** Uncontrolled initial value. */
  defaultValue?: Date | DateRange | null
  /** Fires with the new value (`Date` in single mode, `[start, end]` in range). */
  onChange?: (value: Date | DateRange) => void
  /** Earliest selectable date (inclusive). */
  min?: Date
  /** Latest selectable date (inclusive). */
  max?: Date
  /** BCP-47 locale for month / weekday names. @default 'en-US' */
  locale?: string
}


function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function sameDay(a: Date | null | undefined, b: Date) {
  return (
    a != null &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function asRange(v: Date | DateRange | null | undefined): DateRange {
  return Array.isArray(v) ? v : [null, null]
}

/**
 * Material Design 3 Date picker (modal calendar).
 *
 * SurfaceContainerHigh panel, 28dp corners, 360dp wide, elevation 3. Day cells
 * are 40dp round; selected fills Primary / OnPrimary, today shows a 1dp Primary
 * outline. In `range` mode two dates are picked and the span is highlighted with
 * SecondaryContainer — per Compose DatePickerModalTokens. Wrap in a `Dialog`
 * for a full modal experience, or use `DatePickerField` for the docked variant.
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
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<Date | DateRange | null>(
      defaultValue ?? (range ? [null, null] : null),
    )
    const currentValue = isControlled ? value ?? null : internal

    const single = range ? null : (currentValue as Date | null)
    const [rStart, rEnd] = range ? asRange(currentValue) : [null, null]

    const focusDate = single ?? rStart ?? new Date()
    const [view, setView] = useState({
      year: focusDate.getFullYear(),
      month: focusDate.getMonth(),
    })

    const today = startOfDay(new Date())
    const minDay = min ? startOfDay(min) : null
    const maxDay = max ? startOfDay(max) : null

    const monthLabel = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(view.year, view.month, 1))

    const weekdays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2023, 0, 1 + i) // 2023-01-01 is a Sunday
      return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d)
    })

    const fmt = (d: Date) =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(d)
    const headline = range
      ? rStart || rEnd
        ? `${rStart ? fmt(rStart) : 'Start'} – ${rEnd ? fmt(rEnd) : 'End'}`
        : 'Select range'
      : single
        ? fmt(single)
        : 'Select date'

    const firstWeekday = new Date(view.year, view.month, 1).getDay()
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const cells: (number | null)[] = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    const changeMonth = (delta: number) => {
      setView(({ year, month }) => {
        const next = new Date(year, month + delta, 1)
        return { year: next.getFullYear(), month: next.getMonth() }
      })
    }

    const commit = (next: Date | DateRange) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    }

    const selectDay = (day: number) => {
      const date = new Date(view.year, view.month, day)
      if (!range) {
        commit(date)
        return
      }
      // Range: first click sets start; second sets end (or restarts).
      if (!rStart || (rStart && rEnd)) {
        commit([date, null])
      } else if (date < rStart) {
        commit([date, null])
      } else {
        commit([rStart, date])
      }
    }

    const dayState = (day: number) => {
      const date = new Date(view.year, view.month, day)
      if (!range) {
        return { selected: sameDay(single, date), inRange: false, rangeStart: false, rangeEnd: false }
      }
      const isStart = sameDay(rStart, date)
      const isEnd = sameDay(rEnd, date)
      const inRange =
        rStart != null && rEnd != null && date > rStart && date < rEnd
      return { selected: isStart || isEnd, inRange, rangeStart: isStart, rangeEnd: isEnd }
    }

    const isDisabled = (day: number) => {
      const date = new Date(view.year, view.month, day)
      if (minDay && date < minDay) return true
      if (maxDay && date > maxDay) return true
      return false
    }

    return (
      <div ref={ref} {...rest} className={clsx(styles.picker, className)}>
        <div className={styles.header}>
          <span className={styles.supporting}>{range ? 'Select range' : 'Select date'}</span>
          <span className={styles.headline}>{headline}</span>
        </div>

        <div className={styles.nav}>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <div className={styles.navButtons}>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div className={styles.grid} aria-label={monthLabel}>
          {weekdays.map((w, i) => (
            <span key={`wd-${i}`} className={styles.weekday} aria-hidden="true">
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day == null) return <span key={`e-${i}`} className={styles.empty} />
            const st = dayState(day)
            return (
              <button
                key={day}
                type="button"
                disabled={isDisabled(day)}
                aria-pressed={st.selected}
                data-selected={st.selected || undefined}
                data-in-range={st.inRange || undefined}
                data-range-start={st.rangeStart || undefined}
                data-range-end={st.rangeEnd || undefined}
                data-today={
                  sameDay(today, new Date(view.year, view.month, day)) || undefined
                }
                className={styles.day}
                onClick={() => selectDay(day)}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  },
)
