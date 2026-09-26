import {
  forwardRef,
  useCallback,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './Switch.module.css'

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'onChange' | 'children'> {
  /** Controlled selected (on) state. */
  selected?: boolean
  /** Uncontrolled initial selected state. @default false */
  defaultSelected?: boolean
  /** Fires with the next selected state and the native event on toggle. */
  onChange?: (selected: boolean, event: ChangeEvent<HTMLInputElement>) => void
  /** Icon shown when selected. */
  selectedIcon?: ReactNode
  /** Icon shown when unselected. */
  unselectedIcon?: ReactNode
  /** Show icons on both states. @default false */
  icons?: boolean
}

/**
 * Material Design 3 Switch.
 *
 * Uses a native `<input type="checkbox" role="switch">` for proper form
 * integration and accessibility. The visual track, handle, and icons are
 * rendered via CSS on sibling spans. Structure mirrors material-web.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(
    {
      selected,
      defaultSelected = false,
      onChange,
      selectedIcon,
      unselectedIcon,
      icons = false,
      disabled = false,
      className,
      onKeyDown,
      ...rest
    },
    forwardedRef,
  ) {
    const isControlled = selected !== undefined
    const [internalSelected, setInternalSelected] = useState(defaultSelected)
    const isSelected = isControlled ? selected : internalSelected

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const next = !isSelected
        if (!isControlled) setInternalSelected(next)
        onChange?.(next, event)
      },
      [isSelected, isControlled, onChange],
    )

    // Switches toggle on Enter in addition to Space (docs/specs/switch.md
    // Behavior — m3 a11y / APG switch pattern; the native checkbox lacks
    // Enter, so add it manually like material-web does).
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(event)
        if (event.key === 'Enter' && !event.defaultPrevented && !event.repeat) {
          event.currentTarget.click()
        }
      },
      [onKeyDown],
    )

    const showIcons = icons || selectedIcon != null
    // The handle is 24dp whenever an icon is showing (spec anatomy: Compose
    // `hasContent || checked`): when selected with any icon, or whenever
    // `icons` renders the unselected icon too (including the built-in ones).
    const withIcon = showIcons && (isSelected || icons)

    return (
      <span
        className={clsx(
          styles.switch,
          isSelected ? styles.selected : styles.unselected,
          disabled && styles.disabled,
          className,
        )}
      >
        <input
          ref={forwardedRef}
          {...rest}
          type="checkbox"
          role="switch"
          className={styles.input}
          checked={isSelected}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.handleContainer}>
            <span className={styles.stateLayer} />
            <span className={clsx(styles.handle, withIcon && styles.withIcon)}>
              {showIcons && (
                <span className={styles.icons}>
                  <span className={clsx(styles.icon, styles.iconOn)}>
                    {selectedIcon ?? <CheckIcon />}
                  </span>
                  {icons && (
                    <span className={clsx(styles.icon, styles.iconOff)}>
                      {unselectedIcon ?? <CloseIcon />}
                    </span>
                  )}
                </span>
              )}
            </span>
          </span>
        </span>
        <span className={styles.focusRing} aria-hidden="true" />
      </span>
    )
  },
)

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.55 18.2 3.65 12.3 5.275 10.675 9.55 14.95 18.725 5.775 20.35 7.4Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.4 19.2 4.8 17.6 10.4 12 4.8 6.4 6.4 4.8 12 10.4 17.6 4.8 19.2 6.4 13.6 12 19.2 17.6 17.6 19.2 12 13.6Z" />
    </svg>
  )
}
