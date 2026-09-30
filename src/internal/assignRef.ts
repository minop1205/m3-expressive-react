import type { Ref } from 'react'

/** Assign `value` to a callback or object ref (for merging a forwarded ref
 * with an internal one). */
export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as { current: T | null }).current = value
}
