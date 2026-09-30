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
import { Ripple } from '../../primitives/Ripple/Ripple'
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
  /**
   * Leading content (defaults to a decorative search glyph). Rendered in a
   * 48dp slot, so it may be a navigation `IconButton` (back / menu) — it
   * stays in the tab order and the accessibility tree. A purely decorative
   * custom icon should carry `aria-hidden` itself.
   */
  startIcon?: ReactNode
  /** Trailing icon / control (48dp slot, e.g. a mic or clear `IconButton`). */
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
 * 56dp SurfaceContainerHigh stadium field (360–720dp wide); OnSurface
 * BodyLarge input with a Primary caret, OnSurfaceVariant placeholder, 48dp
 * leading / trailing slots — per Compose SearchBarTokens and m3.material.io.
 * Hover / pressed state layer and a keyboard-only focus ring on the bar.
 * Providing `children` (results) turns it into a docked search view in the
 * Expressive "contained" style: a 12dp results container 2dp under the bar
 * over a scrim, opening on focus and closing on Escape / outside click /
 * scrim click.
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
    const inputElRef = useRef<HTMLInputElement | null>(null)
    const viewRef = useRef<HTMLDivElement>(null)
    // Focus modality: the bar's focus ring is keyboard-only, but text inputs
    // match :focus-visible on pointer focus too — so track pointer presses.
    const pointerDownRef = useRef(false)
    const [focusVisible, setFocusVisible] = useState(false)

    const setInputRefs = (el: HTMLInputElement | null) => {
      inputElRef.current = el
      if (typeof inputRef === 'function') inputRef(el)
      else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = el
    }

    const setRootRefs = (el: HTMLDivElement | null) => {
      wrapperRef.current = el
      if (typeof forwardedRef === 'function') forwardedRef(el)
      else if (forwardedRef) forwardedRef.current = el
    }

    const setOpen = (next: boolean) => {
      if (!openControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    }

    // The closed view stays mounted (for the collapse motion) but must not be
    // reachable. Set `inert` on the DOM so it works across React 18 / 19.
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      if (open) view.removeAttribute('inert')
      else view.setAttribute('inert', '')
    }, [open, hasView])

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
        data-open={open || undefined}
        className={clsx(styles.wrapper, className)}
        onPointerDownCapture={() => {
          pointerDownRef.current = true
        }}
        onPointerUpCapture={() => {
          // After the press's focus changes have settled.
          setTimeout(() => {
            pointerDownRef.current = false
          })
        }}
      >
        {hasView && (
          <div
            className={styles.scrim}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
        )}
        <div
          className={styles.bar}
          data-has-end={endIcon != null || undefined}
          data-focus-visible={focusVisible || undefined}
          onClick={(event) => {
            // Clicking the bar outside the input / slot controls focuses the
            // input, like a text field container.
            const input = inputElRef.current
            if (!input || event.target === input) return
            const target = event.target as Element
            if (target.closest('button, a[href], input, [role="button"], [tabindex]')) return
            input.focus()
          }}
        >
          <span className={clsx(styles.slot, styles.leading)}>
            {startIcon ?? (
              <span className={styles.glyph} aria-hidden="true">
                <SearchIcon />
              </span>
            )}
          </span>
          {/* `inputProps` (the escape hatch) is spread FIRST; the component's
              own wiring wins. Optional dedicated props are spread only when
              defined so they don't clobber an `inputProps` key the component
              isn't actually setting. */}
          <input
            {...inputProps}
            ref={setInputRefs}
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
            onBlur={(event) => {
              setFocusVisible(false)
              onBlur?.(event)
            }}
            onFocus={(event) => {
              setFocusVisible(!pointerDownRef.current)
              onFocus?.(event)
              if (hasView) setOpen(true)
            }}
          />
          {endIcon != null && (
            <span className={clsx(styles.slot, styles.trailing)}>{endIcon}</span>
          )}
          <Ripple disabled={disabled} className={styles.stateLayer} />
          <span aria-hidden="true" className={styles.focusRing} />
        </div>
        {hasView && (
          // TODO(#317): move onto the shared popup positioning helper
          // (src/internal/usePopupPosition, B4) once it lands.
          <div ref={viewRef} className={styles.view} data-open={open || undefined}>
            <div className={styles.results}>{children}</div>
          </div>
        )}
      </div>
    )
  },
)
