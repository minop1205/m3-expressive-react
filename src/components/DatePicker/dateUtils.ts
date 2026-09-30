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

/** Why a typed date was rejected. */
export type DateInputError = 'invalid' | 'outOfRange' | 'invalidRange'

type DatePart = 'year' | 'month' | 'day'

const numericOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}

const sampleDate = () => new Date(2000, 10, 22)

/** Field order of the locale's numeric date (e.g. month/day/year for en-US). */
function getPartOrder(locale: string): DatePart[] {
  return new Intl.DateTimeFormat(locale, numericOptions)
    .formatToParts(sampleDate())
    .map((p) => p.type)
    .filter((t): t is DatePart => t === 'year' || t === 'month' || t === 'day')
}

/** Numeric date text in the locale's order, e.g. `07/04/2024` (en-US). */
export function formatDateInput(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, numericOptions).format(date)
}

/**
 * The locale's input pattern for helper text / placeholders, e.g.
 * `MM/DD/YYYY` (en-US), `DD/MM/YYYY` (en-GB), `DD.MM.YYYY` (de).
 */
export function getDatePattern(locale: string): string {
  const letters: Record<string, string> = { year: 'YYYY', month: 'MM', day: 'DD' }
  return new Intl.DateTimeFormat(locale, numericOptions)
    .formatToParts(sampleDate())
    .map((p) => letters[p.type] ?? (p.type === 'literal' ? p.value : ''))
    .join('')
    .trim()
}

/**
 * Parses typed date text in the locale's field order (m3 accessibility: no
 * input mask; dashes, spaces, slashes and dots are all accepted as
 * separators, leading zeros are optional). A leading 4-digit group is read as
 * ISO year-month-day in any locale. Returns `null` when the text is not a
 * real calendar date with a 4-digit year.
 */
export function parseDateInput(text: string, locale: string): Date | null {
  const trimmed = text.trim()
  // Digits and separators only (a trailing dot covers e.g. ko "2024. 7. 4.").
  if (!/^\d+([\s./-]+\d+){2}[\s./-]*$/.test(trimmed)) return null
  const groups = trimmed.match(/\d+/g) ?? []
  const order: DatePart[] =
    groups[0]?.length === 4 ? ['year', 'month', 'day'] : getPartOrder(locale)
  const parts: Record<DatePart, string> = { year: '', month: '', day: '' }
  order.forEach((part, i) => {
    parts[part] = groups[i] ?? ''
  })
  if (parts.year.length !== 4 || parts.month.length > 2 || parts.day.length > 2) return null
  const year = Number(parts.year)
  const month = Number(parts.month) - 1
  const day = Number(parts.day)
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null
  return new Date(year, month, day)
}

/** Whether `date` lies within the optional inclusive `[min, max]` bounds. */
export function isWithin(date: Date, min: Date | null | undefined, max: Date | null | undefined) {
  return (!min || date >= startOfDay(min)) && (!max || date <= startOfDay(max))
}
