import {
  forwardRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './Slider.module.css'

export interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value' | 'defaultValue' | 'type' | 'min' | 'max' | 'step'
  > {
  /** Controlled value. */
  value?: number
  /** Uncontrolled initial value. @default min */
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  /** Fires with the new numeric value. */
  onChange?: (value: number, event: ChangeEvent<HTMLInputElement>) => void
  /** Render tick marks at each step. @default false */
  showTicks?: boolean
  /** Show the value-indicator bubble on hover / focus / drag. @default false */
  showValueLabel?: boolean
  /** Format the value-indicator label. */
  valueLabelFormat?: (value: number) => ReactNode
  disabled?: boolean
}

/**
 * Material Design 3 (Expressive) Slider.
 *
 * Built on a native `<input type="range">` (accessible, keyboard, form-ready)
 * overlaid on custom MD3 visuals: a 16dp track (active Primary, inactive
 * SecondaryContainer), a 4×44dp pill handle with a 6dp gap from the track, and
 * a track stop indicator. Optional tick marks and a value-indicator bubble.
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    showTicks = false,
    showValueLabel = false,
    valueLabelFormat,
    disabled = false,
    className,
    style,
    ...rest
  },
  ref,
) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? min)
  const current = isControlled ? value : internal
  const clamped = Math.min(max, Math.max(min, current))
  const fraction = max > min ? (clamped - min) / (max - min) : 0

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value)
    if (!isControlled) setInternal(next)
    onChange?.(next, event)
  }

  const tickCount =
    showTicks && step > 0 ? Math.floor((max - min) / step) : 0
  const ticks =
    tickCount > 0 && tickCount <= 100
      ? Array.from({ length: tickCount + 1 }, (_, i) => i / tickCount)
      : []

  const labelText = valueLabelFormat ? valueLabelFormat(clamped) : clamped

  return (
    <span
      className={clsx(styles.slider, className)}
      data-disabled={disabled || undefined}
      style={{ ...style, '--_fraction': fraction } as CSSProperties}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.inactive} />
        <span className={styles.active} />
        {ticks.map((t) => (
          <span
            key={t}
            className={styles.tick}
            data-active={t <= fraction || undefined}
            style={{ insetInlineStart: `${t * 100}%` }}
          />
        ))}
        {fraction < 1 && <span className={styles.stop} />}
      </span>
      <span className={styles.thumb} aria-hidden="true" />
      {showValueLabel && (
        <span className={styles.valueLabel} aria-hidden="true">
          {labelText}
        </span>
      )}
      <input
        ref={ref}
        {...rest}
        type="range"
        className={styles.input}
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        onChange={handleChange}
      />
    </span>
  )
})
