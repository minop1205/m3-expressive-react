const warned = new Set<string>()

/**
 * `console.warn` once per message, in development builds only (bundlers
 * replace `process.env.NODE_ENV`; the library build keeps it, like React).
 */
export function devWarnOnce(message: string): void {
  if (process.env.NODE_ENV === 'production' || warned.has(message)) return
  warned.add(message)
  console.warn(`[m3-expressive-react] ${message}`)
}

/** Test helper: forget which messages were already shown. */
export function resetDevWarnings(): void {
  warned.clear()
}
