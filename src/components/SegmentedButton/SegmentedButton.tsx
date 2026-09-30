import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { CheckIcon } from '../../internal/icons'
import styles from './SegmentedButton.module.css'

/** One segment of a {@link SegmentedButton} group. */
export interface SegmentedButtonOption {
  /** Unique value identifying the segment within the group. */
  value: string
  /** Segment label text. */
  label?: ReactNode
  /**
   * Segment icon. With a `label` it is the leading icon and crossfades to the
   * check while selected (when `showSelectedCheck`). Without a `label` the
   * segment is icon-only: the icon stays visible and the check appears beside
   * it — give such segments an `ariaLabel`.
   */
  icon?: ReactNode
  /**
   * Accessible name of the segment (rendered as `aria-label`). Required for
   * icon-only segments — describe the option, e.g. `'Inexpensive'`.
   */
  ariaLabel?: string
  /** Disable this segment only. */
  disabled?: boolean
}

export interface SegmentedButtonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The segments. */
  options: SegmentedButtonOption[]
  /** Controlled selected value (string) — or an array of values when `multiSelect`. */
  value?: string | string[]
  /** Uncontrolled initial selection. Defaults to none (`''`, or `[]` when `multiSelect`). */
  defaultValue?: string | string[]
  /**
   * Fires with the triggering event and the next selection (string, or
   * string[] when `multiSelect`). Keyboard activation (Space / Enter) arrives
   * as the native button `click`.
   */
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string | string[]) => void
  /**
   * Allow selecting multiple segments. Single-select renders a `radiogroup`
   * of radios; multi-select renders a `group` of toggle buttons (`aria-pressed`).
   * @default false
   */
  multiSelect?: boolean
  /** Disable the whole group. */
  disabled?: boolean
  /** Show a check icon on selected segments. @default true */
  showSelectedCheck?: boolean
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown']
const PREV_KEYS = ['ArrowLeft', 'ArrowUp']

/**
 * Material Design 3 Segmented Buttons (single- or multi-select).
 *
 * A 40dp stadium row of equal-width outlined segments (Outline 1dp). Selected
 * segments fill with SecondaryContainer / OnSecondaryContainer and show an
 * 18dp check in an always-reserved icon slot, so selecting never resizes the
 * row; unselected are transparent with OnSurface content — per Compose
 * OutlinedSegmentedButtonTokens / SegmentedButtonContent.
 *
 * Single-select is a `radiogroup` (one Tab stop, arrow keys move focus,
 * Space / Enter select); multi-select is a `group` of `aria-pressed` toggle
 * buttons (each a Tab stop; arrow keys also move focus). Name the group with
 * `aria-label` / `aria-labelledby`.
 *
 * In Material 3 Expressive the segmented button is no longer recommended:
 * m3.material.io says connected button groups replace it. Prefer
 * `<ButtonGroup variant="connected" selectionMode="single" | "multiple">` with
 * `Button` / `IconButton` children that carry a `value`. SegmentedButton stays
 * available (Compose still ships it) and is not deprecated.
 */
