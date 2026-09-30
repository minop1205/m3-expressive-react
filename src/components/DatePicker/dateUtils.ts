/**
 * Calendar math shared by DatePicker and DatePickerField. All dates are local
 * calendar days (time of day zeroed), matching how the pickers emit values.
 */

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return (
    a != null &&
    b != null &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** First day of the week for `locale` as a JS weekday (0 = Sunday). */
export function getFirstDayOfWeek(locale: string): number {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    // `getWeekInfo()` is the current spec; `weekInfo` is the older accessor
    // some engines still ship. ISO numbering: 1 = Monday … 7 = Sunday.
    const info = loc.getWeekInfo?.() ?? loc.weekInfo
    if (info && info.firstDay >= 1 && info.firstDay <= 7) return info.firstDay % 7
  } catch {
    // Invalid locale tag or no Intl.Locale — fall through.
  }
  return 0
}

export interface MonthCell {
  date: Date
  /** The cell belongs to the previous / next month (grid padding). */
  outside: boolean
}

/** Rows of a month grid — always 6 weeks × 7 days (Compose `MaxCalendarRows`). */
export const CALENDAR_ROWS = 6

/**
 * The 6×7 cells of a month view, starting on `firstDayOfWeek`, including the
 * padding days of the neighbouring months (flagged `outside`).
 */
export function getMonthGrid(year: number, month: number, firstDayOfWeek: number): MonthCell[][] {
  const lead = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7
  const rows: MonthCell[][] = []
  for (let r = 0; r < CALENDAR_ROWS; r++) {
    const row: MonthCell[] = []
    for (let c = 0; c < 7; c++) {
      const date = new Date(year, month, 1 - lead + r * 7 + c)
      row.push({ date, outside: date.getMonth() !== month })
    }
    rows.push(row)
  }
  return rows
}
