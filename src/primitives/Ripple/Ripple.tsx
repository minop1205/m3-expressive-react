import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import styles from './Ripple.module.css'

export interface RippleProps {
  /** Disable hover/press feedback (e.g. when the control is disabled). */
  disabled?: boolean
  className?: string
}

interface RippleInstance {
  id: number
  x: number
  y: number
  size: number
  leaving: boolean
}

/**
 * Self-contained MD3 state layer + press ripple. Render it as the last child of
 * a `position: relative` interactive element; it attaches pointer and focus
 * listeners to that parent and paints hover / keyboard-focus / press feedback
 * using the state-layer opacity tokens (hover 0.08, focus 0.10, pressed 0.10).
 * The focus layer follows the parent's `:focus-visible` — the same trigger as
 * `FocusRing`, so both appear together on keyboard focus only. Purely
 * decorative (aria-hidden, pointer-events: none).
 */
export function Ripple({ disabled = false, className }: RippleProps) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [ripples, setRipples] = useState<RippleInstance[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    const host = hostRef.current
    const surface = host?.parentElement
    if (!surface || disabled) return

    const handleEnter = () => setHovered(true)
    const handleLeave = () => setHovered(false)
    // Keyboard / assistive focus only (same rule as FocusRing): pointer focus
    // already shows the hover + press feedback.
    const handleFocus = () => {
      if (surface.matches(':focus-visible')) setFocused(true)
    }
    const handleBlur = () => setFocused(false)
    // The listeners attach after mount, so pick up a focus that is already
    // there (e.g. autoFocus, or re-enabling a focused control).
    if (surface.matches(':focus-visible')) setFocused(true)

    const handleDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const rect = surface.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      // Radius reaches the farthest corner so the ripple always fills the bounds.
      const radius = Math.hypot(
        Math.max(x, rect.width - x),
        Math.max(y, rect.height - y),
      )
      const id = idRef.current++
      setRipples((prev) => [...prev, { id, x, y, size: radius * 2, leaving: false }])

      const release = () => {
        setRipples((prev) =>
          prev.map((r) => (r.id === id ? { ...r, leaving: true } : r)),
        )
        window.removeEventListener('pointerup', release)
        window.removeEventListener('pointercancel', release)
      }
      window.addEventListener('pointerup', release)
      window.addEventListener('pointercancel', release)
    }

    surface.addEventListener('pointerenter', handleEnter)
    surface.addEventListener('pointerleave', handleLeave)
    surface.addEventListener('pointerdown', handleDown)
    surface.addEventListener('focus', handleFocus)
    surface.addEventListener('blur', handleBlur)
    return () => {
      setFocused(false)
      surface.removeEventListener('pointerenter', handleEnter)
      surface.removeEventListener('pointerleave', handleLeave)
      surface.removeEventListener('pointerdown', handleDown)
      surface.removeEventListener('focus', handleFocus)
      surface.removeEventListener('blur', handleBlur)
    }
  }, [disabled])

  const removeRipple = (id: number) =>
    setRipples((prev) => prev.filter((r) => r.id !== id))

  return (
    <span ref={hostRef} className={clsx(styles.host, className)} aria-hidden="true">
      {!disabled && (
        <span
          className={clsx(
            styles.stateLayer,
            hovered && styles.hovered,
            focused && styles.focused,
          )}
        />
      )}
      {ripples.map((r) => (
        <span
          key={r.id}
          className={clsx(
            styles.ripple,
            r.leaving ? styles.rippleLeaving : styles.rippleEntering,
          )}
          style={{
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
          }}
          onAnimationEnd={() => {
            if (r.leaving) removeRipple(r.id)
          }}
        />
      ))}
    </span>
  )
}
