import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { cubicBezier } from '../../internal/cubicBezier'
import { useScrollObserver, type ScrollTarget } from '../../internal/useScrollObserver'
import { holdsKeyboardFocus, releaseFocus } from '../../internal/barFocus'
import styles from './AppBar.module.css'

export type { ScrollTarget }

/**
 * Top app bar size.
 *
 * - `small` — single 64dp row.
 * - `medium` — Expressive **medium flexible** bar: 112dp (136dp with a
 *   subtitle), HeadlineMedium title in a second row.
 * - `large` — Expressive **large flexible** bar: 120dp (152dp with a subtitle),
 *   DisplaySmall title in a second row.
 * - `search` — Expressive **search app bar**: a 64dp row whose search field
 *   (the `searchBar` slot) replaces the heading text, with the navigation
 *   icon and actions outside the field.
 * - `center` — **deprecated** alias of `variant="small" titleAlignment="center"`
 *   (m3: center-aligned is merged into small as a centered-text configuration).
 *   Removed in v2.
 */
export type TopAppBarVariant = 'small' | 'medium' | 'large' | 'search' | 'center'

/** Horizontal alignment of the title (and subtitle). */
export type TopAppBarTitleAlignment = 'start' | 'center'

/**
 * Built-in scroll behaviors (Compose `TopAppBarDefaults.*ScrollBehavior`):
 * - `pinned` — always visible; a small bar switches to the scrolled container
 *   color once content scrolls under it.
 * - `enterAlways` — hides as the content scrolls forward and reappears as soon
 *   as it scrolls back; a half-hidden bar settles when scrolling stops.
 * - `exitUntilCollapsed` — a medium / large bar collapses to its 64dp row as
 *   the content scrolls and expands again near the top (the container color
 *   follows the collapse). On a small / search bar it behaves like `pinned`.
 */
export type TopAppBarScrollBehavior = 'pinned' | 'enterAlways' | 'exitUntilCollapsed'

export interface TopAppBarProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'hidden'> {
  /**
   * The bar title (rendered as the page heading). On `variant="search"` the
   * search field replaces the visible heading: a given `title` is rendered as
   * a visually hidden `<h1>` (the page heading for assistive technology).
   */
  title?: ReactNode
  /**
   * Supporting text under the title (on-surface-variant; LabelMedium on
   * `small`, LabelLarge on `medium`, TitleMedium on `large`). Not rendered on
   * `variant="search"`.
   */
  subtitle?: ReactNode
  /**
   * `variant="search"`: the search field — typically a `<SearchBar>`. It
   * replaces the heading text and fills the space between the navigation
   * icon and the actions (100% of it up to 312dp, then 50% — m3 search app
   * bar; max 720dp), on a surface-container field that turns
   * surface-container-highest when `scrolled`. Icons inside the field use
   * SearchBar's `startIcon` / `endIcon` (`startIcon={false}` for none);
   * opening the search view is SearchBar's `open` / `onOpenChange`.
   */
  searchBar?: ReactNode
  /** Leading navigation control (e.g. a back or menu IconButton). */
  navigationIcon?: ReactNode
  /** Trailing action controls. */
  actions?: ReactNode
  /**
   * Size / layout. `medium` / `large` are the M3 Expressive flexible bars,
   * `search` the search app bar (needs `searchBar`).
   * `'center'` is deprecated — use `titleAlignment="center"`.
   * @default 'small'
   */
  variant?: TopAppBarVariant
  /**
   * Title alignment, available on every size. A centered title is centered
   * across the full bar width and only pushed inward when it would collide
   * with the navigation icon or the actions. On `variant="search"` it
   * centers the search field's text and placeholder.
   * @default 'start' ('center' for the deprecated `variant="center"`)
   */
  titleAlignment?: TopAppBarTitleAlignment
  /**
   * State: content is scrolled under the bar → the container turns
   * surface-container (color only, no shadow). Overrides the value derived
   * from `scrollBehavior`.
   */
  scrolled?: boolean
  /**
   * State (medium / large): how far the bar is collapsed toward its 64dp row,
   * from 0 (expanded) to 1 (collapsed); the container color follows it.
   * Overrides the value derived from `scrollBehavior`.
   */
  collapsedFraction?: number
  /**
   * State: slides the whole bar out of view (upward) and takes it out of the
   * focus order / accessibility tree (`inert`). Unlike the native `hidden`
   * attribute the bar keeps its layout box. Overrides `scrollBehavior`.
   */
  hidden?: boolean
  /**
   * Observe `scrollTarget` and drive the state above automatically. The bar
   * then becomes `position: sticky; top: 0` (override with `style` /
   * `className`) and is meant to sit at the top of the scrolling content.
   * Leave it unset (and use the state props, or nothing) to keep the bar
   * fully expanded and reachable — e.g. for assistive-technology users.
   * Motion is instant under `prefers-reduced-motion: reduce`.
   */
  scrollBehavior?: TopAppBarScrollBehavior
  /**
   * The scroll container observed by `scrollBehavior` (a ref, an element or
   * the window). @default window
   */
  scrollTarget?: ScrollTarget
}

