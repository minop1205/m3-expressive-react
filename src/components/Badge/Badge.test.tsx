import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { Badge } from './Badge'

const Icon = (
  <svg viewBox="0 0 24 24" aria-label="mail">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
)

describe('Badge', () => {
  it('renders a large badge with a value', () => {
    render(<Badge value={3}>{Icon}</Badge>)
    expect(screen.getByRole('status')).toHaveTextContent('3')
  })

  it('renders a small dot badge without text', () => {
    render(<Badge size="small">{Icon}</Badge>)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('')
  })

  it('clamps value to max and appends +', () => {
    render(<Badge value={1000} max={999}>{Icon}</Badge>)
    expect(screen.getByRole('status')).toHaveTextContent('999+')
  })

  it('supports custom max', () => {
    render(<Badge value={100} max={99}>{Icon}</Badge>)
    expect(screen.getByRole('status')).toHaveTextContent('99+')
  })

  it('does not render badge when value is undefined and size is large', () => {
    render(<Badge>{Icon}</Badge>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders small badge regardless of value', () => {
    render(<Badge size="small">{Icon}</Badge>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows value 0', () => {
    render(<Badge value={0}>{Icon}</Badge>)
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })

  it('provides aria-label for large badge', () => {
    render(<Badge value={5}>{Icon}</Badge>)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      '5 notifications',
    )
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Badge ref={ref} value={1}>{Icon}</Badge>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('passes through additional props', () => {
    render(
      <Badge value={1} data-testid="badge-anchor">
        {Icon}
      </Badge>,
    )
    expect(screen.getByTestId('badge-anchor')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<Badge value={3}>{Icon}</Badge>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('hides badge when visible is false', () => {
    render(<Badge value={3} visible={false}>{Icon}</Badge>)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).not.toHaveClass(/visible/)
  })

  it('shows badge by default (visible=true)', () => {
    render(<Badge value={3}>{Icon}</Badge>)
    const badge = screen.getByRole('status')
    expect(badge.className).toMatch(/visible/)
  })

  it('has no axe violations (small)', async () => {
    const { container } = render(<Badge size="small">{Icon}</Badge>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
