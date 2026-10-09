import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { FocusRing } from './FocusRing'
import styles from './FocusRing.module.css'

function Host({ ring = true }: { ring?: boolean }) {
  return (
    <button type="button" style={{ position: 'relative' }}>
      Label
      {ring && <FocusRing />}
    </button>
  )
}

const ring = (container: HTMLElement) =>
  container.querySelector(`.${styles.ring}`) as HTMLElement

/** jsdom's :focus-visible heuristic is sticky across tests — stub it. */
function stubFocusVisible(value: boolean) {
  const original = Element.prototype.matches
  return vi
    .spyOn(Element.prototype, 'matches')
    .mockImplementation(function (this: Element, selector: string) {
      return selector === ':focus-visible' ? value : original.call(this, selector)
    })
}

afterEach(() => vi.restoreAllMocks())

describe('FocusRing', () => {
  it('shows on keyboard focus and hides on blur', () => {
    stubFocusVisible(true)
    const { container } = render(<Host />)
    const button = screen.getByRole('button')
    fireEvent.focus(button)
    expect(ring(container)).toHaveClass(styles.visible)
    fireEvent.blur(button)
    expect(ring(container)).not.toHaveClass(styles.visible)
  })

  it('stays hidden on pointer focus', () => {
    stubFocusVisible(false)
    const { container } = render(<Host />)
    fireEvent.focus(screen.getByRole('button'))
    expect(ring(container)).not.toHaveClass(styles.visible)
  })

  it('picks up keyboard focus that exists before it mounts (#412)', () => {
    stubFocusVisible(true)
    const { container, rerender } = render(<Host ring={false} />)
    screen.getByRole('button').focus()
    rerender(<Host />)
    expect(ring(container)).toHaveClass(styles.visible)
  })

  it('is decorative', async () => {
    const { container } = render(<Host />)
    expect(ring(container)).toHaveAttribute('aria-hidden', 'true')
    expect(await axe(container)).toHaveNoViolations()
  })
})
