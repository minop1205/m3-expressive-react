import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { CheckIcon, CloseIcon } from '../../internal/icons'
import styles from './Chip.module.css'

export type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion'

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Visual variant. @default 'assist' */
  variant?: ChipVariant
  /** Whether the chip uses elevated styling (no outline, shadow). @default false */
  elevated?: boolean
  /** Chip label text. */
  label: string
  /** Leading icon. */
  icon?: ReactNode
  /** Controlled selected state (filter / input chips). */
  selected?: boolean
  /** Uncontrolled initial selected state. @default false */
  defaultSelected?: boolean
  /** Fires when selection state changes (filter chip). */
  onSelectionChange?: (selected: boolean) => void
  /** Whether a trailing remove button is shown (input / filter removable). */
  removable?: boolean
  /** Fires when the remove button is clicked. */
  onRemove?: () => void
  /** Whether to show a leading checkmark when selected (filter chip). @default true */
  showSelectedIcon?: boolean
  /** Apply the MD3 dragged appearance (state layer + elevation) — for drag-and-drop. */
  dragged?: boolean
}

/**
 * Material Design 3 Chip.
 *
 * Supports assist, filter, input, and suggestion variants.
 * Uses a native `<button>` for the primary action. Filter chips toggle
 * selection. Input chips support a trailing remove button.
 *
 * Structure mirrors material-web: each action has its own Ripple/FocusRing.
 * Primary Ripple is scoped to the action button. The trailing remove button
 * has its own circular 24dp Ripple/FocusRing.
 *
 * Keyboard: Arrow keys move focus between primary and trailing actions
 * (matching material-web's multi-action chip pattern). Trailing action is
 * not in the Tab order; only reachable via arrow keys.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  function Chip(
    {
      variant = 'assist',
      elevated = false,
      label,
      icon,
      selected: controlledSelected,
      defaultSelected = false,
      onSelectionChange,
      removable = false,
      onRemove,
      showSelectedIcon = true,
      disabled = false,
      dragged = false,
      className,
      onClick,
      ...rest
    },
    forwardedRef,
  ) {
    const isSelectable = variant === 'filter'
    const isControlled = controlledSelected !== undefined
    const [uncontrolledSelected, setUncontrolledSelected] = useState(defaultSelected)
    const selected = isSelectable && (isControlled ? controlledSelected : uncontrolledSelected)
    const hasLeadingIcon = icon != null || (isSelectable && selected && showSelectedIcon)
    const hasTrailingAction = removable && (variant === 'input' || variant === 'filter')

    const primaryRef = useRef<HTMLButtonElement>(null)
    const trailingRef = useRef<HTMLButtonElement>(null)

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        if (isSelectable) {
          const next = !selected
          if (!isControlled) setUncontrolledSelected(next)
          onSelectionChange?.(next)
        }
        onClick?.(event)
      },
      [isSelectable, isControlled, selected, onSelectionChange, onClick],
    )

    const handleRemove = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onRemove?.()
      },
      [onRemove],
    )

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLSpanElement>) => {
        if (!hasTrailingAction) return

        const isLeft = event.key === 'ArrowLeft'
        const isRight = event.key === 'ArrowRight'
        if (!isLeft && !isRight) return

        const primary = primaryRef.current
        const trailing = trailingRef.current
        if (!primary || !trailing) return

        const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
        const forwards = isRtl ? isLeft : isRight

        const isPrimaryFocused = primary.matches(':focus-within') || primary === document.activeElement
        const isTrailingFocused = trailing.matches(':focus-within') || trailing === document.activeElement

        // At boundary — let event propagate (e.g. to chip set)
        if ((forwards && isTrailingFocused) || (!forwards && isPrimaryFocused)) {
          return
        }

        event.preventDefault()
        event.stopPropagation()

        if (forwards) {
          trailing.focus()
        } else {
          primary.focus()
        }
      },
      [hasTrailingAction],
    )

    // When trailing action receives focus, temporarily remove primary from
    // tab order so Shift+Tab moves to the previous focusable element.
    const handleTrailingFocus = useCallback(() => {
      const primary = primaryRef.current
      if (!primary) return
      primary.tabIndex = -1
      const restore = () => { primary.tabIndex = 0 }
      trailingRef.current?.addEventListener('focusout', restore, { once: true })
    }, [])

    // Merge forwarded ref with internal ref
    const setRefs = useCallback(
      (el: HTMLButtonElement | null) => {
        (primaryRef as React.MutableRefObject<HTMLButtonElement | null>).current = el
        if (typeof forwardedRef === 'function') {
          forwardedRef(el)
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = el
        }
      },
      [forwardedRef],
    )

    return (
      <span
        className={clsx(
          styles.chip,
          styles[variant],
          elevated && styles.elevated,
          selected && styles.selected,
          disabled && styles.disabled,
          dragged && styles.dragged,
          hasLeadingIcon && styles.hasLeadingIcon,
          hasTrailingAction && styles.hasTrailingAction,
          className,
        )}
        onKeyDown={hasTrailingAction ? handleKeyDown : undefined}
      >
        <span className={styles.outline} aria-hidden="true" />
        <button
          ref={setRefs}
          {...rest}
          type="button"
          className={styles.action}
          disabled={disabled}
          aria-pressed={isSelectable ? selected : undefined}
          onClick={handleClick}
        >
          {hasLeadingIcon && (
            <span className={styles.leadingIcon} aria-hidden="true">
              {isSelectable && selected && showSelectedIcon ? <CheckIcon /> : icon}
            </span>
          )}
          <span className={styles.label}>{label}</span>
          {!disabled && <Ripple />}
          {!disabled && <FocusRing />}
        </button>
        {hasTrailingAction && (
          <button
            ref={trailingRef}
            type="button"
            className={styles.trailingAction}
            disabled={disabled}
            tabIndex={-1}
            aria-label={`Remove ${label}`}
            onClick={handleRemove}
            onFocus={handleTrailingFocus}
          >
            <span className={styles.trailingIcon} aria-hidden="true">
              <CloseIcon />
            </span>
            {!disabled && <Ripple />}
            {!disabled && <FocusRing />}
          </button>
        )}
      </span>
    )
  },
)

