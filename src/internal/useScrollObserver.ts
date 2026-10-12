'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Where a scroll-linked component (TopAppBar / Toolbar `scrollBehavior`)
 * reads the scroll position from: a ref to the scroll container, the element
 * itself, or the window. `undefined` / `null` = the window.
 */
export type ScrollTarget = RefObject<HTMLElement | null> | HTMLElement | Window | null

function isWindow(t: unknown): t is Window {
  return t != null && (t as Window).window === t
}

/** Resolves a {@link ScrollTarget} to the element / window to observe. */
export function resolveScrollTarget(
  target: ScrollTarget | undefined,
): HTMLElement | Window | null {
  if (target == null) return typeof window === 'undefined' ? null : window
  if (isWindow(target)) return target
  if ('current' in target) return target.current
  return target
}

export function getScrollTop(t: HTMLElement | Window): number {
  return isWindow(t) ? t.scrollY : t.scrollTop
}

export interface ScrollUpdate {
  /** Current vertical scroll offset of the target (px). */
  top: number
  /** Change since the previous update (px; > 0 = scrolled forward / down). */
  delta: number
  /** Whether the target can scroll further forward (not at the end). */
  canScrollForward: boolean
}

/**
 * Shared scroll source of the `scrollBehavior` props (docs/decisions B25):
 * listens (passively) to the target's `scroll` events, batches them per
 * animation frame and reports the position + delta; `onEnd` fires once the
 * scrolling has been idle for `endDelay` ms (used to settle half-hidden bars,
 * like Compose's `settleAppBar` after a fling). Reports the initial position
 * (delta 0) when enabled.
 */
export function useScrollObserver(
  target: ScrollTarget | undefined,
  enabled: boolean,
  onUpdate: (update: ScrollUpdate) => void,
  onEnd?: () => void,
  endDelay = 150,
): void {
  const onUpdateRef = useRef(onUpdate)
  const onEndRef = useRef(onEnd)
  onUpdateRef.current = onUpdate
  onEndRef.current = onEnd

  useEffect(() => {
    if (!enabled) return
    const source = resolveScrollTarget(target)
    if (!source) return

    const canScrollForward = () => {
      if (isWindow(source)) {
        const doc = source.document.documentElement
        return source.scrollY + source.innerHeight < doc.scrollHeight - 1
      }
      return source.scrollTop + source.clientHeight < source.scrollHeight - 1
    }

    let last = getScrollTop(source)
    let frame = 0
    let endTimer: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      frame = 0
      const top = getScrollTop(source)
      const delta = top - last
      last = top
      onUpdateRef.current({ top, delta, canScrollForward: canScrollForward() })
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(flush)
      if (endTimer !== undefined) clearTimeout(endTimer)
      endTimer = setTimeout(() => {
        endTimer = undefined
        onEndRef.current?.()
      }, endDelay)
    }

    onUpdateRef.current({ top: last, delta: 0, canScrollForward: canScrollForward() })
    source.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      source.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      if (endTimer !== undefined) clearTimeout(endTimer)
    }
  }, [target, enabled, endDelay])
}
