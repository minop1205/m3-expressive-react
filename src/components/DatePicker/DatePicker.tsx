import { forwardRef, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import clsx from 'clsx'
import { Calendar, type CalendarView } from './Calendar'
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
  /** BCP-47 locale for month / weekday names and the week's first day. @default 'en-US' */
  locale?: string
  /** Header title. @default 'Select date' ('Select dates' in range mode) */
  titleLabel?: string
  /** Headline shown while no date is selected (single mode). @default 'Selected date' */
  noSelectionLabel?: string
  /** Accessible label of the previous-month button. @default 'Previous month' */
  previousMonthLabel?: string
  /** Accessible label of the next-month button. @default 'Next month' */
  nextMonthLabel?: string
  /** Prefix announced on today's cell. @default 'Today' */
  todayLabel?: string
  /** Range start: announced on the start cell and the headline placeholder. @default 'Start date' */
  startDateLabel?: string
  /** Range end: announced on the end cell and the headline placeholder. @default 'End date' */
  endDateLabel?: string
  /** Prefix announced on days inside the range. @default 'In range' */
  inRangeLabel?: string
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
 * SecondaryContainer — per Compose DatePickerModalTokens. The day grid is an
 * APG grid (single Tab stop, arrow / Page / Home / End keys). Wrap in a
 * `Dialog` for a full modal experience, or use `DatePickerField` for the
 * docked variant.
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
      titleLabel = range ? 'Select dates' : 'Select date',
      noSelectionLabel = 'Selected date',
      previousMonthLabel = 'Previous month',
      nextMonthLabel = 'Next month',
      todayLabel = 'Today',
      startDateLabel = 'Start date',
      endDateLabel = 'End date',
      inRangeLabel = 'In range',
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

    const fmt = (d: Date) =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(d)
    const headline = range
      ? `${rStart ? fmt(rStart) : startDateLabel} – ${rEnd ? fmt(rEnd) : endDateLabel}`
      : single
        ? fmt(single)
        : noSelectionLabel

    const commit = (next: Date | DateRange) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    }

    const selectDay = (date: Date) => {
      if (!range) {
        commit(date)
        return
      }
      // Range: first pick sets start; second sets end (or restarts) —
      // Compose updateDateSelection.
      if (!rStart || rEnd || date < rStart) {
        commit([date, null])
      } else {
        commit([rStart, date])
      }
    }

    return (
      <div ref={ref} {...rest} className={clsx(styles.picker, className)}>
        <div className={styles.header} data-range={range || undefined}>
          <span className={styles.supporting}>{titleLabel}</span>
          {/* Compose announces selection changes politely ("Current selection"). */}
          <span className={styles.headline} aria-live="polite">
            {headline}
          </span>
        </div>

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
            today: todayLabel,
            startDate: startDateLabel,
            endDate: endDateLabel,
            inRange: inRangeLabel,
          }}
        />
      </div>
    )
  },
)
