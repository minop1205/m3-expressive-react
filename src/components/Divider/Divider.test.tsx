import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { Divider } from './Divider'

describe('Divider', () => {
  it('renders a horizontal separator by default', () => {
    render(<Divider />)
    const el = screen.getByRole('separator')
    expect(el).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('renders a vertical separator', () => {
    render(<Divider orientation="vertical" />)
    const el = screen.getByRole('separator')
    expect(el).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('applies full-width variant by default', () => {
    render(<Divider />)
    expect(screen.getByRole('separator')).toHaveAttribute(
      'data-variant',
      'full-width',
    )
  })

  it('applies inset variant', () => {
    render(<Divider variant="inset" />)
    expect(screen.getByRole('separator')).toHaveAttribute(
      'data-variant',
      'inset',
    )
  })

  it('applies middle-inset variant', () => {
    render(<Divider variant="middle-inset" />)
    expect(screen.getByRole('separator')).toHaveAttribute(
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

  it('has no axe violations (vertical)', async () => {
    const { container } = render(<Divider orientation="vertical" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
