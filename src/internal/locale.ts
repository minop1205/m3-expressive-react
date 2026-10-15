'use client'

import { createContext, useContext } from 'react'
import type { AutocompleteProps } from '../components/Autocomplete/Autocomplete'
import type { CarouselProps } from '../components/Carousel/Carousel'
import type { ChipProps } from '../components/Chip/Chip'
import type { DatePickerProps } from '../components/DatePicker/DatePicker'
import type { DatePickerFieldProps } from '../components/DatePicker/DatePickerField'
import type { DialogProps } from '../components/Dialog/Dialog'
import type { NavigationRailProps } from '../components/NavigationRail/NavigationRail'
import type { PullToRefreshProps } from '../components/PullToRefresh/PullToRefresh'
import type { SearchBarProps } from '../components/SearchBar/SearchBar'
import type { SideSheetProps } from '../components/SideSheet/SideSheet'
import type { SliderProps } from '../components/Slider/Slider'
import type { SnackbarProps } from '../components/Snackbar/Snackbar'
import type { SplitButtonProps } from '../components/SplitButton/SplitButton'
import type { TextFieldProps } from '../components/TextField/TextField'
import type { TimePickerProps } from '../components/TimePicker/TimePicker'

/**
 * Prop keys each component takes from `LocaleProvider` `labels` (Phase B
 * B50): the provider's value is the prop's default, the prop still wins.
 * Keys a component resolves itself (mode-specific headlines, fallback names)
 * are left out and documented on `LocaleLabels`.
 */
const LABEL_PROP_KEYS = {
  Autocomplete: ['toggleLabel'],
  BottomSheet: [],
  Carousel: ['getItemLabel', 'roleDescriptionLabel', 'itemRoleDescriptionLabel'],
  Chip: ['getRemoveLabel'],
  DatePicker: [
    'previousMonthLabel',
    'nextMonthLabel',
    'selectYearLabel',
    'todayLabel',
    'startDateLabel',
    'endDateLabel',
    'inRangeLabel',
    'inputLabel',
    'switchToInputLabel',
    'switchToCalendarLabel',
    'getErrorLabel',
    'okLabel',
    'cancelLabel',
  ],
  DatePickerField: [
    'label',
    'openCalendarLabel',
    'dialogLabel',
    'getErrorLabel',
    'previousMonthLabel',
    'nextMonthLabel',
    'previousYearLabel',
    'nextYearLabel',
    'selectMonthLabel',
    'selectYearLabel',
    'todayLabel',
  ],
  Dialog: ['closeLabel'],
  NavigationRail: ['modalLabel'],
  PullToRefresh: ['refreshingLabel'],
  SearchBar: ['backLabel', 'suggestionsLabel', 'placeholder'],
  SideSheet: ['closeLabel', 'backLabel'],
  Slider: ['rangeStartLabel', 'rangeEndLabel'],
  Snackbar: ['dismissLabel'],
  SplitButton: ['trailingAriaLabel'],
  TextField: ['getCounterLabel'],
  TimePicker: [
    'hourLabel',
    'minuteLabel',
    'selectHourLabel',
    'selectMinuteLabel',
    'periodLabel',
    'amLabel',
    'pmLabel',
    'switchToInputLabel',
    'switchToDialLabel',
    'switchToScrollLabel',
    'getHourLabel',
    'getMinuteLabel',
    'getErrorLabel',
    'okLabel',
    'cancelLabel',
  ],
} as const satisfies Record<string, readonly string[]>

type Keys<C extends keyof typeof LABEL_PROP_KEYS> = (typeof LABEL_PROP_KEYS)[C][number]

/** Fallback accessible name, used when the component has no title / `aria-label` / `aria-labelledby`. */
interface FallbackLabel {
  /** Accessible name used when the component has no title, `aria-label` or `aria-labelledby`. */
  fallbackLabel?: string
}

/**
 * Built-in strings per component, supplied through `LocaleProvider`
 * `labels`. Each key is the component prop of the same name (same type and
 * English default) unless noted; a prop on the component still wins.
 */
