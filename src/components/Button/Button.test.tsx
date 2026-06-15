import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Button } from './Button'

describe('Button', () => {
  it('renders a button with its label', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant and size data attributes', () => {
    render(
      <Button variant="outlined" size="lg">
        Hi
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-variant', 'outlined')
    expect(btn).toHaveAttribute('data-size', 'lg')
  })

  it('fires onPress when activated', async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()
    render(<Button onPress={onPress}>Go</Button>)
    await user.click(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('activates on keyboard (Enter)', async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()
    render(<Button onPress={onPress}>Go</Button>)
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onPress = vi.fn()
    render(
      <Button disabled onPress={onPress}>
        Nope
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('forwards a ref to the underlying button', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Button>Accessible</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