// Compose AppBar.kt: the two-row container color follows collapsedFraction
// through FastOutLinearInEasing; the top-row (collapsed) title fades in with
// TopTitleAlphaEasing while the second-row title fades out linearly.
const fastOutLinearIn = cubicBezier(0.4, 0, 1, 1)
const topTitleAlpha = cubicBezier(0.8, 0, 0.8, 0.15)

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Material Design 3 (Expressive) Top app bar.
 *
 * Surface container; `small` is a 64dp row with a TitleLarge title, `medium` /
 * `large` are the Expressive flexible bars — a 64dp row for the icons plus a
 * second row holding a HeadlineMedium / DisplaySmall title (up to two lines),
 * 112 / 120dp tall (136 / 152dp with a `subtitle`), the title's last baseline
 * 24 / 28dp above the bottom edge. OnSurface title / nav icon, OnSurfaceVariant
 * subtitle / actions; icon buttons laid out in 48dp slots with no gaps (icons
 * 16dp from the edges); title at 16dp, or 56dp after a nav icon — per
 * m3.material.io / Compose `AppBar.kt` (`TopAppBar`, `MediumFlexibleTopAppBar`,
 * `LargeFlexibleTopAppBar`). Standard `IconButton`s in the slots pick up the
 * slot color.
 *
 * `search` is the Expressive search app bar (m3 / Compose `AppBarWithSearch`):
 * a 64dp row — 4dp padding, nav icon, 8dp, the `searchBar` field (56dp,
 * surface-container), 8dp, actions, 4dp — with on-surface-variant icons.
 * Scrolled: the bar turns surface-container and the field
 * surface-container-highest.
 *
 * Scrolling (docs/decisions/phase-b-api.md B25): the state props (`scrolled`,
 * `collapsedFraction`, `hidden`) render any state; `scrollBehavior` +
 * `scrollTarget` derive them from a scroll container like Compose's pinned /
 * enterAlways / exitUntilCollapsed behaviors. On scroll the container turns
 * surface-container — a color change only, no shadow.
 */
