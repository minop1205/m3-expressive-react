import { useRef, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useScrollObserver, type ScrollUpdate } from './useScrollObserver'

function Observer({
  target,
  onUpdate,
}: {
  target: React.RefObject<HTMLDivElement | null>
  onUpdate: (u: ScrollUpdate) => void
}) {
  useScrollObserver(target, true, onUpdate)
  return null
}

describe('useScrollObserver', () => {
  it('subscribes to a ref target that mounts after the first effect (#420)', async () => {
    const onUpdate = vi.fn()
    let show: () => void = () => {}
    function Page() {
      const ref = useRef<HTMLDivElement>(null)
      const [mounted, setMounted] = useState(false)
      show = () => setMounted(true)
      return (
        <>
          <Observer target={ref} onUpdate={onUpdate} />
          {mounted && <div ref={ref} data-testid="scroller" />}
        </>
      )
    }
    render(<Page />)
    expect(onUpdate).not.toHaveBeenCalled()
    act(() => show())
    const scroller = screen.getByTestId('scroller')
    // Reports the initial position once the target exists…
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ top: 0 })))
    // …and follows its scrolling.
    Object.defineProperty(scroller, 'scrollTop', { value: 40, configurable: true })
    fireEvent.scroll(scroller)
    await waitFor(() =>
      expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ top: 40, delta: 40 })),
    )
  })

  it('observes a ref target available on mount', async () => {
    const onUpdate = vi.fn()
    function Page() {
      const ref = useRef<HTMLDivElement>(null)
      return (
        <>
          <div ref={ref} data-testid="scroller" />
          <Observer target={ref} onUpdate={onUpdate} />
        </>
      )
    }
    render(<Page />)
    const scroller = screen.getByTestId('scroller')
    Object.defineProperty(scroller, 'scrollTop', { value: 10, configurable: true })
    fireEvent.scroll(scroller)
    await waitFor(() =>
      expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ top: 10, delta: 10 })),
    )
  })
})
