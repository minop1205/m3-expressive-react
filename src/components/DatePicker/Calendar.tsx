import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { IconButton } from '../IconButton'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import {
  ArrowDropDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../internal/icons'
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
  previousYear: string
  nextYear: string
  selectYear: string
  selectMonth: string
  today: string
  startDate: string
  endDate: string
  inRange: string
}

export type CalendarLayout = 'modal' | 'docked'

export interface CalendarProps {
  /**
   * `modal`: month-year menu button + month arrows, year grid.
   * `docked`: month and year menu buttons each with arrows, list menus,
   * neighbouring-month days shown at 38%.
   */
  layout?: CalendarLayout
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

/** Compose `DatePickerDefaults.YearRange` when no min / max narrows it. */
const DEFAULT_FIRST_YEAR = 1900
const DEFAULT_LAST_YEAR = 2100

/** Date `d` moved by `months`, clamping the day to the target month's length. */
function addMonths(d: Date, months: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const day = Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth()))
  return new Date(target.getFullYear(), target.getMonth(), day)
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

interface MenuButtonProps {
  expanded: boolean
  controls: string
  onClick: () => void
  children: ReactNode
}

/** Month / year menu button: a round text button whose drop-down arrow turns 180° while open. */
const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(function MenuButton(
  { expanded, controls, onClick, children },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={styles.menuButton}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      data-expanded={expanded || undefined}
      onClick={onClick}
    >
      <span className={styles.menuButtonLabel}>{children}</span>
      <ArrowDropDownIcon className={styles.menuButtonIcon} />
      <Ripple />
      <FocusRing />
    </button>
  )
})

interface SelectionOption {
  key: number
  label: string
  selected: boolean
  current?: boolean
  disabled: boolean
}

interface SelectionListProps {
  id: string
  label: string
  variant: 'years' | 'list'
  options: SelectionOption[]
  onPick: (key: number) => void
}

/**
 * Year grid (modal) / month or year list (docked): an APG listbox with a
 * roving tabindex. Focus moves to the selected option on mount (Compose
 * focuses the displayed year when the year picker opens).
 */
