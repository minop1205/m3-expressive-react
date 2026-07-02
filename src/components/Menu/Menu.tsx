import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './Menu.module.css'

interface MenuContextValue {
  close: () => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The element that opens the menu (a single button-like element). */
  trigger: ReactElement
  /** `MenuItem`s. */
  children: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the open state should change. */
  onOpenChange?: (open: boolean) => void
  /** Horizontal alignment to the trigger. @default 'start' */
  align?: 'start' | 'end'
}

/**
 * Material Design 3 Menu (dropdown).
 *
 * Anchors a `role="menu"` popup to a trigger. SurfaceContainer container, 4dp
 * corners, elevation 2, 112–280dp wide, 8dp vertical padding — per Compose
 * MenuTokens. Closes on outside click, Escape, or item selection.
 */
export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  {
    trigger,
    children,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    align = 'start',
    className,
    ...rest
  },
  ref,
) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolled
  const wrapperRef = useRef<HTMLSpanElement>(null)

  const setOpen = (value: boolean) => {
    if (!isControlled) setUncontrolled(value)
    onOpenChange?.(value)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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

  const child = Children.only(trigger) as ReactElement<{
    onClick?: (event: MouseEvent) => void
  }>
  const triggerEl = cloneElement(child, {
    onClick: (event: MouseEvent) => {
      child.props.onClick?.(event)
      setOpen(!open)
    },
    'aria-haspopup': 'menu',
    'aria-expanded': open,
  } as Partial<typeof child.props>)

  return (
    <span ref={wrapperRef} className={styles.wrapper}>
      {triggerEl}
      <div
        ref={ref}
        {...rest}
        role="menu"
        data-open={open || undefined}
        data-align={align}
        className={clsx(styles.menu, className)}
      >
        <MenuContext.Provider value={{ close: () => setOpen(false) }}>
          {children}
        </MenuContext.Provider>
      </div>
    </span>
  )
})

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  children?: ReactNode
}

/** A selectable item inside a `Menu`. */
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  function MenuItem(
    { leadingIcon, trailingIcon, disabled = false, className, children, onClick, ...rest },
    ref,
  ) {
    const ctx = useContext(MenuContext)
    return (
      <button
        ref={ref}
        {...rest}
        type="button"
        role="menuitem"
        disabled={disabled}
        className={clsx(styles.item, className)}
        onClick={(event) => {
          onClick?.(event)
          ctx?.close()
        }}
      >
        {leadingIcon != null && (
          <span className={styles.leading} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <span className={styles.label}>{children}</span>
        {trailingIcon != null && (
          <span className={styles.trailing} aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </button>
    )
  },
)