export interface LocaleLabels {
  Autocomplete?: Pick<AutocompleteProps, Keys<'Autocomplete'>>
  /**
   * Badge text, also read for the badges of NavigationBar / NavigationRail
   * items and of a Tab (`label` / `badgeLabel` props still win).
   */
  Badge?: {
    /**
     * Accessible text of a badge. `count` is the text the badge shows
     * (`'8'`, `'999+'`), or `undefined` for a dot / non-counting badge.
     * @default (count) => count == null ? 'New notification' : count === '1' ? '1 new notification' : `${count} new notifications`
     */
    getLabel?: (count: string | undefined) => string
  }
  BottomSheet?: FallbackLabel & {
    /** Drag handle name when the handle closes the sheet (the default). @default 'Close' */
    dragHandleLabel?: string
    /** Drag handle name when the sheet can partially expand (`skipPartiallyExpanded={false}`). @default 'Drag handle' */
    partialDragHandleLabel?: string
  }
  Carousel?: Pick<CarouselProps, Keys<'Carousel'>>
  Chip?: Pick<ChipProps, Keys<'Chip'>>
  DatePicker?: Pick<DatePickerProps, Keys<'DatePicker'>> & {
    /** Header title of a single-date picker. @default 'Select date' */
    titleLabel?: string
    /** Header title of a range picker in calendar mode. @default 'Select dates' */
    rangeTitleLabel?: string
    /** Header title of a range picker in input mode. @default 'Enter dates' */
    rangeInputTitleLabel?: string
    /** Headline while no date is selected (calendar mode). @default 'Selected date' */
    noSelectionLabel?: string
    /** Headline while no date is entered (input mode). @default 'Entered date' */
    inputNoSelectionLabel?: string
  }
  DatePickerField?: Pick<DatePickerFieldProps, Keys<'DatePickerField'>>
  Dialog?: Pick<DialogProps, Keys<'Dialog'>> & FallbackLabel
  NavigationDrawer?: FallbackLabel
  NavigationRail?: Pick<NavigationRailProps, Keys<'NavigationRail'>>
  PullToRefresh?: Pick<PullToRefreshProps, Keys<'PullToRefresh'>>
  SearchBar?: Pick<SearchBarProps, Keys<'SearchBar'>>
  SideSheet?: Pick<SideSheetProps, Keys<'SideSheet'>> & FallbackLabel
  Slider?: Pick<SliderProps, Keys<'Slider'>>
  Snackbar?: Pick<SnackbarProps, Keys<'Snackbar'>>
  SplitButton?: Pick<SplitButtonProps, Keys<'SplitButton'>>
  TextField?: Pick<TextFieldProps, Keys<'TextField'>>
  TimePicker?: Pick<TimePickerProps, Keys<'TimePicker'>> & {
    /** Headline in dial / scroll mode. @default 'Select time' */
    titleLabel?: string
    /** Headline in input mode. @default 'Enter time' */
    inputTitleLabel?: string
  }
}

/** What `LocaleProvider` supplies (unresolved: unset fields inherit). */
export interface LocaleContextValue {
  locale?: string
  ampm?: boolean
  labels: LocaleLabels
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)

/** Default locale without a provider (Phase B B8 / B50: never `navigator.language`). */
export const DEFAULT_LOCALE = 'en-US'

/** Whether `locale` formats hours with a 12-hour cycle (B8). */
export function localeUsesAmPm(locale: string): boolean {
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

const NO_LABELS: LocaleLabels = {}

/** The nearest `LocaleProvider` value, or `null` outside one. */
export function useLocaleContext(): LocaleContextValue | null {
  return useContext(LocaleContext)
}

/** `labels[component]` of the nearest provider (`{}` without one). */
export function useLocaleLabels<C extends keyof LocaleLabels>(
  component: C,
): NonNullable<LocaleLabels[C]> {
  const ctx = useContext(LocaleContext)
  return ((ctx?.labels ?? NO_LABELS)[component] ?? {}) as NonNullable<LocaleLabels[C]>
}

/**
 * `props` with the provider's labels (and, for the pickers, `locale`) filled
 * in where the prop is `undefined` — so the components keep their
 * destructuring defaults as the English fallback. Only the listed prop keys
 * are copied, never arbitrary `labels` entries.
 */
export function useLocaleProps<C extends keyof typeof LABEL_PROP_KEYS, P extends object>(
  component: C,
  props: P,
): P {
  const ctx = useContext(LocaleContext)
  if (!ctx) return props
  const labels = (ctx.labels[component] ?? NO_LABELS) as Record<string, unknown>
  const source = props as Record<string, unknown>
  let out: Record<string, unknown> | null = null
  const fill = (key: string, value: unknown) => {
    if (value === undefined || source[key] !== undefined) return
    out ??= { ...source }
    out[key] = value
  }
  for (const key of LABEL_PROP_KEYS[component]) fill(key, labels[key])
  if (component === 'DatePicker' || component === 'DatePickerField' || component === 'TimePicker') {
    fill('locale', ctx.locale)
  }
  return (out ?? props) as P
}
