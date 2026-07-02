import {
  forwardRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './SearchBar.module.css'

export interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  /** Controlled query value. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  /** Fires with the new query. */
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void
  /** Fires when the user submits (Enter). */
  onSearch?: (value: string) => void
  /** Leading icon (defaults to a search glyph). */
  leadingIcon?: ReactNode
  /** Trailing icon / control. */
  trailingIcon?: ReactNode
}

const SearchGlyph = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14" />
  </svg>
)

/**
 * Material Design 3 Search bar (docked input field).
 *
 * 56dp SurfaceContainerHigh stadium field; OnSurface BodyLarge input,
 * OnSurfaceVariant placeholder, OnSurface leading (search) icon,
 * OnSurfaceVariant trailing icon, 16dp icon insets — per Compose SearchBarTokens
 * (runtime elevation 0).
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      defaultValue,
      onChange,
      onSearch,
      leadingIcon,
      trailingIcon,
      placeholder = 'Search',
      disabled = false,
      onKeyDown,
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState(defaultValue ?? '')
    const current = isControlled ? value : internal

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternal(event.target.value)
      onChange?.(event.target.value, event)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.key === 'Enter') onSearch?.(current)
    }

    return (
      <div
        role="search"
        data-disabled={disabled || undefined}
        className={clsx(styles.bar, className)}
      >
        <span className={styles.leading} aria-hidden="true">
          {leadingIcon ?? SearchGlyph}
        </span>
        <input
          ref={ref}
          {...rest}
          type="search"
          className={styles.input}
          value={current}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {trailingIcon != null && <span className={styles.trailing}>{trailingIcon}</span>}
      </div>
    )
  },
)
