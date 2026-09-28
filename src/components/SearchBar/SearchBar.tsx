import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { SearchIcon } from '../../internal/icons'
import styles from './SearchBar.module.css'

export interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'children'> {
  /** Controlled query value. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  /** Fires with the native event and the new query. */
  onChange?: (event: ChangeEvent<HTMLInputElement>, value: string) => void
  /** Fires when the user submits (Enter). */
  onSearch?: (value: string) => void
  /** Icon at the start of the bar (defaults to a search glyph). */
  startIcon?: ReactNode
  /** Icon / control at the end of the bar. */
  endIcon?: ReactNode
  /** Suggestion / result content shown in the expanded search view. */
  children?: ReactNode
  /** Controlled expanded (search-view) state. */
  expanded?: boolean
  /** Notified when the expanded state should change. */
  onExpandedChange?: (expanded: boolean) => void
}


/**
 * Material Design 3 Search bar (docked field + search view).
 *
 * 56dp SurfaceContainerHigh stadium field; OnSurface BodyLarge input,
 * OnSurfaceVariant placeholder, OnSurface leading icon — per Compose
 * SearchBarTokens. Providing `children` (results) turns it into a docked search
 * view: a dropdown under the input (Outline divider) that opens on focus and
 * closes on Escape / outside click.
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      defaultValue,
      onChange,
      onSearch,
      startIcon,
      endIcon,
      children,
      expanded,
      onExpandedChange,
      placeholder = 'Search',
      disabled = false,
      onKeyDown,
      onFocus,
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState(defaultValue ?? '')
    const current = isControlled ? value : internal

    const hasView = children != null
    const expandControlled = expanded !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    const open = hasView && (expandControlled ? expanded : uncontrolledOpen)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const setOpen = (next: boolean) => {
      if (!expandControlled) setUncontrolledOpen(next)
      onExpandedChange?.(next)
    }

    useEffect(() => {
      if (!open) return
      const onDown = (e: globalThis.MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', onDown)
      return () => document.removeEventListener('mousedown', onDown)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternal(event.target.value)
      onChange?.(event, event.target.value)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.key === 'Enter') onSearch?.(current)
      if (event.key === 'Escape' && open) setOpen(false)
    }

    return (
      <div
        ref={wrapperRef}
        role="search"
        data-disabled={disabled || undefined}
        className={clsx(styles.wrapper, className)}
      >
        <div className={styles.bar}>
          <span className={styles.leading} aria-hidden="true">
            {startIcon ?? <SearchIcon />}
          </span>
          <input
            ref={ref}
            {...rest}
            type="search"
            className={styles.input}
            value={current}
            placeholder={placeholder}
            disabled={disabled}
            aria-expanded={hasView ? Boolean(open) : undefined}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={(event) => {
              onFocus?.(event)
              if (hasView) setOpen(true)
            }}
          />
          {endIcon != null && <span className={styles.trailing}>{endIcon}</span>}
        </div>
        {hasView && (
          <div className={styles.view} data-open={open || undefined}>
            <div className={styles.divider} />
            <div className={styles.results}>{children}</div>
          </div>
        )}
      </div>
    )
  },
)