export const SegmentedButton = forwardRef<HTMLDivElement, SegmentedButtonProps>(
  function SegmentedButton(
    {
      options,
      value,
      defaultValue,
      onChange,
      multiSelect = false,
      disabled = false,
      showSelectedCheck = true,
      className,
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined
    const [uncontrolled, setUncontrolled] = useState<string | string[]>(
      () => defaultValue ?? (multiSelect ? [] : ''),
    )
    // Roving tab stop (single-select): the last focused segment. Until the
    // user focuses one, the first enabled segment is the stop regardless of
    // the selection (m3 accessibility: "the first segment will be focused
    // regardless of selection state").
    const [focusedValue, setFocusedValue] = useState<string | null>(null)

    const current = isControlled ? value : uncontrolled
    const selectedValues = Array.isArray(current) ? current : [current]
    const isSelected = (v: string) => selectedValues.includes(v)
    const isOptionDisabled = (option: SegmentedButtonOption) =>
      disabled || !!option.disabled

    const enabledOptions = options.filter((o) => !isOptionDisabled(o))
    const tabStopValue =
      enabledOptions.find((o) => o.value === focusedValue)?.value ??
      enabledOptions[0]?.value

    const emit = (event: MouseEvent<HTMLButtonElement>, next: string | string[]) => {
      if (!isControlled) setUncontrolled(next)
      onChange?.(event, next)
    }

    const handleClick = (event: MouseEvent<HTMLButtonElement>, v: string) => {
      if (multiSelect) {
        const set = new Set(selectedValues)
        if (set.has(v)) set.delete(v)
        else set.add(v)
        emit(event, [...set])
      } else {
        emit(event, v)
      }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const { key } = event
      const isNext = NEXT_KEYS.includes(key)
      const isPrev = PREV_KEYS.includes(key)
      if (!isNext && !isPrev && key !== 'Home' && key !== 'End') return

      const segments = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>(
          ':scope > button:not(:disabled)',
        ),
      )
      const index = segments.findIndex((s) => s === document.activeElement)
      if (index === -1) return

      let nextIndex: number
      if (key === 'Home') nextIndex = 0
      else if (key === 'End') nextIndex = segments.length - 1
      else {
        // Left / Right follow the visual order, so they swap in RTL.
        const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
        const horizontal = key === 'ArrowLeft' || key === 'ArrowRight'
        const forwards = horizontal && isRtl ? isPrev : isNext
        nextIndex = (index + (forwards ? 1 : -1) + segments.length) % segments.length
      }
      event.preventDefault()
      segments[nextIndex].focus()
    }

    return (
      <div
        ref={ref}
        {...rest}
        role={multiSelect ? 'group' : 'radiogroup'}
        onKeyDown={handleKeyDown}
        className={clsx(styles.group, className)}
      >
        {options.map((option) => {
          const selected = isSelected(option.value)
          const segDisabled = isOptionDisabled(option)
          const hasLabel = option.label != null
          const hasIcon = option.icon != null
          // With icon + label the slot always holds the icon (crossfading to
          // the check); otherwise it only holds the check while selected.
          const slotFilled = hasLabel && hasIcon
          const showCheck = selected && showSelectedCheck

          return (
            <button
              key={option.value}
              type="button"
              disabled={segDisabled}
              aria-label={option.ariaLabel}
              {...(multiSelect
                ? { 'aria-pressed': selected }
                : {
                    role: 'radio',
                    'aria-checked': selected,
                    tabIndex: option.value === tabStopValue ? 0 : -1,
                  })}
              data-selected={selected || undefined}
              data-check={showCheck || undefined}
              data-slot-filled={slotFilled || undefined}
              className={styles.segment}
              onClick={(event) => handleClick(event, option.value)}
              onFocus={() => setFocusedValue(option.value)}
            >
              <span className={styles.slot} aria-hidden="true">
                {slotFilled && <span className={styles.slotIcon}>{option.icon}</span>}
                {showSelectedCheck && (
                  <span className={styles.check}>
                    <CheckIcon />
                  </span>
                )}
              </span>
              {hasLabel ? (
                <span className={styles.label}>{option.label}</span>
              ) : (
                hasIcon && (
                  <span className={clsx(styles.label, styles.labelIcon)} aria-hidden="true">
                    {option.icon}
                  </span>
                )
              )}
              {!segDisabled && <Ripple />}
              {!segDisabled && <FocusRing />}
            </button>
          )
        })}
      </div>
    )
  },
)

/** @deprecated Use SegmentedButton — removed in the next release. */
export const SegmentedButtons = SegmentedButton

/** @deprecated Use SegmentedButtonProps — removed in the next release. */
export type SegmentedButtonsProps = SegmentedButtonProps
