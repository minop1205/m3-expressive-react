import { useCallback, useEffect, useRef, type RefObject } from 'react'

type FormControl = HTMLInputElement | HTMLTextAreaElement

/**
 * Run `onReset` when the control's form fires `reset` (`form.reset()` or a
 * `<button type="reset">`), so uncontrolled components can restore their
 * React state to the default the browser is about to restore natively.
 *
 * The form is resolved through the control's `form` IDL property, so the
 * `form="id"` attribute (a control outside its `<form>`) is honoured. It is
 * re-resolved after every commit — cheap, and it follows a changed `form`
 * attribute or a re-parented control — and the listener is removed on
 * unmount.
 *
 * The `reset` event fires BEFORE the browser resets the controls, which is
 * why callbacks read the defaults (`defaultChecked` / `defaultValue`) rather
 * than the current values.
 */
export function useFormReset(
  controlRef: RefObject<FormControl | null>,
  onReset: () => void,
): void {
  const onResetRef = useRef(onReset)
  useEffect(() => {
    onResetRef.current = onReset
  })

  const handleReset = useCallback(() => onResetRef.current(), [])
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    const form = controlRef.current?.form ?? null
    if (form === formRef.current) return
    formRef.current?.removeEventListener('reset', handleReset)
    form?.addEventListener('reset', handleReset)
    formRef.current = form
  })

  useEffect(
    () => () => {
      formRef.current?.removeEventListener('reset', handleReset)
      formRef.current = null
    },
    [handleReset],
  )
}

/**
 * Re-assign a checkable input's checkedness through its `checked` setter.
 *
 * A native reset changes checkedness without going through the property
 * setter, so React's internal value tracker keeps the pre-reset value and
 * swallows the next click that lands on it (no `onChange`). Assigning the
 * same value the reset will restore keeps the tracker in sync.
 */
export function syncCheckedToDefault(input: HTMLInputElement): void {
  input.checked = input.defaultChecked
}
