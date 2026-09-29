import {
  createContext,
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'

export interface RadioGroupContextValue {
  name: string
  value: string | undefined
  disabled: boolean
  onSelect: (event: ChangeEvent<HTMLInputElement>, value: string) => void
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

export interface RadioGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Shared input name for the group. Auto-generated when omitted. */
  name?: string
  /** Controlled selected value. */
  value?: string
  /** Uncontrolled initial selected value. */
  defaultValue?: string
  /** Fires with the native event and the newly selected value. */
  onChange?: (event: ChangeEvent<HTMLInputElement>, value: string) => void
  /** Disable every radio in the group. */
  disabled?: boolean
  /** `Radio` elements (any depth). */
  children?: ReactNode
}

/**
 * Groups `Radio` components: distributes a shared `name`, manages the selected
 * value (controlled via `value` or uncontrolled via `defaultValue`), and
 * exposes a `role="radiogroup"` landmark. Label the group with `aria-label` or
 * `aria-labelledby`. Arrow-key navigation between radios comes from the native
 * inputs sharing the group name.
 */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  function RadioGroup(
    {
      name: nameProp,
      value: controlledValue,
      defaultValue,
      onChange,
      disabled = false,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const autoName = useId()
    const name = nameProp ?? autoName
    const isControlled = controlledValue !== undefined
    const [uncontrolled, setUncontrolled] = useState(defaultValue)
    const value = isControlled ? controlledValue : uncontrolled

    const onSelect = (event: ChangeEvent<HTMLInputElement>, next: string) => {
      if (!isControlled) setUncontrolled(next)
      onChange?.(event, next)
    }

    return (
      <div ref={ref} {...rest} role="radiogroup" className={clsx(className)}>
        <RadioGroupContext.Provider value={{ name, value, disabled, onSelect }}>
          {children}
        </RadioGroupContext.Provider>
      </div>
    )
  },
)
