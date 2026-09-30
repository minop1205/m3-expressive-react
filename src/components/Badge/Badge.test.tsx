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

/** The badge <span> (last child of the anchor). */
function getBadge(anchor: HTMLElement) {
  return anchor.lastElementChild as HTMLElement
}

describe('Badge', () => {
  it('renders a large badge with a value', () => {
    render(
      <Badge data-testid="a" value={3}>
        {Icon}
      </Badge>,
    )
    const badge = getBadge(screen.getByTestId('a'))
    expect(badge).toHaveAttribute('data-size', 'large')
    expect(badge.querySelector('[aria-hidden="true"]')).toHaveTextContent('3')
  })

  it('renders a small dot badge without visible text', () => {
    render(
      <Badge data-testid="a" size="small">
        {Icon}
      </Badge>,
    )
    const badge = getBadge(screen.getByTestId('a'))
    expect(badge).toHaveAttribute('data-size', 'small')
    expect(badge.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('clamps value to max and appends +', () => {
    render(<Badge value={1000} max={999}>{Icon}</Badge>)
    expect(screen.getByText('999+')).toBeInTheDocument()
    expect(screen.getByText('999+ new notifications')).toBeInTheDocument()
  })

  it('supports custom max', () => {
    render(<Badge value={100} max={99}>{Icon}</Badge>)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('does not render badge when value is undefined and size is large', () => {
    render(<Badge data-testid="a">{Icon}</Badge>)
    expect(screen.getByTestId('a').children).toHaveLength(1)
    expect(screen.queryByText(/notification/)).not.toBeInTheDocument()
  })

  it('shows value 0', () => {
    render(<Badge value={0}>{Icon}</Badge>)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0 new notifications')).toBeInTheDocument()
  })

  // --- Accessible label (#265) ------------------------------------------
  it('announces "New notification" for a dot by default', () => {
    render(<Badge size="small">{Icon}</Badge>)
    expect(screen.getByText('New notification')).toBeInTheDocument()
  })

  it('announces "{n} new notifications" for a count by default', () => {
    render(<Badge value={5}>{Icon}</Badge>)
    expect(screen.getByText('5 new notifications')).toBeInTheDocument()
  })

  it('uses the singular for a count of 1', () => {
    render(<Badge value={1}>{Icon}</Badge>)
    expect(screen.getByText('1 new notification')).toBeInTheDocument()
  })

  it('hides the visible digits from assistive technology', () => {
    render(<Badge value={5}>{Icon}</Badge>)
    expect(screen.getByText('5')).toHaveAttribute('aria-hidden', 'true')
  })

  it('overrides the label with `label`', () => {
    render(
      <Badge value={8} label="8 nouvelles notifications">
        {Icon}
      </Badge>,
    )
    expect(screen.getByText('8 nouvelles notifications')).toBeInTheDocument()
    expect(screen.queryByText(/new notification/)).not.toBeInTheDocument()
  })

  it('overrides the dot label with `label`', () => {
    render(
      <Badge size="small" label="Nouvelle notification">
        {Icon}
      </Badge>,
    )
    expect(screen.getByText('Nouvelle notification')).toBeInTheDocument()
  })

  it('is not a live region', () => {
    render(<Badge value={3}>{Icon}</Badge>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(document.querySelector('[aria-live]')).toBeNull()
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

  it('hides the badge (visually and from AT) when visible is false', () => {
    render(
      <Badge data-testid="a" value={3} visible={false}>
        {Icon}
      </Badge>,
    )
    const badge = getBadge(screen.getByTestId('a'))
    expect(badge).not.toHaveClass(/visible/)
    expect(badge).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows badge by default (visible=true)', () => {
    render(
      <Badge data-testid="a" value={3}>
        {Icon}
      </Badge>,
    )
    const badge = getBadge(screen.getByTestId('a'))
    expect(badge.className).toMatch(/visible/)
    expect(badge).not.toHaveAttribute('aria-hidden')
  })

  it('has no axe violations (small)', async () => {
    const { container } = render(<Badge size="small">{Icon}</Badge>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
