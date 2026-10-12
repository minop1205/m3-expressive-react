'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import styles from './FocusRing.module.css'

export interface FocusRingProps {
  className?: string
}

/**
 * Self-contained MD3 focus ring. Render as a child of a `position: relative`
 * interactive element; it tracks the parent's `:focus-visible` state and shows
 * the animated ring on keyboard focus only. Decorative (aria-hidden).
 */
export function FocusRing({ className }: FocusRingProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const surface = ref.current?.parentElement
    if (!surface) return

    const show = () => {
      // Only show for keyboard/assistive focus, not pointer focus.
      if (surface.matches(':focus-visible')) setVisible(true)
    }
    const hide = () => setVisible(false)

    surface.addEventListener('focus', show)
    surface.addEventListener('blur', hide)
    return () => {
      surface.removeEventListener('focus', show)
      surface.removeEventListener('blur', hide)
    }
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={clsx(styles.ring, styles.fill, visible && styles.visible, className)}
    />
  )
}
