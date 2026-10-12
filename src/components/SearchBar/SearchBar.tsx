'use client'

import {
  forwardRef,
  useEffect,
  useId,
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
import { ArrowBackIcon, SearchIcon } from '../../internal/icons'
import { Ripple } from '../../primitives/Ripple/Ripple'
import {
  hideFromTopLayer,
  showInTopLayer,
  usePopupPosition,
} from '../../internal/usePopupPosition'
import { useControllableState } from '../../internal/useControllableState'
import { useIsoLayoutEffect } from '../../internal/useIsoLayoutEffect'
import { useModal } from '../../internal/useModal'
import { IconButton } from '../IconButton/IconButton'
import styles from './SearchBar.module.css'

/** Where the search view opens (m3: "two layout options: full-screen and docked"). */
export type SearchBarLayout = 'docked' | 'fullscreen'

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
   * custom icon should carry `aria-hidden` itself. Pass `false` for no
   * leading icon at all (the text then starts 24dp in — e.g. in a search
   * app bar whose navigation icon sits outside the field).
   */
  startIcon?: ReactNode
  /** Trailing icon / control (48dp slot, e.g. a mic or clear `IconButton`). */
  endIcon?: ReactNode
  /** Suggestion / result content shown in the open search view. */
  children?: ReactNode
  /**
   * How the search view (`children`) opens:
   * - `'docked'` — a results container pinned 2dp under the bar, over a
   *   scrim (Compose `ExpandedDockedSearchBarWithGap`; larger screens).
   * - `'fullscreen'` — a modal view covering the viewport: the field moves
   *   to the top with a back button in place of the leading icon and the
   *   results below it (Compose `ExpandedFullScreenContainedSearchBar`, the
   *   Expressive contained style; compact screens). Focus is trapped inside
   *   it; Escape or the back button closes it and focus returns to the bar.
   * @default 'docked'
   */
  layout?: SearchBarLayout
  /**
   * Accessible name of the full-screen view's back button. Localize it
   * with the rest of your UI strings. @default 'Back'
   */
  backLabel?: string
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
  /**
   * Text announced (polite live region) when the search view opens — the
   * equivalent of Compose's "Suggestions below" state description.
   * Localize it with the rest of your UI strings. @default 'Suggestions below'
   */
  suggestionsLabel?: string
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

/** Gap between the bar and the docked search view (Compose DockedSearchBarGap). */
const VIEW_GAP_PX = 2

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
 * scrim click. The view is drawn in the top layer (Popover API), pinned under
 * the bar at the bar's width, so ancestors' `overflow` / `z-index` can't clip
 * it; like Compose's docked view it never flips above the bar.
 *
 * With a view, the input is an APG-style `role="combobox"` (`aria-expanded`,
 * `aria-controls`, `aria-autocomplete="list"`) and the view's opening is
 * announced via `suggestionsLabel`. Keyboard: ArrowDown opens the view /
 * moves into the results, ArrowUp / ArrowDown / Home / End move between the
 * focusable result items (ArrowUp from the first returns to the input),
 * Escape closes the view from anywhere in it and returns focus to the input
 * (typing, or pressing the focused input, reopens it), and moving focus out of the component closes it. While the view is open,
 * Escape only closes it (the native `type="search"` clear is suppressed);
 * with the view closed — or without a view — Escape keeps the browser's
 * native behavior (Chromium / Safari clear the query). Enter calls
 * `onSearch`, except while an IME composition is in progress.
 * A consumer `onKeyDown` that calls `preventDefault()` opts out of the
 * built-in key handling for that event.
 *
 * `layout="fullscreen"` (Compose `ExpandedFullScreenContainedSearchBar`, the
 * Expressive contained style) instead opens a modal view over the whole
 * viewport (`role="dialog"`, drawn in the top layer): a SurfaceContainerLow
 * surface fades in while the field moves from the bar to the top (4dp from
 * the top, 8dp from the sides) with a back button in place of the leading
 * icon, and the results fill the space 8dp below it — no divider. Expand and
 * collapse run on the FastSpatial spring (reduced motion: a fade). Focus is
 * trapped in the view (`useModal`); Escape or the back button collapses it
 * and focus returns to the bar. The bar opens it on a click, typing or
 * ArrowDown — focus alone (Tab) doesn't (a modal shouldn't open on Tab).
 * `onChange` / `onSearch` / `onKeyDown` follow the view's field;
 * `onFocus` / `onBlur` / `inputRef` stay on the bar's input.
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
      layout = 'docked',
      backLabel = 'Back',
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      inputRef,
      inputProps,
      suggestionsLabel = 'Suggestions below',
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
    const [current, setInternal, isControlled] = useControllableState({
      value,
      defaultValue: defaultValue ?? '',
      name: 'SearchBar',
      state: 'value',
    })

    const hasView = children != null
    const [storedOpen, setUncontrolledOpen, openControlled] = useControllableState({
      value: controlledOpen,
      defaultValue: defaultOpen,
      name: 'SearchBar',
      state: 'open',
    })
    // A disabled bar never shows its view (its input can't take focus or
    // keys to close it again).
    const open = hasView && !disabled && storedOpen
    const fullscreen = layout === 'fullscreen'
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputElRef = useRef<HTMLInputElement | null>(null)
    const viewRef = useRef<HTMLDivElement>(null)
    const barRef = useRef<HTMLDivElement>(null)
    // Full-screen view: overlay root (top layer), dialog surface, its own
    // input (the header field) and results container.
    const overlayRef = useRef<HTMLDivElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    const fsInputRef = useRef<HTMLInputElement>(null)
    const fsResultsRef = useRef<HTMLDivElement>(null)
    // Set when the full-screen view closes, until focus is back on the bar.
    const restoringRef = useRef(false)
    // After the first full-screen expansion the bar hides while the view
    // collapses back onto it (Compose AppBarWithSearch `isVisible`).
    const [expandedOnce, setExpandedOnce] = useState(false)
    if (fullscreen && open && !expandedOnce) setExpandedOnce(true)
    // Focus modality: the bar's focus ring is keyboard-only, but text inputs
    // match :focus-visible on pointer focus too — so track pointer presses.
    const pointerDownRef = useRef(false)
    const [focusVisible, setFocusVisible] = useState(false)
    // Set while focus is returned to the input programmatically (Escape from
    // the results) so that focus doesn't immediately reopen the view.
    const suppressOpenRef = useRef(false)
    const baseId = useId()
    const viewId = `${baseId}-view`
    const dialogId = `${baseId}-dialog`
    const fsResultsId = `${baseId}-results`

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
    // Layout effect: the full-screen overlay must be reachable before
    // useModal (a passive effect) moves focus into it.
    useIsoLayoutEffect(() => {
      const view = fullscreen ? overlayRef.current : viewRef.current
      if (!view) return
      if (open) view.removeAttribute('inert')
      else view.setAttribute('inert', '')
    }, [open, hasView, fullscreen])

    // Full-screen view: start / end the expand motion at the bar's rect,
    // and draw the overlay in the top layer (ancestors' transform /
    // overflow / z-index — e.g. a hiding app bar — can't trap or clip it).
    const fsOpen = fullscreen && open
    useIsoLayoutEffect(() => {
      const overlay = overlayRef.current
      if (!overlay) return
      const rect = barRef.current?.getBoundingClientRect()
      if (rect) {
        overlay.style.setProperty('--_collapsed-top', `${rect.top}px`)
        overlay.style.setProperty('--_collapsed-left', `${rect.left}px`)
        overlay.style.setProperty('--_collapsed-width', `${rect.width}px`)
      }
      if (fsOpen) showInTopLayer(overlay)
      else {
        hideFromTopLayer(overlay)
        restoringRef.current = true
      }
    }, [fsOpen])

    useIsoLayoutEffect(() => {
      const overlay = overlayRef.current
      return () => {
        if (overlay) hideFromTopLayer(overlay)
      }
    }, [fullscreen, hasView])

    useModal({
      active: fsOpen,
      rootRef: overlayRef,
      surfaceRef: dialogRef,
      onEscape: () => setOpen(false),
    })

    // Runs after useModal's cleanup has returned focus: when nothing outside
    // took it (opened via `defaultOpen`, or the trigger is gone), put it back
    // on the bar input. Then let the bar's focus open the view again.
    useEffect(() => {
      if (!restoringRef.current) return
      if (fullscreen && !open) {
        const active = document.activeElement
        const lost =
          !active || active === document.body || overlayRef.current?.contains(active)
        if (lost && wrapperRef.current?.isConnected) inputElRef.current?.focus()
      }
      restoringRef.current = false
    }, [open, fullscreen])

    useEffect(() => {
      if (!open || fullscreen) return
      // `pointerdown`, like Tooltip: a page that prevents the default of
      // pointerdown (drag libraries) suppresses the compatibility mousedown.
      const onDown = (e: globalThis.PointerEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('pointerdown', onDown)
      return () => document.removeEventListener('pointerdown', onDown)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, fullscreen])

    // Docked view placement via the shared popup helper (B4): top layer, pinned
    // 2dp under the bar at its width, following scroll / resize / layout
    // shifts. No flip or clamp — Compose's ExpandedDockedSearchBar popup is
    // anchored to the bar with clipping disabled, and its height is already
    // capped (2/3 of the viewport) in CSS. The scrim stays in the page, under
    // the in-flow bar: in the top layer it would cover the bar itself.
    usePopupPosition({
      open: open && !fullscreen,
      anchorRef: barRef,
      popupRef: viewRef,
      side: 'bottom',
      align: 'start',
      gap: VIEW_GAP_PX,
      avoidCollisions: false,
      matchAnchorWidth: true,
    })

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternal(event.target.value)
      onChange?.(event, event.target.value)
      // APG combobox: typing reopens a view that Escape closed.
      if (hasView && !open) setOpen(true)
    }

    /** Focusable, enabled elements inside the view, in DOM order. */
    const getItems = () =>
      Array.from(
        (fullscreen ? fsResultsRef : viewRef).current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]',
        ) ?? [],
      ).filter(
        (el) =>
          el.tabIndex >= 0 &&
          !(el as HTMLButtonElement).disabled &&
          el.getAttribute('aria-disabled') !== 'true',
      )

    const focusInput = () => {
      suppressOpenRef.current = true
      ;(fullscreen ? fsInputRef : inputElRef).current?.focus()
      suppressOpenRef.current = false
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      switch (event.key) {
        case 'Enter':
          // IME: the Enter that commits a composition is not a submit.
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          onSearch?.(current)
          break
        case 'Escape':
          if (open) {
            // Close only — stops the native type="search" clear (and an
            // enclosing dialog from closing on the same key).
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
          }
          break
        case 'ArrowDown':
          if (!hasView) return
          event.preventDefault()
          if (!open) setOpen(true)
          else getItems()[0]?.focus()
          break
      }
    }

    /** The full-screen view's header input (the bar stays inert under it). */
    const handleFsKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      switch (event.key) {
        case 'Enter':
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          onSearch?.(current)
          break
        case 'Escape':
          // Collapse only — no native `type="search"` clear.
          event.preventDefault()
          event.stopPropagation()
          setOpen(false)
          break
        case 'ArrowDown':
          event.preventDefault()
          getItems()[0]?.focus()
          break
      }
    }

    const handleViewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        // The full-screen view returns focus to the bar on close.
        if (!fullscreen) focusInput()
        return
      }
      const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
      if (!keys.includes(event.key)) return
      const items = getItems()
      const index = items.indexOf(event.target as HTMLElement)
      // Only rove between the items themselves (leave nested widgets alone).
      if (index === -1) return
      event.preventDefault()
      if (event.key === 'ArrowDown') items[Math.min(index + 1, items.length - 1)].focus()
      else if (event.key === 'Home') items[0].focus()
      else if (event.key === 'End') items[items.length - 1].focus()
      else if (index === 0) focusInput()
      else items[index - 1].focus()
    }

    return (
      <div
        {...rest}
        ref={setRootRefs}
        role="search"
        data-disabled={disabled || undefined}
        data-open={open || undefined}
        data-layout={fullscreen && hasView ? 'fullscreen' : undefined}
        data-expanded-once={(fullscreen && expandedOnce) || undefined}
        className={clsx(styles.wrapper, className)}
        onPointerDownCapture={(event) => {
          rest.onPointerDownCapture?.(event)
          pointerDownRef.current = true
        }}
        onPointerUpCapture={(event) => {
          rest.onPointerUpCapture?.(event)
          // After the press's focus changes have settled.
          setTimeout(() => {
            pointerDownRef.current = false
          })
        }}
        onBlur={(event) => {
          // Close when focus leaves the component (Tab-out). Pointer presses
          // inside it (non-focusable result areas, the scrim) and window
          // switches (document loses focus) don't count.
          // (The full-screen view traps focus itself.)
          if (!open || fullscreen) return
          const next = event.relatedTarget as Node | null
          if (next && wrapperRef.current?.contains(next)) return
          if (!next && (pointerDownRef.current || !document.hasFocus())) return
          setOpen(false)
        }}
      >
        {hasView && !fullscreen && (
          <div
            className={styles.scrim}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
        )}
        <div
          ref={barRef}
          className={styles.bar}
          data-has-start={startIcon !== false || undefined}
          data-has-end={endIcon != null || undefined}
          data-focus-visible={focusVisible || undefined}
          onClick={(event) => {
            // Clicking the bar outside the input / slot controls focuses the
            // input, like a text field container. With the full-screen
            // layout, a click on the field (input included) expands it.
            const input = inputElRef.current
            if (!input) return
            const target = event.target as Element
            const onField =
              target === input ||
              !target.closest('button, a[href], input, [role="button"], [tabindex]')
            if (!onField) return
            if (target !== input) input.focus()
            if (fullscreen && hasView && !open && !disabled) setOpen(true)
          }}
        >
          {startIcon !== false && (
            <span className={clsx(styles.slot, styles.leading)}>
              {startIcon ?? (
                <span className={styles.glyph} aria-hidden="true">
                  <SearchIcon />
                </span>
              )}
            </span>
          )}
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
            {...(hasView &&
              (fullscreen
                ? {
                    // Opens a modal search view (the dialog holds its own
                    // combobox for the results).
                    role: 'combobox',
                    'aria-expanded': Boolean(open),
                    'aria-controls': dialogId,
                    'aria-haspopup': 'dialog' as const,
                  }
                : {
                    role: 'combobox',
                    'aria-expanded': Boolean(open),
                    'aria-controls': viewId,
                    'aria-autocomplete': 'list' as const,
                  }))}
            onChange={handleChange}
            onPointerDown={(event) => {
              inputProps?.onPointerDown?.(event)
              // A press on the already-focused input (no focus event) reopens
              // a view that Escape closed; an unfocused one opens on focus.
              if (
                hasView &&
                !fullscreen &&
                !open &&
                !disabled &&
                event.button === 0 &&
                document.activeElement === event.currentTarget
              ) {
                setOpen(true)
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
              setFocusVisible(false)
              onBlur?.(event)
            }}
            onFocus={(event) => {
              setFocusVisible(!pointerDownRef.current)
              onFocus?.(event)
              // The full-screen view is modal: focus alone (Tab, or focus
              // returning on collapse) never opens it — a click, typing or
              // ArrowDown does (Compose: in keyboard mode focus doesn't
              // expand either; a click on the collapsed field does).
              if (hasView && !open && !suppressOpenRef.current && !fullscreen) setOpen(true)
            }}
          />
          {endIcon != null && (
            <span className={clsx(styles.slot, styles.trailing)}>{endIcon}</span>
          )}
          <Ripple disabled={disabled} className={styles.stateLayer} />
          <span aria-hidden="true" className={styles.focusRing} />
        </div>
        {hasView && fullscreen && (
          <div
            ref={overlayRef}
            className={styles.fullscreen}
            data-open={open || undefined}
          >
            <div className={styles.fsSurface} aria-hidden="true" />
            <div
              ref={dialogRef}
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-label={inputProps?.['aria-label'] ?? placeholder}
              tabIndex={-1}
              className={styles.fsDialog}
            >
              <div
                className={clsx(styles.bar, styles.fsHeader)}
                data-has-start=""
                data-has-end={endIcon != null || undefined}
                onClick={(event) => {
                  const input = fsInputRef.current
                  if (!input || event.target === input) return
                  const target = event.target as Element
                  if (target.closest('button, a[href], input, [role="button"], [tabindex]')) return
                  input.focus()
                }}
              >
                <span className={clsx(styles.slot, styles.leading)}>
                  <IconButton
                    variant="standard"
                    aria-label={backLabel}
                    icon={<ArrowBackIcon className={styles.backIcon} />}
                    onClick={() => setOpen(false)}
                  />
                </span>
                {/* No `id` / `name` from the bar's input: this field is a
                    second view of the same query, not a form control. */}
                <input
                  {...inputProps}
                  id={undefined}
                  ref={fsInputRef}
                  type="search"
                  className={styles.input}
                  value={current}
                  placeholder={placeholder}
                  {...(inputMode !== undefined && { inputMode })}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={fsResultsId}
                  aria-autocomplete="list"
                  data-autofocus=""
                  onChange={handleChange}
                  onKeyDown={handleFsKeyDown}
                />
                {endIcon != null && (
                  <span className={clsx(styles.slot, styles.trailing)}>{endIcon}</span>
                )}
              </div>
              <div
                ref={fsResultsRef}
                id={fsResultsId}
                className={styles.fsResults}
                onKeyDown={handleViewKeyDown}
              >
                {children}
              </div>
              <span role="status" className={styles.visuallyHidden}>
                {open ? suggestionsLabel : ''}
              </span>
            </div>
          </div>
        )}
        {hasView && !fullscreen && (
          <div
            ref={viewRef}
            id={viewId}
            className={styles.view}
            data-open={open || undefined}
            onKeyDown={handleViewKeyDown}
          >
            <div className={styles.results}>{children}</div>
          </div>
        )}
        {hasView && !fullscreen && (
          <span role="status" className={styles.visuallyHidden}>
            {open ? suggestionsLabel : ''}
          </span>
        )}
      </div>
    )
  },
)
