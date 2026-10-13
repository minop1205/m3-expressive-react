'use client'

import {
  Children,
  Fragment,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type LiHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { CheckIcon } from '../icons'
import styles from './Listbox.module.css'

/**
 * The listbox popup and `Option` shared by `Select` (B31) and `Autocomplete`
 * (B42): the Compose `ExposedDropdownMenu` surface and its
 * `SelectableDropdownMenuItem`s, exposed as an APG `role="listbox"` whose
 * active option is tracked with `aria-activedescendant` (DOM focus stays on
 * the combobox). Values: docs/specs/select.md SE1.
 *
 * Internal — the public `Option` is re-exported by the components.
 */

export interface OptionProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'value'> {
  /** The value this option selects (submitted with the form). */
  value: string
  /** Visible, inert, and skipped by keyboard navigation. @default false */
  disabled?: boolean
  /** Icon at the start of the option (decorative); the check mark replaces it while selected. */
  startIcon?: ReactNode
  /**
   * Plain-text label for an `Autocomplete`: the text the input shows once the
   * option is picked and the text filtering matches. Defaults to the text
   * content of `children`. Ignored by `Select`.
   */
  textValue?: string
  /** The option's label. Also what the field shows once it is selected. */
  children?: ReactNode
}

export interface OptionData {
  value: string
  disabled: boolean
  children: ReactNode
  /** Plain-text label (`textValue`, else the text content of `children`). */
  label: string
  /** The `Option` element as written (Autocomplete renders a filtered subset). */
  element: ReactElement<OptionProps>
}

export interface ListboxContextValue {
  /** The options as rendered, in order (their index is the option's id suffix). */
  options: OptionData[]
  selectedValue: string
  activeIndex: number
  keyboardActive: boolean
  idFor: (index: number) => string
  select: (index: number, event: SyntheticEvent) => void
  hover: (index: number) => void
}

const ListboxContext = createContext<ListboxContextValue | null>(null)

/** The text content of a React node (strings and numbers, depth first). */
export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children)
  }
  return ''
}

/** `Option` elements in document order, Fragments flattened. */
export function collectOptions(children: ReactNode, out: OptionData[] = []): OptionData[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const element = child as ReactElement<Record<string, unknown>>
    if (element.type === Fragment) {
      collectOptions(element.props.children as ReactNode, out)
    } else if (element.type === Option) {
      const props = element.props as unknown as OptionProps
      out.push({
        value: props.value,
        disabled: !!props.disabled,
        children: props.children,
        label: props.textValue ?? nodeText(props.children),
        element: element as unknown as ReactElement<OptionProps>,
      })
    }
  })
  return out
}

/** Index of the first enabled option, or -1. */
export function firstEnabled(options: readonly OptionData[]): number {
  return options.findIndex((option) => !option.disabled)
}

/** Index of the last enabled option, or -1. */
export function lastEnabled(options: readonly OptionData[]): number {
  for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i
  return -1
}

/**
 * The `|step|`-th enabled option from `from` in `step`'s direction, clamped at
 * the ends (no wrap): `from` itself when there is none.
 */
export function stepEnabled(options: readonly OptionData[], from: number, step: number): number {
  const direction = Math.sign(step) || 1
  let target = -1
  let remaining = Math.abs(step)
  for (let i = from + direction; i >= 0 && i < options.length; i += direction) {
    if (!options[i].disabled) {
      target = i
      if (--remaining === 0) break
    }
  }
  return target === -1 ? from : target
}

export interface ListboxProps {
  id: string
  open: boolean
  /** The side the popup helper placed it on (sets the scale-in origin). */
  side: string
  labelledBy?: string
  ariaLabel?: string
  /** Enables the filtering motion (options ease into their new position). */
  filterable?: boolean
  /** Shown instead of options when there are none (an inert row). */
  emptyText?: ReactNode
  context: ListboxContextValue
  children?: ReactNode
}

/** The `role="listbox"` popup (positioned by the owner through `usePopupPosition`). */
export const Listbox = forwardRef<HTMLUListElement, ListboxProps>(function Listbox(
  { id, open, side, labelledBy, ariaLabel, filterable, emptyText, context, children },
  ref,
) {
  // With nothing to choose, the popup is a plain list holding the message
  // (a listbox must own options — axe aria-required-children).
  const empty = emptyText != null && context.options.length === 0
  return (
    <ul
      ref={ref}
      id={id}
      role={empty ? undefined : 'listbox'}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      tabIndex={-1}
      className={styles.listbox}
      data-open={open || undefined}
      data-placement={side === 'top' ? 'above' : 'below'}
      data-filterable={filterable || undefined}
      // Option presses must not take focus from the combobox.
      onMouseDown={(event) => event.preventDefault()}
    >
      <ListboxContext.Provider value={context}>{children}</ListboxContext.Provider>
      {empty && <li className={styles.noOptions}>{emptyText}</li>}
    </ul>
  )
})

/**
 * An option of a `Select` or `Autocomplete` (`role="option"`). The selected
 * option shows the tertiary-container colors, a 12dp corner shape and a
 * leading check mark.
 */
export const Option = forwardRef<HTMLLIElement, OptionProps>(function Option(
  {
    value,
    disabled = false,
    startIcon,
    textValue: _textValue,
    className,
    children,
    onClick,
    onPointerMove,
    ...rest
  },
  ref,
) {
  const ctx = useContext(ListboxContext)
  const index = ctx ? ctx.options.findIndex((option) => option.value === value) : -1
  const selected = !!ctx && ctx.selectedValue === value && index !== -1
  const active = !!ctx && index !== -1 && ctx.activeIndex === index
  return (
    <li
      ref={ref}
      {...rest}
      id={ctx && index !== -1 ? ctx.idFor(index) : rest.id}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-active={active || undefined}
      data-focus-visible={(active && ctx?.keyboardActive) || undefined}
      className={clsx(styles.option, className)}
      onClick={(event) => {
        onClick?.(event)
        if (disabled || event.defaultPrevented || !ctx) return
        ctx.select(index, event)
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event)
        if (!disabled && ctx) ctx.hover(index)
      }}
    >
      <span
        className={clsx(styles.leading, startIcon == null && styles.checkOnly)}
        aria-hidden="true"
      >
        {selected ? <CheckIcon /> : startIcon}
      </span>
      <span className={styles.label}>{children}</span>
      <span className={styles.focusRing} aria-hidden="true" />
      {!disabled && <Ripple />}
    </li>
  )
})
