import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './AppBar.module.css'

/**
 * Top app bar size.
 *
 * - `small` — single 64dp row.
 * - `medium` — Expressive **medium flexible** bar: 112dp (136dp with a
 *   subtitle), HeadlineMedium title in a second row.
 * - `large` — Expressive **large flexible** bar: 120dp (152dp with a subtitle),
 *   DisplaySmall title in a second row.
 * - `center` — **deprecated** alias of `variant="small" titleAlignment="center"`
 *   (m3: center-aligned is merged into small as a centered-text configuration).
 *   Removed in v2.
 */
export type TopAppBarVariant = 'small' | 'medium' | 'large' | 'center'

/** Horizontal alignment of the title (and subtitle). */
export type TopAppBarTitleAlignment = 'start' | 'center'

export interface TopAppBarProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The bar title (rendered as the page heading). */
  title?: ReactNode
  /**
   * Supporting text under the title (on-surface-variant; LabelMedium on
   * `small`, LabelLarge on `medium`, TitleMedium on `large`).
   */
  subtitle?: ReactNode
  /** Leading navigation control (e.g. a back or menu IconButton). */
  navigationIcon?: ReactNode
  /** Trailing action controls. */
  actions?: ReactNode
  /**
   * Size / layout. `medium` / `large` are the M3 Expressive flexible bars.
   * `'center'` is deprecated — use `titleAlignment="center"`.
   * @default 'small'
   */
  variant?: TopAppBarVariant
  /**
   * Title alignment, available on every size. A centered title is centered
   * across the full bar width and only pushed inward when it would collide
   * with the navigation icon or the actions.
   * @default 'start' ('center' for the deprecated `variant="center"`)
   */
  titleAlignment?: TopAppBarTitleAlignment
}

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
 */
export const TopAppBar = forwardRef<HTMLElement, TopAppBarProps>(
  function TopAppBar(
    {
      title,
      subtitle,
      navigationIcon,
      actions,
      variant: variantProp = 'small',
      titleAlignment: titleAlignmentProp,
      className,
      ...rest
    },
    ref,
  ) {
    // Deprecated alias: `center` → small + centered title.
    const variant = variantProp === 'center' ? 'small' : variantProp
    const titleAlignment =
      titleAlignmentProp ?? (variantProp === 'center' ? 'center' : 'start')
    const twoRow = variant === 'medium' || variant === 'large'
    const hasSubtitle = subtitle != null

    const titleBox =
      title != null || hasSubtitle ? (
        <div className={styles.titleBox}>
          {title != null && <h1 className={styles.title}>{title}</h1>}
          {hasSubtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      ) : null

    return (
      <header
        ref={ref}
        {...rest}
        data-variant={variant}
        data-title-alignment={titleAlignment}
        data-subtitle={hasSubtitle || undefined}
        className={clsx(styles.topBar, className)}
      >
        <div className={styles.row}>
          {navigationIcon != null && (
            <div className={styles.nav}>{navigationIcon}</div>
          )}
          {twoRow ? <div className={styles.spacer} /> : titleBox}
          {actions != null && <div className={styles.actions}>{actions}</div>}
        </div>
        {twoRow && <div className={styles.expandedRow}>{titleBox}</div>}
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
