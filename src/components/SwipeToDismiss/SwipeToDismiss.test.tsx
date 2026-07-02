import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { SwipeToDismiss } from './SwipeToDismiss'

// jsdom PointerEvents drop clientX; MouseEvent-typed pointer events carry it.
function swipe(el: HTMLElement, from: number, to: number) {
  fireEvent(el, new MouseEvent('pointerdown', { clientX: from, bubbles: true }))
  fireEvent(el, new MouseEvent('pointermove', { clientX: to, bubbles: true }))
  fireEvent(el, new MouseEvent('pointerup', { clientX: to, bubbles: true }))
}

describe('SwipeToDismiss', () => {
  it('renders content and background', () => {
    render(
      <SwipeToDismiss background={<span>bg</span>}>
        <span>content</span>
      </SwipeToDismiss>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.getByText('bg')).toBeInTheDocument()
  })

  it('dismisses to the right past the threshold (startToEnd)', () => {
    const onDismiss = vi.fn()
    render(
      <SwipeToDismiss onDismiss={onDismiss} threshold={56}>
        <span>row</span>
      </SwipeToDismiss>,
    )
    const content = screen.getByText('row').parentElement as HTMLElement
    swipe(content, 0, 80)
    expect(onDismiss).toHaveBeenCalledWith('startToEnd')
  })

  it('does not dismiss below the threshold', () => {
    const onDismiss = vi.fn()
    render(
      <SwipeToDismiss onDismiss={onDismiss}>
        <span>row</span>
      </SwipeToDismiss>,
    )
    const content = screen.getByText('row').parentElement as HTMLElement
    swipe(content, 0, 20)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('respects a disabled direction', () => {
    const onDismiss = vi.fn()
    render(
      <SwipeToDismiss onDismiss={onDismiss} enableEndToStart={false}>
        <span>row</span>
      </SwipeToDismiss>,
    )
    const content = screen.getByText('row').parentElement as HTMLElement
    swipe(content, 100, 0)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <SwipeToDismiss ref={ref}>
        <span>row</span>
      </SwipeToDismiss>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <SwipeToDismiss>
        <span>row</span>
      </SwipeToDismiss>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
