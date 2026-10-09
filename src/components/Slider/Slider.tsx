import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { devWarnOnce } from '../../internal/devWarning'
import styles from './Slider.module.css'

export type SliderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SliderOrientation = 'horizontal' | 'vertical'

/** A single value, or a `[start, end]` pair for a range slider. */
export type SliderValue = number | [number, number]

export interface SliderProps
  extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    'onChange' | 'defaultValue'
  > {
  /** Controlled value (`number`, or `[start, end]` for range). */
  value?: SliderValue
  /** Uncontrolled initial value. @default min (or `[min, max]` for range) */
  defaultValue?: SliderValue
  min?: number
  max?: number
  step?: number
  /** Fires with the native event and the new value (same shape as `value`). */
  onChange?: (event: ChangeEvent<HTMLInputElement>, value: SliderValue) => void
  /** Expressive size (track thickness / handle height). @default 'xs' */
  size?: SliderSize
  /** Orientation. @default 'horizontal' */
  orientation?: SliderOrientation
  /** Draw the active track from the center outward. @default false */
  centered?: boolean
  /** Icon shown inside the handle (sizes md/lg/xl only). */
  insetIcon?: ReactNode
  /** Render tick marks at each step. @default false */
  showTicks?: boolean
  /** Show the value-indicator bubble on hover / focus / drag. @default false */
  showValueLabel?: boolean
  /**
   * Format the value-indicator label. A `string` / `number` result is also
   * announced via `aria-valuetext` so AT reads what the label shows.
   */
  valueLabelFormat?: (value: number) => ReactNode
  /** Accessible label for the start (minimum) thumb of a range slider. @default 'Minimum' */
  rangeStartLabel?: string
  /** Accessible label for the end (maximum) thumb of a range slider. @default 'Maximum' */
  rangeEndLabel?: string
  /**
   * Ref to the native `<input type="range">` element (the forwarded `ref`
   * points at the root). A range slider renders two inputs; `inputRef`
   * reaches the FIRST (start / minimum) one — query its siblings for the end
   * input if needed.
   */
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
}

/** Per-size measurements (m3.material.io slider measurements). */
const SIZES: Record<SliderSize, { track: number; handle: number; corner: number; icon: number }> = {
  xs: { track: 16, handle: 44, corner: 8, icon: 0 },
  sm: { track: 24, handle: 44, corner: 8, icon: 0 },
  md: { track: 40, handle: 52, corner: 12, icon: 24 },
  lg: { track: 56, handle: 68, corner: 16, icon: 24 },
  xl: { track: 96, handle: 108, corner: 28, icon: 32 },
}

/** Clear gap (px) between the active track and a handle: half-handle (2) + 6dp. */
const GAP = 8

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/** Tolerance for float step counts — `0.3 / 0.1` is `2.9999999999999996`. */
const STEP_EPSILON = 1e-9

/** Whole step intervals in `span` (float-tolerant). */
function stepIntervals(span: number, step: number) {
  return Math.floor(span / step + STEP_EPSILON)
}

/** Number of decimal places needed to write `n` exactly (`1e-7` → 7). */
function decimals(n: number) {
  if (!Number.isFinite(n)) return 0
  const [mantissa, exponent] = n.toExponential().split('e')
  const fraction = mantissa.split('.')[1]?.length ?? 0
  return clamp(fraction - Number(exponent), 0, 100)
}
/** `calc(<frac>*100% <op> <gap>px)` for positioning along the main axis. */
function pos(frac: number, gap = 0) {
  const g = gap === 0 ? '' : gap > 0 ? ` + ${gap}px` : ` - ${-gap}px`
  return `calc(${frac} * 100%${g})`
}

/**
 * Material Design 3 (Expressive) Slider.
 *
 * Native `<input type="range">`(s) overlaid on MD3 visuals: five sizes (XS–XL,
 * track 16–96dp / handle 44–108dp), single or **range** (`[start, end]`),
 * **centered** (active from the midpoint), **vertical** orientation, optional
 * tick marks, value-indicator bubble, and an **inset icon** in the handle
 * (md/lg/xl). Handle Primary, active track Primary, inactive SecondaryContainer;
 * disabled active 38% / inactive 12% — per m3.material.io & Compose SliderTokens.
 *
 * MUI parity: the forwarded `ref` and `{...rest}` land on the ROOT element;
 * `inputRef` reaches the first native `<input type="range">`.
 */
