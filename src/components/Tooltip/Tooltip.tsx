import {
  Children,
  cloneElement,
  forwardRef,
  useId,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './Tooltip.module.css'

export type TooltipVariant = 'plain' | 'rich'
export type TooltipPlacement = 'top' | 'bottom'

export interface TooltipProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The trigger element (a single focusable/hoverable element). */
  children: ReactElement
  /** Plain style or rich (with subhead + action). @default 'plain' */
  variant?: TooltipVariant
  /** Body / supporting text. */
  text?: ReactNode
  /** Rich tooltip subhead (title). */
  subhead?: ReactNode
  /** Rich tooltip action node (e.g. a text button). */
  action?: ReactNode
  /** Preferred placement relative to the trigger. @default 'top' */
  placement?: TooltipPlacement
  /** Uncontrolled initial visibility. @default false */
  defaultOpen?: boolean
  /** Controlled visibility. */
  open?: boolean
  /** Notified when visibility should change. */
  onOpenChange?: (open: boolean) => void
}

function compose<E>(
  theirs: ((event: E) => void) | undefined,
  ours: (event: E) => void,
) {
  return (event: E) => {
    theirs?.(event)
    ours(event)
  }
}

/**
 * Material Design 3 Tooltip.
 *
 * Wraps a single trigger element and shows a tooltip on hover / focus.
 * Plain (InverseSurface, 4dp, BodySmall) or rich (SurfaceContainer, 12dp,
 * elevation 2, with a subhead and an optional action). Sets `aria-describedby`
 * on the trigger and `role="tooltip"` on the popup; Escape dismisses.
 */
export const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(function Tooltip(
  {
    children,
    variant = 'plain',
    text,
    subhead,
    action,
    placement = 'top',
    defaultOpen = false,
    open,
    onOpenChange,
    className,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const id = useId()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen

  const setOpen = (value: boolean) => {
    if (!isControlled) setUncontrolledOpen(value)
    onOpenChange?.(value)
  }

  const child = Children.only(children) as ReactElement<{
    'aria-describedby'?: string
    onMouseEnter?: (event: MouseEvent) => void
    onMouseLeave?: (event: MouseEvent) => void
    onFocus?: (event: FocusEvent) => void
    onBlur?: (event: FocusEvent) => void
  }>

  const describedBy =
    [child.props['aria-describedby'], isOpen ? id : undefined]
      .filter(Boolean)
      .join(' ') || undefined

  const trigger = cloneElement(child, {
    'aria-describedby': describedBy,
    onMouseEnter: compose(child.props.onMouseEnter, () => setOpen(true)),
    onMouseLeave: compose(child.props.onMouseLeave, () => setOpen(false)),
    onFocus: compose(child.props.onFocus, () => setOpen(true)),
    onBlur: compose(child.props.onBlur, () => setOpen(false)),
  })

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(event)
    if (event.key === 'Escape' && isOpen) {
      setOpen(false)
    }
  }

  return (
    <span
      {...rest}
      ref={ref}
      className={clsx(styles.wrapper, className)}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      <div
        id={id}
        role="tooltip"
        data-variant={variant}
        data-placement={placement}
        className={clsx(styles.tooltip, isOpen && styles.open)}
        onMouseEnter={variant === 'rich' ? () => setOpen(true) : undefined}
        onMouseLeave={variant === 'rich' ? () => setOpen(false) : undefined}
      >
        {variant === 'rich' && subhead != null && (
          <div className={styles.subhead}>{subhead}</div>
        )}
        {text != null && <div className={styles.text}>{text}</div>}
        {variant === 'rich' && action != null && (
          <div className={styles.action}>{action}</div>
        )}
      </div>
    </span>
  )
})
