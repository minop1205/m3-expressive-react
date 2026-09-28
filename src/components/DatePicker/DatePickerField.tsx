import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
} from 'react'
import clsx from 'clsx'
import { TextField } from '../TextField'
import { DatePicker } from './DatePicker'
import { CalendarIcon } from '../../internal/icons'
import styles from './DatePickerField.module.css'

export interface DatePickerFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled selected date. */
  value?: Date | null
  /** Uncontrolled initial date. */
  defaultValue?: Date | null
  /** Fires with the newly selected/parsed date (or null when cleared). */
  onChange?: (date: Date | null) => void
  /** Field label. @default 'Date' */
  label?: string
  /** Earliest selectable date. */
  min?: Date
  /** Latest selectable date. */
  max?: Date
  /** BCP-47 locale. @default 'en-US' */
  locale?: string
  disabled?: boolean
  className?: string
}


function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Material Design 3 Docked date picker.
 *
 * An outlined text field (type a date directly) with a trailing calendar button
 * that opens the `DatePicker` in a dropdown — the docked / input variant per
 * m3.material.io. Closes on selection, outside click, or Escape.
 */
export const DatePickerField = forwardRef<HTMLDivElement, DatePickerFieldProps>(
  function DatePickerField(
    { value, defaultValue, onChange, label = 'Date', min, max, locale = 'en-US', disabled, className, ...rest },
    ref,
  ) {
    const isControlled = value !== undefined
    const [internal, setInternal] = useState<Date | null>(defaultValue ?? null)
    const current = isControlled ? value ?? null : internal
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement | null>(null)

    const fmt = (d: Date) =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
    const [text, setText] = useState(current ? fmt(current) : '')

    const currentTime = current ? current.getTime() : null
    useEffect(() => {
      setText(current ? fmt(current) : '')
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTime])

    useEffect(() => {
      if (!open) return
      const onDown = (e: globalThis.MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
      }
      const onKey = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false)
      }
      document.addEventListener('mousedown', onDown)
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('mousedown', onDown)
        document.removeEventListener('keydown', onKey)
      }
    }, [open])

    const commit = (d: Date | null) => {
      if (!isControlled) setInternal(d)
      onChange?.(d)
    }

    const setRefs = (el: HTMLDivElement | null) => {
      wrapRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    }

    const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value
      setText(next)
      if (next.trim() === '') {
        commit(null)
        return
      }
      const parsed = new Date(next)
      if (!Number.isNaN(parsed.getTime())) commit(startOfDay(parsed))
    }

    return (
      <div {...rest} ref={setRefs} className={clsx(styles.field, className)}>
        <TextField
          variant="outlined"
          label={label}
          value={text}
          disabled={disabled}
          onChange={handleInput}
          endIcon={
            <button
              type="button"
              className={styles.toggle}
              aria-label="Open calendar"
              aria-expanded={open}
              disabled={disabled}
              onClick={() => setOpen((o) => !o)}
            >
              <CalendarIcon />
            </button>
          }
        />
        <div className={styles.dropdown} data-open={open || undefined}>
          <DatePicker
            value={current}
            min={min}
            max={max}
            locale={locale}
            onChange={(d) => {
              commit(d as Date)
              setOpen(false)
            }}
          />
        </div>
      </div>
    )
  },
)
