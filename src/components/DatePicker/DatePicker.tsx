import {
  forwardRef,
  useState,
  type HTMLAttributes,
} from 'react'
import clsx from 'clsx'
import styles from './DatePicker.module.css'

export interface DatePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled selected date. */
  value?: Date | null
  /** Uncontrolled initial selected date. */
  defaultValue?: Date | null
  /** Fires with the newly selected date. */
  onChange?: (date: Date) => void
  /** Earliest selectable date (inclusive). */
  min?: Date
  /** Latest selectable date (inclusive). */
  max?: Date
  /** BCP-47 locale for month / weekday names. @default 'en-US' */
  locale?: string
}

const PrevIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
)
const NextIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
)

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

/**
 * Material Design 3 Date picker (modal calendar).
 *
 * SurfaceContainerHigh panel, 28dp corners, 360dp wide, elevation 3. Day cells
 * are 40dp round; the selected day fills Primary / OnPrimary, today shows a 1dp
 * Primary outline, other days OnSurface — per Compose DatePickerModalTokens.
 * Wrap in a `Dialog` for a full modal experience.
 */
export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  function DatePicker(
    { value, defaultValue, onChange, min, max, locale = 'en-US', className, ...rest },
    ref,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<Date | null>(defaultValue ?? null)
    const selected = isControlled ? value ?? null : internal

    const initialView = selected ?? new Date()
    const [view, setView] = useState({
      year: initialView.getFullYear(),
      month: initialView.getMonth(),
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

    const headline = selected
      ? new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(selected)
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

    const selectDay = (day: number) => {
      const date = new Date(view.year, view.month, day)
      if (!isControlled) setInternal(date)
      onChange?.(date)
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
          <span className={styles.supporting}>Select date</span>
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
              {PrevIcon}
            </button>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              {NextIcon}
            </button>
          </div>
        </div>

        <div className={styles.grid} aria-label={monthLabel}>
          {weekdays.map((w, i) => (
            <span key={`wd-${i}`} className={styles.weekday} aria-hidden="true">
              {w}
            </span>
          ))}
          {cells.map((day, i) =>
            day == null ? (
              <span key={`e-${i}`} className={styles.empty} />
            ) : (
              <button
                key={day}
                type="button"
                disabled={isDisabled(day)}
                aria-pressed={sameDay(selected, new Date(view.year, view.month, day))}
                data-selected={
                  sameDay(selected, new Date(view.year, view.month, day)) || undefined
                }
                data-today={
                  sameDay(today, new Date(view.year, view.month, day)) || undefined
                }
                className={styles.day}
                onClick={() => selectDay(day)}
              >
                {day}
              </button>
            ),
          )}
        </div>
      </div>
    )
  },
)
