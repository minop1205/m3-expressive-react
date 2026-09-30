import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './AppBar.module.css'

export type TopAppBarVariant = 'small' | 'center' | 'medium' | 'large'

export interface TopAppBarProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The bar title. */
  title?: ReactNode
  /** Leading navigation control (e.g. a back or menu IconButton). */
  navigationIcon?: ReactNode
  /** Trailing action controls. */
  actions?: ReactNode
  /** Size / layout. @default 'small' */
  variant?: TopAppBarVariant
}

/**
 * Material Design 3 Top app bar.
 *
 * Surface container, 64dp (small / center) or two-row 112dp (medium) / 152dp
 * (large). Title uses TitleLarge (small/center), HeadlineSmall (medium) or
 * HeadlineMedium (large); OnSurface title, OnSurface nav icon,
 * OnSurfaceVariant actions; icon buttons laid out in 48dp slots with no gaps
 * (icons 16dp from the edges); title at 16dp, or 56dp after a nav icon — per
 * m3.material.io / Compose AppBar tokens. Standard `IconButton`s in the slots
 * pick up the slot color.
 */
export const TopAppBar = forwardRef<HTMLElement, TopAppBarProps>(
  function TopAppBar(
    { title, navigationIcon, actions, variant = 'small', className, ...rest },
    ref,
  ) {
    const twoRow = variant === 'medium' || variant === 'large'

    return (
      <header
        ref={ref}
        {...rest}
        data-variant={variant}
        className={clsx(styles.topBar, className)}
      >
        <div className={styles.row}>
          {navigationIcon != null && (
            <div className={styles.nav}>{navigationIcon}</div>
          )}
          {!twoRow && title != null && (
            <h1 className={styles.title}>{title}</h1>
          )}
          {twoRow && <div className={styles.spacer} />}
          {actions != null && <div className={styles.actions}>{actions}</div>}
        </div>
        {twoRow && title != null && (
          <h1 className={styles.titleLarge}>{title}</h1>
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
