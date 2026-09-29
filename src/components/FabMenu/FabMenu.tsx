import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './FabMenu.module.css'

export type FabMenuColor = 'primary' | 'secondary' | 'tertiary'

const CloseIcon = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

interface FabMenuContextValue {
  close: () => void
}
const FabMenuContext = createContext<FabMenuContextValue | null>(null)

export interface FabMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** FAB icon shown while the menu is closed. */
  icon: ReactNode
  /** Color set. @default 'primary' */
  color?: FabMenuColor
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the open state changes. */
  onOpenChange?: (open: boolean) => void
  /** Accessible label for the FAB (closed state). */
  ariaLabel: string
  /** Accessible label for the close button (open state). @default 'Close menu' */
  closeAriaLabel?: string
  /** `FabMenuItem`s (up to six). */
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) FAB menu.
 *
 * A FAB that opens into a vertical stack of labelled action items anchored to
 * its top-trailing edge. The FAB morphs into a 56dp close button (container
 * primaryContainer → primary, icon onPrimaryContainer → onPrimary) and the items
 * stagger in — per m3.material.io / Compose FloatingActionButtonMenu. Items use
 * the container/on-container roles of the chosen color set (primary / secondary
 * / tertiary). Closes on outside click, Escape, or item selection.
 */
export const FabMenu = forwardRef<HTMLDivElement, FabMenuProps>(function FabMenu(
  {
    icon,
    color = 'primary',
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    ariaLabel,
    closeAriaLabel = 'Close menu',
    className,
    children,
    ...rest
  },
  ref,
) {
  const isControlled = controlledOpen !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = isControlled ? controlledOpen : uncontrolled
  const rootRef = useRef<HTMLDivElement | null>(null)

  const setOpen = (value: boolean) => {
    if (!isControlled) setUncontrolled(value)
    onOpenChange?.(value)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const items = Children.toArray(children).filter(isValidElement)
  const count = items.length

  return (
    <div
      ref={(node) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node
      }}
      {...rest}
      data-color={color}
      data-open={open || undefined}
      className={clsx(styles.root, className)}
    >
      <div className={styles.list} role="menu" aria-label={ariaLabel} data-open={open || undefined}>
        <FabMenuContext.Provider value={{ close: () => setOpen(false) }}>
          {items.map((item, index) => (
            <div
              key={index}
              className={styles.itemSlot}
              // Items nearest the FAB (last) appear first when opening.
              style={{ '--_stagger': `${(count - 1 - index) * 30}ms` } as CSSProperties}
            >
              {item}
            </div>
          ))}
        </FabMenuContext.Provider>
      </div>

      <button
        type="button"
        className={styles.fab}
        aria-label={open ? closeAriaLabel : ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        <span className={styles.fabIcon} aria-hidden="true">
          {open ? CloseIcon : icon}
        </span>
        <Ripple />
        <FocusRing />
      </button>
    </div>
  )
})

export interface FabMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Leading icon (decorative). */
  icon?: ReactNode
  children?: ReactNode
}

/** A labelled action inside a `FabMenu`. */
export const FabMenuItem = forwardRef<HTMLButtonElement, FabMenuItemProps>(
  function FabMenuItem({ icon, className, children, onClick, ...rest }, ref) {
    const ctx = useContext(FabMenuContext)
    return (
      <button
        ref={ref}
        {...rest}
        type="button"
        role="menuitem"
        className={clsx(styles.item, className)}
        onClick={(event) => {
          onClick?.(event)
          ctx?.close()
        }}
      >
        {icon != null && (
          <span className={styles.itemIcon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.itemLabel}>{children}</span>
        <Ripple />
        <FocusRing />
      </button>
    )
  },
)
