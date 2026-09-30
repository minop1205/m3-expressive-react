import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { IconButton } from '../IconButton'
import { Toolbar } from './Toolbar'

const icon = <span aria-hidden="true">★</span>

describe('Toolbar', () => {
  it('renders a toolbar with its slots', () => {
    render(
      <Toolbar>
        <IconButton icon={icon} aria-label="Star" />
      </Toolbar>,
    )
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Star' })).toBeInTheDocument()
  })

  it('defaults to the docked variant / standard color', () => {
    render(<Toolbar aria-label="Actions" />)
    const bar = screen.getByRole('toolbar')
    expect(bar).toHaveAttribute('data-variant', 'docked')
    expect(bar).toHaveAttribute('data-color', 'standard')
  })

  it('exposes orientation for floating toolbars', () => {
    render(<Toolbar variant="floating" orientation="vertical" aria-label="v" />)
    const bar = screen.getByRole('toolbar')
    expect(bar).toHaveAttribute('data-orientation', 'vertical')
    expect(bar).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('supports the vibrant color scheme', () => {
    render(<Toolbar color="vibrant" aria-label="v" />)
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-color', 'vibrant')
  })

  // Item layout (48dp slots, docked gap counted with `:has(> :nth-child(n))`)
  // and the color-scheme contract require items to be direct children.
  it('renders items as direct children of the toolbar', () => {
    render(
      <Toolbar color="vibrant" aria-label="Actions">
        <IconButton icon={icon} aria-label="A" variant="standard" />
        <IconButton icon={icon} aria-label="B" variant="standard" toggle defaultSelected />
      </Toolbar>,
    )
    const bar = screen.getByRole('toolbar')
    expect(screen.getByRole('button', { name: 'A' }).parentElement).toBe(bar)
    const b = screen.getByRole('button', { name: 'B' })
    expect(b.parentElement).toBe(bar)
    expect(b).toHaveAttribute('data-variant', 'standard')
    expect(b).toHaveAttribute('data-selected', 'true')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Toolbar ref={ref} aria-label="t" />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <Toolbar aria-label="Actions">
        <IconButton icon={icon} aria-label="Star" />
      </Toolbar>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
