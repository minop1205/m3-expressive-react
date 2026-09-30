import { useEffect, useRef, useState, type RefObject } from 'react'
import clsx from 'clsx'
import styles from './Ripple.module.css'

export interface RippleProps {
  /** Disable hover/press feedback (e.g. when the control is disabled). */
  disabled?: boolean
  className?: string
  /**
   * The element whose pointer events drive the ripple. Defaults to the
   * Ripple's parent. Set it when the ripple is clipped to a smaller shape
   * inside a larger click target (e.g. a navigation item's active indicator):
   * hover is then picked up over the whole target, and a press outside the
   * shape still starts its ripple at the pointer and sweeps through the shape
   * (Compose offsets the press position into the indicator the same way).
   */
  control?: RefObject<HTMLElement | null>
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
 * a `position: relative` interactive element; it attaches pointer listeners to
 * that parent and paints hover/press feedback using the state-layer opacity
 * tokens. Purely decorative (aria-hidden, pointer-events: none).
 */
export function Ripple({ disabled = false, className, control }: RippleProps) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [ripples, setRipples] = useState<RippleInstance[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    const host = hostRef.current
    const surface = control?.current ?? host?.parentElement
    if (!surface || disabled) return

    const handleEnter = () => setHovered(true)
    const handleLeave = () => setHovered(false)

    const handleDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      // Relative to the painted host (== the parent unless `control` is set).
      const rect = (host ?? surface).getBoundingClientRect()
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
    return () => {
      surface.removeEventListener('pointerenter', handleEnter)
      surface.removeEventListener('pointerleave', handleLeave)
      surface.removeEventListener('pointerdown', handleDown)
    }
  }, [disabled])

  const removeRipple = (id: number) =>
    setRipples((prev) => prev.filter((r) => r.id !== id))

  return (
    <span ref={hostRef} className={clsx(styles.host, className)} aria-hidden="true">
      {!disabled && (
        <span className={clsx(styles.stateLayer, hovered && styles.hovered)} />
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
