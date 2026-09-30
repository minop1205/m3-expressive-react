import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { Divider } from './Divider'

describe('Divider', () => {
  it('is decorative by default (hidden from assistive technology)', () => {
    render(<Divider data-testid="d" />)
    const el = screen.getByTestId('d')
    expect(el.tagName).toBe('HR')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).not.toHaveAttribute('role')
    expect(el).not.toHaveAttribute('aria-orientation')
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('is decorative by default when vertical', () => {
    render(<Divider data-testid="d" orientation="vertical" />)
    const el = screen.getByTestId('d')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).not.toHaveAttribute('aria-orientation')
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('exposes a horizontal separator when decorative={false}', () => {
    render(<Divider decorative={false} />)
    const el = screen.getByRole('separator')
    expect(el).not.toHaveAttribute('aria-hidden')
    // horizontal is the implicit default — no redundant attribute
    expect(el).not.toHaveAttribute('aria-orientation')
    expect(el).not.toHaveAttribute('role')
  })

  it('exposes a vertical separator when decorative={false}', () => {
    render(<Divider decorative={false} orientation="vertical" />)
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    )
  })

  it('applies full-width variant by default', () => {
    render(<Divider data-testid="d" />)
    expect(screen.getByTestId('d')).toHaveAttribute('data-variant', 'full-width')
  })

  it('applies inset variant', () => {
    render(<Divider data-testid="d" variant="inset" />)
    expect(screen.getByTestId('d')).toHaveAttribute('data-variant', 'inset')
  })

  it('applies middle-inset variant', () => {
    render(<Divider data-testid="d" variant="middle-inset" />)
    expect(screen.getByTestId('d')).toHaveAttribute(
      'data-variant',
      'middle-inset',
    )
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLHRElement>()
    render(<Divider ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLHRElement)
  })

  it('passes through additional props', () => {
    render(<Divider data-testid="my-divider" />)
    expect(screen.getByTestId('my-divider')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<Divider />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (semantic, vertical)', async () => {
    const { container } = render(
      <Divider decorative={false} orientation="vertical" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