export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    min: minProp = 0,
    max: maxProp = 100,
    step = 1,
    onChange,
    size = 'xs',
    orientation = 'horizontal',
    centered = false,
    insetIcon,
    showTicks = false,
    showValueLabel = false,
    valueLabelFormat,
    rangeStartLabel = 'Minimum',
    rangeEndLabel = 'Maximum',
    inputRef,
    disabled = false,
    className,
    style,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    ...rest
  },
  ref,
) {
  // Normalize inverted bounds (#431): `min > max` would draw the handle off
  // the track. Swap them, and tell the developer.
  const inverted = minProp > maxProp
  const min = inverted ? maxProp : minProp
  const max = inverted ? minProp : maxProp
  useEffect(() => {
    if (inverted) {
      devWarnOnce(
        `Slider: \`min\` (${minProp}) is greater than \`max\` (${maxProp}); the bounds were swapped.`,
      )
    }
  }, [inverted, minProp, maxProp])

  const rangeInit = Array.isArray(value ?? defaultValue)
  const isControlled = value !== undefined
  const [internal, setInternal] = useState<SliderValue>(
    defaultValue ?? (rangeInit ? [min, max] : min),
  )
  // Index of the handle currently pressed/dragged (Compose PressInteraction /
  // DragInteraction — drives the 4 → 2dp handle squeeze).
  const [pressed, setPressed] = useState<number | null>(null)
  // The pointer press in progress: which thumb its drag drives (decided on
  // the first change), and that thumb's input so it can take focus on release.
  const pressRef = useRef<{ input: number; thumb: number | null; el?: HTMLInputElement } | null>(
    null,
  )
  useEffect(() => {
    if (pressed === null) return
    const clear = () => {
      const press = pressRef.current
      pressRef.current = null
      setPressed(null)
      // A drag handed to the other thumb leaves focus on the input that was
      // grabbed; move it to the thumb that moved so the keyboard follows.
      if (press?.el && press.thumb !== press.input) press.el.focus({ preventScroll: true })
    }
    window.addEventListener('pointerup', clear)
    window.addEventListener('pointercancel', clear)
    return () => {
      window.removeEventListener('pointerup', clear)
      window.removeEventListener('pointercancel', clear)
    }
  }, [pressed])

  const current = isControlled ? value : internal
  const values = Array.isArray(current) ? current : [current]
  const isRange = values.length === 2
  const span = max > min ? max - min : 1

  const clamped = values.map((v) => clamp(v, min, max))
  const fractions = clamped.map((v) => (v - min) / span)

  // Values on the step grid are written with the step's (and min's) decimal
  // places, so float noise (`0.1 + 0.2`) never reaches onChange (#431).
  const precision = step > 0 ? Math.max(decimals(step), decimals(min)) : null
  const round = (v: number) => (precision === null ? v : Number(v.toFixed(precision)))

  const commit = (raw: number, inputIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const next = round(raw)
    let index = inputIndex
    const press = pressRef.current
    if (isRange && press) {
      if (press.thumb === null && next !== clamped[inputIndex]) {
        // Stacked thumbs (#431): only the top input receives the pointer, but
        // it may be the one that can't move that way (both at max → the end
        // thumb). Hand the drag to the thumb that can move in its direction —
        // left / down drives the start thumb, right / up the end thumb.
        press.thumb =
          clamped[0] === clamped[1] ? (next < clamped[0] ? 0 : 1) : inputIndex
        if (press.thumb !== inputIndex) {
          press.el =
            event.currentTarget.parentElement?.querySelector<HTMLInputElement>(
              `input[data-index='${press.thumb}']`,
            ) ?? undefined
          setPressed(press.thumb)
        }
      }
      if (press.thumb !== null) index = press.thumb
    }
    let out: SliderValue
    if (isRange) {
      const pair: [number, number] = [clamped[0], clamped[1]]
      pair[index] = next
      // Keep start <= end.
      if (pair[0] > pair[1]) pair[index] = index === 0 ? pair[1] : pair[0]
      out = pair
    } else {
      out = next
    }
    if (!isControlled) setInternal(out)
    onChange?.(event, out)
  }

  /**
   * PageUp/PageDown large steps (browser support is inconsistent — Safari
   * ignores them; Chromium jumps 10% of the range regardless of step) and
   * Home/End, normalized to the Compose formula: with N step intervals the
   * page jump is `clamp(floor(N / 10), 1, 10)` steps — 10% for continuous
   * sliders. Drives the native input so React emits a regular ChangeEvent.
   */
  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    const { key } = event
    let next: number | null = null
    if (key === 'PageUp' || key === 'PageDown') {
      const intervals = step > 0 ? Math.max(1, stepIntervals(span, step)) : 100
      const page = clamp(Math.floor(intervals / 10), 1, 10)
      const delta = page * (step > 0 ? step : span / 100)
      next = round(clamp(clamped[index] + (key === 'PageUp' ? delta : -delta), min, max))
    } else if (key === 'Home') {
      next = min
    } else if (key === 'End') {
      next = max
    }
    if (next === null) return
    event.preventDefault()
    if (next === clamped[index]) return
    const input = event.currentTarget
    // Set the value through the native setter and dispatch `input` so React's
    // onChange fires with an ordinary ChangeEvent (same code path as pointer
    // and native keyboard edits — controlled/uncontrolled semantics intact).
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    setValue?.call(input, String(next))
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // Active interval [a, b] along the main axis, and which ends touch a handle.
  let a: number
  let b: number
  let gapAtA: boolean
  let gapAtB: boolean
  if (isRange) {
    a = Math.min(fractions[0], fractions[1])
    b = Math.max(fractions[0], fractions[1])
    gapAtA = true
    gapAtB = true
  } else if (centered) {
    a = Math.min(0.5, fractions[0])
    b = Math.max(0.5, fractions[0])
    gapAtA = fractions[0] < 0.5
    gapAtB = fractions[0] > 0.5
  } else {
    a = 0
    b = fractions[0]
    gapAtA = false
    gapAtB = true
  }

  // Ticks sit on the valid values `min + i * step` (#431) — not spread
  // evenly to `max`, which may be off the grid (max 10, step 3 → 0/3/6/9).
  const tickCount = showTicks && step > 0 ? stepIntervals(span, step) : 0
  const ticks =
    tickCount > 0 && tickCount <= 100
      ? Array.from({ length: tickCount + 1 }, (_, i) => (round(min + i * step) - min) / span)
      : []

  const s = SIZES[size]
  const rootStyle = {
    ...style,
    '--_track': `${s.track}px`,
    '--_handle': `${s.handle}px`,
    '--_corner': `${s.corner}px`,
    '--_icon': `${s.icon}px`,
  } as CSSProperties

  return (
    <span
      ref={ref}
      {...rest}
      data-size={size}
      data-orientation={orientation}
      data-range={isRange || undefined}
      data-disabled={disabled || undefined}
      role={isRange ? 'group' : undefined}
      aria-label={isRange ? ariaLabel : undefined}
      aria-labelledby={isRange ? ariaLabelledby : undefined}
      className={clsx(styles.slider, className)}
      style={rootStyle}
    >
      <span className={styles.track} aria-hidden="true">
        {/* Inactive track (full), then the active segment on top with gaps. */}
        <span
          className={styles.inactive}
          data-inside-end={gapAtA || undefined}
          style={mainSeg(0, a, false, gapAtA)}
        />
        {b < 1 && (
          <span
            className={styles.inactive}
            data-inside-start={gapAtB || undefined}
            style={mainSeg(b, 1, gapAtB, false)}
          />
        )}
        <span
          className={styles.active}
          data-inside-start={gapAtA || undefined}
          data-inside-end={gapAtB || undefined}
          style={mainSeg(a, b, gapAtA, gapAtB)}
        />
        {ticks.map((t) => (
          <span
            key={t}
            className={styles.tick}
            data-active={t >= a && t <= b ? true : undefined}
            style={{ '--_p': pos(t) } as CSSProperties}
          />
        ))}
        {!isRange && !centered && fractions[0] < 1 && (
          <span className={styles.stop} />
        )}
        {insetIcon != null && s.icon > 0 && (
          <span className={styles.insetIcon} aria-hidden="true">
            {insetIcon}
          </span>
        )}
      </span>

      {fractions.map((f, i) => (
        <span
          key={i}
          className={styles.thumb}
          aria-hidden="true"
          data-index={i}
          data-pressed={pressed === i || undefined}
          style={{ '--_p': pos(f) } as CSSProperties}
        >
          {/* Focus ring around the handle, shown on the paired input's
              :focus-visible (Compose: inset focus ring around the handle). */}
          <span className={styles.focusRing} />
        </span>
      ))}

      {showValueLabel &&
        fractions.map((f, i) => (
          <span
            key={i}
            className={styles.valueLabel}
            aria-hidden="true"
            style={{ '--_p': pos(f) } as CSSProperties}
          >
            {valueLabelFormat ? valueLabelFormat(clamped[i]) : clamped[i]}
          </span>
        ))}

      {/* Clip box for the inputs' half-thumb overhang + 48dp target (CSS). */}
      <span className={styles.inputs}>
        {values.map((_, i) => (
          <input
            key={i}
            ref={i === 0 ? inputRef : undefined}
            type="range"
            className={styles.input}
            data-index={i}
            min={min}
            max={max}
            step={step}
            value={clamped[i]}
            disabled={disabled}
            aria-label={isRange ? (i === 0 ? rangeStartLabel : rangeEndLabel) : ariaLabel}
            aria-labelledby={isRange ? undefined : ariaLabelledby}
            aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
            aria-valuetext={ariaValueText(valueLabelFormat, clamped[i])}
            onChange={(event) => commit(Number(event.target.value), i, event)}
            onKeyDown={handleKeyDown(i)}
            onPointerDown={() => {
              if (disabled) return
              pressRef.current = { input: i, thumb: null }
              setPressed(i)
            }}
          />
        ))}
      </span>
    </span>
  )
})

/**
 * `aria-valuetext` from `valueLabelFormat` — only when the formatted value is
 * a plain string/number (arbitrary ReactNode markup can't be announced).
 */
function ariaValueText(
  format: ((value: number) => ReactNode) | undefined,
  value: number,
): string | undefined {
  if (!format) return undefined
  const formatted = format(value)
  return typeof formatted === 'string' || typeof formatted === 'number'
    ? String(formatted)
    : undefined
}

/** Build a main-axis segment style from fractions + per-end gaps. */
function mainSeg(
  start: number,
  end: number,
  gapStart: boolean,
  gapEnd: boolean,
): CSSProperties {
  return {
    '--_s': pos(start, gapStart ? GAP : 0),
    '--_e': pos(end, gapEnd ? -GAP : 0),
  } as CSSProperties
}
