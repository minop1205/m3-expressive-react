import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEventHandler,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type ReactNode,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { SearchIcon } from '../../internal/icons'
import styles from './SearchBar.module.css'

export interface SearchBarProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'defaultValue' | 'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown'
  > {
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
  /** Suggestion / result content shown in the open search view. */
  children?: ReactNode
  /** Controlled open (search-view) state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the open state should change. */
  onOpenChange?: (open: boolean) => void
  /** Ref to the native `<input>` element (the forwarded `ref` points at the root). */
  inputRef?: Ref<HTMLInputElement>
  /**
   * Extra attributes spread on the native `<input>` — the escape hatch for
   * attributes without a dedicated prop (e.g. a distinct `aria-label` for
   * the searchbox, `maxLength`, `pattern`, extra `aria-*`, …).
   * Precedence: the component's own wiring always wins over conflicting
   * `inputProps` keys — the controlled `value` / `onChange` and internal
   * `onFocus` / `onKeyDown` handling, `type="search"`, `className`, and
   * every dedicated input prop the component sets (`placeholder`, `name`,
   * `disabled`, …).
   */
  inputProps?: InputHTMLAttributes<HTMLInputElement>
  /** Native input `placeholder`. @default 'Search' */
  placeholder?: string
  /** Native input `name`. */
  name?: string
  /** Disables the input and applies disabled styling. @default false */
  disabled?: boolean
  /** Focus handler for the native input. */
  onFocus?: FocusEventHandler<HTMLInputElement>
  /** Blur handler for the native input. */
  onBlur?: FocusEventHandler<HTMLInputElement>
  /** Key handler for the native input. */
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
}


/**
 * Material Design 3 Search bar (docked field + search view).
 *
 * 56dp SurfaceContainerHigh stadium field; OnSurface BodyLarge input,
 * OnSurfaceVariant placeholder, OnSurface leading icon — per Compose
 * SearchBarTokens. Providing `children` (results) turns it into a docked search
 * view: a dropdown under the input (Outline divider) that opens on focus and
 * closes on Escape / outside click.
 *
 * MUI parity: the forwarded `ref` and any extra props (`{...rest}`) land on
 * the ROOT element (the `role="search"` landmark); input concerns are
 * dedicated props (`placeholder`, `name`, `onFocus`, `onKeyDown`, …),
 * `inputRef` reaches the native `<input>`, and `inputProps` spreads extra
 * attributes on it (the component's own wiring wins).
 */
export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      defaultValue,
      onChange,
      onSearch,
      startIcon,
      endIcon,
      children,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      inputRef,
      inputProps,
      placeholder = 'Search',
      name,
      disabled = false,
      autoFocus,
      inputMode,
      onKeyDown,
      onFocus,
      onBlur,
      className,
      ...rest
    },
    forwardedRef,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState(defaultValue ?? '')
    const current = isControlled ? value : internal

    const hasView = children != null
    const openControlled = controlledOpen !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const open = hasView && (openControlled ? controlledOpen : uncontrolledOpen)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const setRootRefs = (el: HTMLDivElement | null) => {
      wrapperRef.current = el
      if (typeof forwardedRef === 'function') forwardedRef(el)
      else if (forwardedRef) forwardedRef.current = el
    }

    const setOpen = (next: boolean) => {
      if (!openControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
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
        {...rest}
        ref={setRootRefs}
        role="search"
        data-disabled={disabled || undefined}
        className={clsx(styles.wrapper, className)}
      >
        <div className={styles.bar}>
          <span className={styles.leading} aria-hidden="true">
            {startIcon ?? <SearchIcon />}
          </span>
          {/* `inputProps` (the escape hatch) is spread FIRST; the component's
              own wiring wins. Optional dedicated props are spread only when
              defined so they don't clobber an `inputProps` key the component
              isn't actually setting. */}
          <input
            {...inputProps}
            ref={inputRef}
            type="search"
            className={styles.input}
            value={current}
            placeholder={placeholder}
            {...(name !== undefined && { name })}
            disabled={disabled}
            {...(autoFocus !== undefined && { autoFocus })}
            {...(inputMode !== undefined && { inputMode })}
            {...(hasView && { 'aria-expanded': Boolean(open) })}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            {...(onBlur !== undefined && { onBlur })}
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