function SelectionList({ id, label, variant, options, onPick }: SelectionListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.selected),
  )
  const [active, setActive] = useState(selectedIndex)
  // 'open' on mount (center the selection), 'key' after arrow navigation.
  const pendingFocus = useRef<'open' | 'key' | null>('open')
  const columns = variant === 'years' ? 3 : 1

  useLayoutEffect(() => {
    const reason = pendingFocus.current
    if (!reason) return
    pendingFocus.current = null
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    if (!list || !el) return
    if (reason === 'open') {
      list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2
    }
    el.focus({ preventScroll: reason === 'open' })
  })

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = listRef.current ? getComputedStyle(listRef.current).direction === 'rtl' : false
    const dir = rtl ? -1 : 1
    let next: number
    switch (event.key) {
      case 'ArrowLeft':
        next = columns > 1 ? index - dir : index
        break
      case 'ArrowRight':
        next = columns > 1 ? index + dir : index
        break
      case 'ArrowUp':
        next = index - columns
        break
      case 'ArrowDown':
        next = index + columns
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = options.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    setActive(Math.min(options.length - 1, Math.max(0, next)))
    pendingFocus.current = 'key'
  }

  return (
    <div
      ref={listRef}
      id={id}
      role="listbox"
      aria-label={label}
      className={variant === 'years' ? styles.yearGrid : styles.menuList}
    >
      {options.map((o, i) => (
        <button
          key={o.key}
          type="button"
          role="option"
          aria-selected={o.selected}
          aria-disabled={o.disabled || undefined}
          tabIndex={i === active ? 0 : -1}
          data-index={i}
          data-selected={o.selected || undefined}
          data-current={o.current || undefined}
          data-disabled={o.disabled || undefined}
          className={variant === 'years' ? styles.year : styles.menuItem}
          onFocus={() => setActive(i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onClick={() => {
            if (!o.disabled) onPick(o.key)
          }}
        >
          {variant === 'list' && (
            <span className={styles.menuItemCheck} aria-hidden="true">
              {o.selected && <CheckIcon />}
            </span>
          )}
          <span className={styles.selectionLabel}>{o.label}</span>
          <Ripple disabled={o.disabled} className={styles.selectionRipple} />
          <FocusRing className={styles.selectionFocusRing} />
        </button>
      ))}
    </div>
  )
}

/**
 * The month view shared by the modal `DatePicker` and the docked
 * `DatePickerField`: navigation header, weekday header and a 6×7 day grid,
 * swapped for the year (and, docked, month) selection menus.
 *
 * Grid semantics follow the APG date picker dialog and m3 accessibility:
 * `role="grid"` named by the month, `columnheader`s with the full weekday
 * name, and day `gridcell`s (native buttons) named with the full date plus
 * Compose's range/today prefixes, `aria-selected` on the selection and
 * `aria-current="date"` on today. The grid is a single Tab stop with a roving
 * tabindex (selected → today → 1st); arrows move by day / week, PageUp/Down by
 * month, Shift+PageUp/Down by year, Home/End to the first/last day of the
 * month (m3 key table), and Enter/Space select.
 *
 * Navigation is bounded by min/max (else Compose's 1900–2100 year range):
 * arrows, years and months that cannot show a selectable day are disabled,
 * and keyboard focus is clamped into that range.
 */
export function Calendar({
  layout = 'modal',
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
  const gridRef = useRef<HTMLDivElement>(null)
  const monthMenuRef = useRef<HTMLButtonElement>(null)
  const yearMenuRef = useRef<HTMLButtonElement>(null)
  const [focusedDate, setFocusedDate] = useState<Date | null>(null)
  const [menu, setMenu] = useState<'year' | 'month' | null>(null)
  // Set by keyboard navigation: focus the roving cell after the next render.
  const pendingFocus = useRef(autoFocus)
  const menuIdBase = useId()
  const docked = layout === 'docked'

  const today = startOfDay(new Date())
  const minDay = min ? startOfDay(min) : null
  const maxDay = max ? startOfDay(max) : null
  const firstYear = Math.min(minDay?.getFullYear() ?? DEFAULT_FIRST_YEAR, view.year)
  const lastYear = Math.max(maxDay?.getFullYear() ?? DEFAULT_LAST_YEAR, view.year)
  const lower = minDay ?? new Date(firstYear, 0, 1)
  const upper = maxDay ?? new Date(lastYear, 11, 31)
  const inView = (d: Date | null | undefined): boolean =>
    d != null && d.getFullYear() === view.year && d.getMonth() === view.month
  // A month is reachable when any of its days lies within [lower, upper].
  const monthReachable = (year: number, month: number) =>
    new Date(year, month + 1, 0) >= lower && new Date(year, month, 1) <= upper

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(view.year, view.month, 1))
  const yearFormat = new Intl.NumberFormat(locale, { useGrouping: false })

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
    if (!pendingFocus.current || menu) return
    pendingFocus.current = false
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-date="${dateKey(tabbable)}"]`)
      ?.focus()
  })

  const goTo = (year: number, month: number) => {
    const d = new Date(year, month, 1)
    onViewChange({ year: d.getFullYear(), month: d.getMonth() })
  }

  // Keyboard focus stays within the selectable range: [min, max], else
  // Compose's fixed 1900–2100 year range (not widened by the view, so paging
  // can't walk past it). A start date already outside is not pulled back.
  const keyboardLower = minDay ?? new Date(DEFAULT_FIRST_YEAR, 0, 1)
  const keyboardUpper = maxDay ?? new Date(DEFAULT_LAST_YEAR, 11, 31)
  const clampFocus = (next: Date, from: Date) => {
    const low = from < keyboardLower ? from : keyboardLower
    const high = from > keyboardUpper ? from : keyboardUpper
    return next < low ? low : next > high ? high : next
  }

  const moveFocus = (target: Date, from: Date) => {
    const next = clampFocus(target, from)
    if (!inView(next)) goTo(next.getFullYear(), next.getMonth())
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
    moveFocus(next, date)
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

  // Picking a year keeps the month when reachable, else clamps into range.
  const pickYear = (year: number) => {
    let month = view.month
    if (!monthReachable(year, month)) {
      month = new Date(year, month + 1, 0) < lower ? lower.getMonth() : upper.getMonth()
    }
    goTo(year, month)
    setMenu(null)
    ;(docked ? yearMenuRef : monthMenuRef).current?.focus()
  }

  const pickMonth = (month: number) => {
    goTo(view.year, month)
    setMenu(null)
    monthMenuRef.current?.focus()
  }

  const toggleMenu = (which: 'year' | 'month') => setMenu((m) => (m === which ? null : which))

  const arrow = (delta: number, unit: 'month' | 'year', label: string) => {
    const target = new Date(view.year, view.month + (unit === 'year' ? delta * 12 : delta), 1)
    return (
      <IconButton
        variant="standard"
        icon={delta < 0 ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        aria-label={label}
        disabled={!monthReachable(target.getFullYear(), target.getMonth())}
        onClick={() => goTo(target.getFullYear(), target.getMonth())}
      />
    )
  }

  const yearOptions: SelectionOption[] = Array.from(
    { length: menu === 'year' ? lastYear - firstYear + 1 : 0 },
    (_, i) => {
      const year = firstYear + i
      return {
        key: year,
        label: yearFormat.format(year),
        selected: year === view.year,
        current: year === today.getFullYear(),
        disabled: year < lower.getFullYear() || year > upper.getFullYear(),
      }
    },
  )

  const monthOptions: SelectionOption[] = Array.from(
    { length: menu === 'month' ? 12 : 0 },
    (_, month) => ({
      key: month,
      label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(
        new Date(2000, month, 1),
      ),
      selected: month === view.month,
      disabled: !monthReachable(view.year, month),
    }),
  )

  return (
    <>
      {docked ? (
        <div className={styles.nav} data-layout="docked">
          {menu !== 'year' && (
            <div className={styles.navGroup}>
              {!menu && arrow(-1, 'month', labels.previousMonth)}
              <MenuButton
                ref={monthMenuRef}
                expanded={menu === 'month'}
                controls={`${menuIdBase}-month`}
                onClick={() => toggleMenu('month')}
              >
                {new Intl.DateTimeFormat(locale, { month: 'short' }).format(
                  new Date(view.year, view.month, 1),
                )}
              </MenuButton>
              {!menu && arrow(1, 'month', labels.nextMonth)}
            </div>
          )}
          {menu !== 'month' && (
            <div className={styles.navGroup}>
              {!menu && arrow(-1, 'year', labels.previousYear)}
              <MenuButton
                ref={yearMenuRef}
                expanded={menu === 'year'}
                controls={`${menuIdBase}-year`}
                onClick={() => toggleMenu('year')}
              >
                {yearFormat.format(view.year)}
              </MenuButton>
              {!menu && arrow(1, 'year', labels.nextYear)}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.nav}>
          <MenuButton
            ref={monthMenuRef}
            expanded={menu === 'year'}
            controls={`${menuIdBase}-year`}
            onClick={() => toggleMenu('year')}
          >
            {monthLabel}
          </MenuButton>
          {/* Compose hides the arrows while the year picker is shown. */}
          {!menu && (
            <div className={styles.navButtons}>
              {arrow(-1, 'month', labels.previousMonth)}
              {arrow(1, 'month', labels.nextMonth)}
            </div>
          )}
        </div>
      )}
      {/* Announce the displayed month as it changes (Compose marks the
          month/year button text as a polite live region). */}
      <span className={styles.visuallyHidden} aria-live="polite">
        {monthLabel}
      </span>

      {menu === 'year' && (
        <SelectionList
          id={`${menuIdBase}-year`}
          label={labels.selectYear}
          variant={docked ? 'list' : 'years'}
          options={yearOptions}
          onPick={pickYear}
        />
      )}
      {menu === 'month' && (
        <SelectionList
          id={`${menuIdBase}-month`}
          label={labels.selectMonth}
          variant="list"
          options={monthOptions}
          onPick={pickMonth}
        />
      )}

      {!menu && (
        <div
          ref={gridRef}
          role="grid"
          aria-label={monthLabel}
          className={styles.grid}
          data-layout={layout}
        >
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
                  // Docked shows neighbouring days at 38% (m3 "outside
                  // month" label text); they are not part of this grid.
                  return (
                    <span key={dateKey(date)} role="gridcell" className={styles.empty}>
                      {docked && <span aria-hidden="true">{date.getDate()}</span>}
                    </span>
                  )
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
                    // Initial focus target for a modal picker (useModal).
                    data-autofocus={sameDay(tabbable, date) || undefined}
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
      )}
    </>
  )
}
