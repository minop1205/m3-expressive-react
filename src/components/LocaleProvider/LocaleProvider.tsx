'use client'

import { useContext, useMemo, type ReactNode } from 'react'
import {
  DEFAULT_LOCALE,
  LocaleContext,
  localeUsesAmPm,
  type LocaleContextValue,
  type LocaleLabels,
} from '../../internal/locale'

export type { LocaleLabels } from '../../internal/locale'

export interface LocaleProviderProps {
  /**
   * BCP 47 locale — the default `locale` of DatePicker, DatePickerField and
   * TimePicker (month / weekday names, first day of the week, typed-date
   * order, the TimePicker's hour cycle). Inherited from an outer provider.
   * @default 'en-US' (no provider)
   */
  locale?: string
  /**
   * 12-hour clock with AM / PM (`true`) or 24-hour clock (`false`) — the
   * default `ampm` of every TimePicker inside. Without it the hour cycle of
   * the effective `locale` decides (m3: the 24-hour setting is made outside
   * the time picker, typically in system settings).
   */
  ampm?: boolean
  /**
   * Built-in strings per component, e.g.
   * `{ Snackbar: { dismissLabel: '閉じる' }, Badge: { getLabel: … } }`. Keys
   * are the component's label props; a nested provider overrides single
   * keys of a component and inherits the rest.
   */
  labels?: LocaleLabels
  children?: ReactNode
}

/**
 * Supplies the locale, hour cycle and built-in strings (Phase B B50) to every
 * component inside — so an app translates the library once instead of
 * passing `*Label` props to every instance.
 *
 * Precedence: a component's own prop > the nearest provider > an outer
 * provider > the English default. Without a provider every component keeps
 * its English strings and `'en-US'`; the browser language is never read, so
 * server and client render the same output. Renders no element.
 */
export function LocaleProvider({ locale, ampm, labels, children }: LocaleProviderProps) {
  const parent = useContext(LocaleContext)
  const value = useMemo<LocaleContextValue>(() => {
    const merged: Record<string, object | undefined> = { ...parent?.labels }
    for (const [component, entries] of Object.entries(labels ?? {})) {
      merged[component] = { ...merged[component], ...entries }
    }
    return {
      locale: locale ?? parent?.locale,
      ampm: ampm ?? parent?.ampm,
      labels: merged as LocaleLabels,
    }
  }, [parent, locale, ampm, labels])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/** Resolved values of the nearest `LocaleProvider` (or the defaults). */
export interface UseLocaleResult {
  /** Effective locale (`'en-US'` without a provider). */
  locale: string
  /** Whether TimePickers default to the 12-hour clock: `ampm`, else the locale's hour cycle. */
  ampm: boolean
  /** The merged `labels` (`{}` without a provider). */
  labels: LocaleLabels
}

/**
 * The locale settings in effect — e.g. to format the app's own dates with
 * the same locale (`new Intl.DateTimeFormat(useLocale().locale)`).
 */
export function useLocale(): UseLocaleResult {
  const ctx = useContext(LocaleContext)
  const locale = ctx?.locale ?? DEFAULT_LOCALE
  const explicitAmPm = ctx?.ampm
  const ampm = useMemo(() => explicitAmPm ?? localeUsesAmPm(locale), [explicitAmPm, locale])
  return { locale, ampm, labels: ctx?.labels ?? {} }
}