export const TopAppBar = forwardRef<HTMLElement, TopAppBarProps>(
  function TopAppBar(
    {
      title,
      subtitle,
      searchBar,
      navigationIcon,
      actions,
      variant: variantProp = 'small',
      titleAlignment: titleAlignmentProp,
      scrolled: scrolledProp,
      collapsedFraction: collapsedFractionProp,
      hidden: hiddenProp,
      scrollBehavior,
      scrollTarget,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    // Deprecated alias: `center` → small + centered title.
    const variant = variantProp === 'center' ? 'small' : variantProp
    const titleAlignment =
      titleAlignmentProp ?? (variantProp === 'center' ? 'center' : 'start')
    const twoRow = variant === 'medium' || variant === 'large'
    const search = variant === 'search'
    const hasSubtitle = !search && subtitle != null

    const barRef = useRef<HTMLElement | null>(null)
    const expandedRowRef = useRef<HTMLDivElement | null>(null)
    const setRefs = useCallback(
      (node: HTMLElement | null) => {
        barRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    // ---- State derived from scrollBehavior ----
    const [scrolledState, setScrolledState] = useState(false)
    const [fractionState, setFractionState] = useState(0)
    const [offsetState, setOffsetState] = useState(0)
    const [scrollHidden, setScrollHidden] = useState(false)
    const [settling, setSettling] = useState(false)
    const offsetRef = useRef(0)
    // Natural height of the second row (the collapse range).
    const [expandedRowHeight, setExpandedRowHeight] = useState(0)

    const collapsible = twoRow && scrollBehavior === 'exitUntilCollapsed'
    const enterAlways = scrollBehavior === 'enterAlways'

    const applyOffset = (next: number, limit: number, settle: boolean) => {
      offsetRef.current = next
      setSettling(settle)
      setOffsetState(next)
      setScrollHidden(limit > 0 && next >= limit)
    }

    useScrollObserver(
      scrollTarget,
      scrollBehavior != null,
      ({ top, delta }) => {
        // Compose: a single-row bar changes color once content overlaps it; a
        // two-row bar follows collapsedFraction instead.
        if (!twoRow) setScrolledState(top > 0)
        if (enterAlways) {
          const limit = barRef.current?.offsetHeight ?? 0
          // A bar holding keyboard focus stays put (internal/barFocus.ts).
          const next =
            top <= 0 || holdsKeyboardFocus(barRef.current)
              ? 0
              : Math.min(limit, Math.max(0, offsetRef.current + delta))
          if (next !== offsetRef.current) applyOffset(next, limit, false)
        }
        if (collapsible) {
          const range = expandedRowRef.current?.offsetHeight ?? 0
          if (range > 0) setExpandedRowHeight(range)
          setFractionState(range > 0 ? clamp01(top / range) : 0)
        }
      },
      () => {
        // Settle a half-hidden bar when scrolling stops (Compose settleAppBar:
        // less than half hidden → shown, otherwise hidden).
        if (!enterAlways) return
        const limit = barRef.current?.offsetHeight ?? 0
        const offset = offsetRef.current
        if (offset <= 0 || offset >= limit) return
        applyOffset(offset < limit / 2 ? 0 : limit, limit, true)
      },
    )

    const scrolled = scrolledProp ?? (scrollBehavior != null && scrolledState)
    const collapsedFraction = twoRow
      ? clamp01(collapsedFractionProp ?? (collapsible ? fractionState : 0))
      : 0
    const hideOffset = hiddenProp == null && enterAlways ? offsetState : 0
    const fullyHidden = hiddenProp ?? (enterAlways && scrollHidden)

    // A collapse requested through the state prop needs the row's natural
    // height too (scroll-driven collapses measure in the scroll handler).
    useLayoutEffect(() => {
      if (!twoRow || collapsedFraction <= 0) return
      const h = expandedRowRef.current?.offsetHeight ?? 0
      if (h > 0 && h !== expandedRowHeight) setExpandedRowHeight(h)
    }, [twoRow, collapsedFraction, expandedRowHeight])

    // Offscreen → out of the focus order and the accessibility tree (B25).
    // Set through the DOM: React 18 has no boolean `inert` prop.
    useLayoutEffect(() => {
      // Release focus first so it never sits inside the inert bar.
      if (fullyHidden) releaseFocus(barRef.current)
      barRef.current?.toggleAttribute('inert', fullyHidden)
    }, [fullyHidden])

    const colorFraction = twoRow
      ? Math.max(scrolled ? 1 : 0, fastOutLinearIn(collapsedFraction))
      : scrolled
        ? 1
        : 0

    const titleBox = search ? (
      // The search field replaces the heading text (m3); the title stays
      // available to assistive technology as the page heading.
      <>
        {title != null && <h1 className={styles.visuallyHidden}>{title}</h1>}
        <div className={styles.searchSlot}>{searchBar}</div>
      </>
    ) : title != null || hasSubtitle ? (
        <div className={styles.titleBox}>
          {title != null && <h1 className={styles.title}>{title}</h1>}
          {hasSubtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      ) : null

    // A collapsing two-row bar shows the title in its top row (small
    // typography), fading in while the second row folds away. It duplicates
    // the heading visually, so it is hidden from assistive technology.
    const collapsedTitle =
      twoRow && collapsedFraction > 0 && (title != null || hasSubtitle) ? (
        <div className={clsx(styles.titleBox, styles.collapsedTitle)} aria-hidden="true">
          {title != null && <div className={styles.title}>{title}</div>}
          {hasSubtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      ) : null

    const vars = {
      '--_scrolled-fraction': colorFraction,
      '--_collapsed-fraction': collapsedFraction,
      '--_collapsed-title-opacity': topTitleAlpha(collapsedFraction),
      '--_expanded-row-full-height': `${expandedRowHeight}px`,
      '--_hide-offset': `${hideOffset}px`,
    } as CSSProperties

    return (
      <header
        ref={setRefs}
        {...rest}
        style={{ ...vars, ...style }}
        data-variant={variant}
        data-title-alignment={search ? undefined : titleAlignment}
        data-text-alignment={search ? titleAlignment : undefined}
        data-subtitle={hasSubtitle || undefined}
        data-scroll-behavior={scrollBehavior}
        data-scrolled={scrolled || undefined}
        data-collapsing={(twoRow && collapsedFraction > 0) || undefined}
        data-hidden={hiddenProp == null ? undefined : String(hiddenProp)}
        data-hide-offset={hideOffset > 0 || undefined}
        data-settling={settling || undefined}
        className={clsx(styles.topBar, className)}
      >
        <div className={styles.row}>
          {navigationIcon != null && (
            <div className={styles.nav}>{navigationIcon}</div>
          )}
          {twoRow ? (collapsedTitle ?? <div className={styles.spacer} />) : titleBox}
          {actions != null && <div className={styles.actions}>{actions}</div>}
        </div>
        {twoRow && (
          <div className={styles.expandedClip}>
            <div ref={expandedRowRef} className={styles.expandedRow}>
              {titleBox}
            </div>
          </div>
        )}
      </header>
    )
  },
)

export interface BottomAppBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Action controls (icon buttons). */
  children?: ReactNode
  /** Optional trailing floating action button. */
  floatingActionButton?: ReactNode
}

/**
 * Material Design 3 Bottom app bar.
 *
 * 80dp SurfaceContainer bar hosting action icons (OnSurfaceVariant) at the
 * start (48dp slots, no gaps) and an optional FAB at the end, per Compose
 * BottomAppBarTokens.
 *
 * For new designs prefer `<Toolbar variant="docked">`: m3.material.io lists the
 * bottom app bar as "not recommended — use the docked toolbar" (Compose keeps
 * `BottomAppBar` non-deprecated, so it stays available here).
 */
export const BottomAppBar = forwardRef<HTMLDivElement, BottomAppBarProps>(
  function BottomAppBar(
    { children, floatingActionButton, className, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        {...rest}
        className={clsx(styles.bottomBar, className)}
      >
        <div className={styles.bottomActions}>{children}</div>
        {floatingActionButton != null && (
          <div className={styles.fabSlot}>{floatingActionButton}</div>
        )}
      </div>
    )
  },
)
