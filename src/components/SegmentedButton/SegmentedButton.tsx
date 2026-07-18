import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { CheckIcon } from '../../internal/icons'
import styles from './SegmentedButton.module.css'

/** One segment of a {@link SegmentedButtons} group. */
export interface SegmentedButtonOption {
  /** Unique value identifying the segment within the group. */
  value: string
  /** Segment label text. */
  label?: ReactNode
  /** Leading icon; replaced by the check icon while selected (when `showSelectedCheck`). */
  icon?: ReactNode
  /** Disable this segment only. */
  disabled?: boolean
}

export interface SegmentedButtonsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The segments. */
  options: SegmentedButtonOption[]
  /** Controlled selected value (string) — or an array of values when `multiSelect`. */
  value?: string | string[]
  /** Uncontrolled initial selection. Defaults to none (`''`, or `[]` when `multiSelect`). */
  defaultValue?: string | string[]
  /** Fires with the next selection (string, or string[] when `multiSelect`). */
  onChange?: (value: string | string[]) => void
  /** Allow selecting multiple segments. @default false */
  multiSelect?: boolean
  /** Disable the whole group. */
  disabled?: boolean
  /** Show a check icon on selected segments. @default true */
  showSelectedCheck?: boolean
}


/**
 * Material Design 3 Segmented Buttons (single- or multi-select).
 *
 * A 40dp stadium row of outlined segments (Outline 1dp). Selected segments fill
 * with SecondaryContainer / OnSecondaryContainer and show an 18dp check;
 * unselected are transparent with OnSurface content — per Compose
 * OutlinedSegmentedButtonTokens. Segments are toggle buttons (aria-pressed).
 */
export const SegmentedButtons = forwardRef<HTMLDivElement, SegmentedButtonsProps>(
  function SegmentedButtons(
    {
      options,
      value,
      defaultValue,
      onChange,
      multiSelect = false,
      disabled = false,
      showSelectedCheck = true,
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined
    const [uncontrolled, setUncontrolled] = useState<string | string[]>(
      () => defaultValue ?? (multiSelect ? [] : ''),
    )
    const current = isControlled ? value : uncontrolled
    const selectedValues = Array.isArray(current) ? current : [current]
    const isSelected = (v: string) => selectedValues.includes(v)

    const emit = (next: string | string[]) => {
      if (!isControlled) setUncontrolled(next)
      onChange?.(next)
    }

    const handleClick = (v: string) => {
      if (multiSelect) {
        const set = new Set(selectedValues)
        if (set.has(v)) set.delete(v)
        else set.add(v)
        emit([...set])
      } else {
        emit(v)
      }
    }

    return (
      <div
        ref={ref}
        {...rest}
        role="group"
        className={clsx(styles.group, className)}
      >
        {options.map((option) => {
          const selected = isSelected(option.value)
          const segDisabled = disabled || option.disabled
          const showCheck = selected && showSelectedCheck
          const leading = showCheck ? <CheckIcon /> : option.icon

          return (
            <button
              key={option.value}
              type="button"
              disabled={segDisabled}
              aria-pressed={selected}
              data-selected={selected || undefined}
              className={styles.segment}
              onClick={() => handleClick(option.value)}
            >
              {leading != null && (
                <span className={styles.icon} aria-hidden="true">
                  {leading}
                </span>
              )}
              {option.label != null && (
                <span className={styles.label}>{option.label}</span>
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
