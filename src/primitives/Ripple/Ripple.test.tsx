import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Ripple } from './Ripple'
import styles from './Ripple.module.css'

function Host({ disabled = false }: { disabled?: boolean }) {
  return (
    <button type="button" style={{ position: 'relative' }}>
      Label
      <Ripple disabled={disabled} />
    </button>
  )
}

function stateLayer(container: HTMLElement) {
  return container.querySelector(`.${styles.stateLayer}`) as HTMLElement
}

// jsdom's :focus-visible heuristic keeps state across tests in one document,
// so the keyboard-focus assertions all live in the first test.
describe('Ripple focus state layer (#194)', () => {
  it('shows the focus layer on keyboard focus and hides it on blur', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <>
        <Host />
        <button type="button">Next</button>
      </>,
    )
    const layer = stateLayer(container)
    expect(layer).not.toHaveClass(styles.focused)

    await user.tab()
    const host = screen.getByRole('button', { name: 'Label' })
    expect(host).toHaveFocus()
    expect(layer).toHaveClass(styles.focused)

    // Hover + focus stay ONE layer (the later .focused rule wins → 0.10),
    // never a second stacked overlay.
    fireEvent.pointerEnter(host)
    expect(layer).toHaveClass(styles.hovered)
    expect(layer).toHaveClass(styles.focused)
    expect(container.querySelectorAll(`.${styles.stateLayer}`)).toHaveLength(1)
    fireEvent.pointerLeave(host)

    await user.tab()
    expect(layer).not.toHaveClass(styles.focused)
  })

  it('does not show the focus layer on pointer focus', async () => {
    const user = userEvent.setup()
    const { container } = render(<Host />)
    await user.click(screen.getByRole('button', { name: 'Label' }))
    expect(screen.getByRole('button', { name: 'Label' })).toHaveFocus()
    expect(stateLayer(container)).not.toHaveClass(styles.focused)
  })

  it('renders no state layer when disabled', async () => {
    const { container } = render(<Host disabled />)
    expect(stateLayer(container)).toBeNull()
  })
})

describe('Ripple dragged / nested presses', () => {
  it('paints the dragged layer, even when disabled, without hover', () => {
    const { container } = render(
      <div style={{ position: 'relative' }}>
        <Ripple disabled dragged />
      </div>,
    )
    const layer = stateLayer(container)
    expect(layer).toHaveClass(styles.dragged)
    fireEvent.pointerEnter(container.firstChild as HTMLElement)
    expect(layer).not.toHaveClass(styles.hovered)
  })

  it('ignoreNestedPress skips presses that start on a nested control', () => {
    const { container } = render(
      <div role="group" style={{ position: 'relative' }}>
        <button type="button">Nested</button>
        <span>Text</span>
        <Ripple ignoreNestedPress />
      </div>,
    )
    const count = () => container.querySelectorAll(`.${styles.ripple}`).length
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Nested' }), { button: 0 })
    expect(count()).toBe(0)
    fireEvent.pointerDown(screen.getByText('Text'), { button: 0 })
    expect(count()).toBe(1)
  })
})
