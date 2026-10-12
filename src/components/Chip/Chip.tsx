'use client'

import {
  forwardRef,
  useCallback,
  useContext,
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
import { ChipSetContext } from './ChipSetContext'
import styles from './Chip.module.css'

export type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion'

/** The event that triggered a removal: the remove-button click or Backspace / Delete. */
export type ChipRemoveEvent = MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement>

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onChange'> {
  /** Visual variant. @default 'assist' */
  variant?: ChipVariant
  /**
   * Whether the chip uses elevated styling (no outline, shadow). MD3 defines
   * elevated assist / filter / suggestion chips only. @default false
   */
  elevated?: boolean
  /** Chip label text. Truncated with an ellipsis when the chip is narrower than it. */
  label: string
  /** Leading icon (18dp). */
  icon?: ReactNode
  /**
   * Leading avatar (input chips only) — rendered 24dp and clipped to a circle,
   * e.g. an `<img>`. Takes precedence over `icon`.
   */
  avatar?: ReactNode
  /**
   * Controlled selected state. Filter chips are always selectable; input chips
   * become selectable when `selected`, `defaultSelected` or `onChange` is given.
   */
  selected?: boolean
  /** Uncontrolled initial selected state (filter / input chips). @default false */
  defaultSelected?: boolean
  /** Fires with the triggering event and the next selected state (filter / input chips). */
  onChange?: (event: MouseEvent<HTMLButtonElement>, selected: boolean) => void
  /** Whether a trailing remove button is shown (input / filter removable). */
  removable?: boolean
  /**
   * Fires when the chip asks to be removed: a click on the remove button, or
   * Backspace / Delete while the chip has focus. When the parent then unmounts
   * the chip, focus moves to the next chip (or the previous one).
   */
  onRemove?: (event: ChipRemoveEvent) => void
  /**
   * Accessible name of the remove button, from the chip label.
   * @default (label) => `Remove ${label}`
   */
  getRemoveLabel?: (label: string) => string
  /** Whether to show a leading checkmark when selected (filter chip). @default true */
  showSelectedIcon?: boolean
  /** Apply the MD3 dragged appearance (state layer + elevation) — for drag-and-drop. */
  dragged?: boolean
}

const defaultGetRemoveLabel = (label: string) => `Remove ${label}`

/**
 * Material Design 3 Chip.
 *
 * Supports assist, filter, input, and suggestion variants.
 * Uses a native `<button>` for the primary action. Filter chips toggle
 * selection (`aria-pressed`); input chips opt into the same selection API by
 * passing `selected` / `defaultSelected` / `onChange`. Removable chips have a
 * trailing remove button.
 *
 * Structure mirrors material-web: each action has its own Ripple/FocusRing.
 * Primary Ripple is scoped to the action button. The trailing remove button
 * has its own circular 24dp Ripple/FocusRing.
 *
 * Keyboard: Arrow keys move focus between primary and trailing actions
 * (matching material-web's multi-action chip pattern); at the boundary they
 * propagate to an enclosing `ChipSet`. Trailing action is not in the Tab
 * order; only reachable via arrow keys. Backspace / Delete on a removable
 * chip calls `onRemove`.
 *
 * The forwarded `ref` points at the ROOT `<span>` (MUI parity); extra props
 * (`{...rest}`) still land on the primary action `<button>`.
 */
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  function Chip(
    {
      variant = 'assist',
      elevated = false,
      label,
      icon,
      avatar,
      selected: controlledSelected,
      defaultSelected,
      onChange,
      removable = false,
      onRemove,
      getRemoveLabel = defaultGetRemoveLabel,
      showSelectedIcon = true,
      disabled = false,
      dragged = false,
      className,
      onClick,
      ...rest
    },
    forwardedRef,
  ) {
    // Input chips opt into selection so existing (v1.0) input chips do not
    // start toggling on click.
    const isSelectable =
      variant === 'filter' ||
      (variant === 'input' &&
        (controlledSelected !== undefined ||
          defaultSelected !== undefined ||
          onChange !== undefined))
    const isControlled = controlledSelected !== undefined
    const [uncontrolledSelected, setUncontrolledSelected] = useState(defaultSelected ?? false)
    const selected = isSelectable && (isControlled ? controlledSelected : uncontrolledSelected)

    const hasAvatar = variant === 'input' && avatar != null
    const hasIcon = !hasAvatar && icon != null
    // Filter chips without their own icon keep an animated checkmark slot that
    // collapses to 0 width while unselected (Compose AnimatingChipContent).
    const hasCheckSlot = variant === 'filter' && showSelectedIcon && !hasIcon
    const showCheck = variant === 'filter' && selected && showSelectedIcon
    const hasTrailingAction = removable && (variant === 'input' || variant === 'filter')

    const rootRef = useRef<HTMLSpanElement | null>(null)
    const primaryRef = useRef<HTMLButtonElement>(null)
    const trailingRef = useRef<HTMLButtonElement>(null)
    const chipSetRef = useContext(ChipSetContext)

    const setRootRef = useCallback(
      (node: HTMLSpanElement | null) => {
        rootRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        if (isSelectable) {
          const next = !selected
          if (!isControlled) setUncontrolledSelected(next)
          onChange?.(event, next)
        }
        onClick?.(event)
      },
      [isSelectable, isControlled, selected, onChange, onClick],
    )

    /**
     * Calls `onRemove`, then — if the parent unmounted this chip while it held
     * focus — moves focus to the next chip in the set (or the previous one)
     * instead of letting it fall to `<body>`.
     */
    const remove = useCallback(
      (event: ChipRemoveEvent) => {
        const root = rootRef.current
        const scope = chipSetRef?.current ?? root?.parentElement
        let target: HTMLButtonElement | undefined
        if (root && scope) {
          const chips = Array.from(scope.querySelectorAll<HTMLElement>(`.${styles.chip}`))
          const index = chips.indexOf(root)
          const candidates = [...chips.slice(index + 1), ...chips.slice(0, index).reverse()]
          target = candidates
            .map((chip) => chip.querySelector<HTMLButtonElement>(`.${styles.action}`))
            .find((button): button is HTMLButtonElement => !!button && !button.disabled)
        }
        onRemove?.(event)
        if (!root || !target) return
        const focusTarget = target
        setTimeout(() => {
          if (root.isConnected || !focusTarget.isConnected) return
          const active = document.activeElement
          if (active && active !== document.body) return
          focusTarget.focus()
        })
      },
      [onRemove, chipSetRef],
    )

    const handleRemoveClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        remove(event)
      },
      [remove],
    )

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLSpanElement>) => {
        if (!hasTrailingAction || disabled) return

        // m3 keyboard table: Backspace / Delete removes the focused chip.
        if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault()
          remove(event)
          return
        }

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
      [hasTrailingAction, disabled, remove],
    )

    // When trailing action receives focus, temporarily remove primary from
    // tab order so Shift+Tab moves to the previous focusable element. The
    // previous tabIndex is restored (a ChipSet may have made it -1).
    const handleTrailingFocus = useCallback(() => {
      const primary = primaryRef.current
      if (!primary) return
      const previous = primary.tabIndex
      primary.tabIndex = -1
      const restore = () => { primary.tabIndex = previous }
      trailingRef.current?.addEventListener('focusout', restore, { once: true })
    }, [])

    return (
      <span
        ref={setRootRef}
        className={clsx(
          styles.chip,
          styles[variant],
          elevated && styles.elevated,
          selected && styles.selected,
          disabled && styles.disabled,
          dragged && styles.dragged,
          (hasIcon || hasCheckSlot) && styles.hasLeadingIcon,
          hasAvatar && styles.hasAvatar,
          hasTrailingAction && styles.hasTrailingAction,
          className,
        )}
        onKeyDown={hasTrailingAction ? handleKeyDown : undefined}
      >
        <span className={styles.outline} aria-hidden="true" />
        <button
          ref={primaryRef}
          {...rest}
          type="button"
          className={styles.action}
          disabled={disabled}
          aria-pressed={isSelectable ? selected : undefined}
          onClick={handleClick}
        >
          {hasAvatar && (
            <span className={styles.avatar} aria-hidden="true">
              {avatar}
            </span>
          )}
          {hasIcon && (
            <span className={styles.leadingIcon} aria-hidden="true">
              {showCheck ? <CheckIcon /> : icon}
            </span>
          )}
          {hasCheckSlot && (
            <span
              className={clsx(styles.leadingIcon, styles.checkSlot)}
              data-visible={showCheck || undefined}
              aria-hidden="true"
            >
              <CheckIcon />
            </span>
          )}
          <span className={styles.label}>{label}</span>
          {(!disabled || dragged) && <Ripple disabled={disabled} dragged={dragged} />}
          {!disabled && <FocusRing />}
        </button>
        {hasTrailingAction && (
          <button
            ref={trailingRef}
            type="button"
            className={styles.trailingAction}
            disabled={disabled}
            tabIndex={-1}
            aria-label={getRemoveLabel(label)}
            onClick={handleRemoveClick}
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
