import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { LoadingIndicator } from './LoadingIndicator'

describe('LoadingIndicator', () => {
  it('renders an indeterminate progressbar with a morphing shape', () => {
    const { container } = render(<LoadingIndicator aria-label="Loading" />)
    const bar = screen.getByRole('progressbar', { name: 'Loading' })
    expect(bar).toHaveAttribute('data-indeterminate')
    expect(bar).not.toHaveAttribute('aria-valuenow')
    expect(container.querySelector('path')).toBeInTheDocument()
  })

  it('exposes aria values for the determinate form', () => {
    render(<LoadingIndicator aria-label="Loading" value={0.4} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '1')
    expect(bar).toHaveAttribute('aria-valuenow', '0.4')
    expect(bar).not.toHaveAttribute('data-indeterminate')
  })

  it('rotates the determinate form counter-clockwise by value × 180°', () => {
    const { container } = render(<LoadingIndicator aria-label="Loading" value={0.6} />)
    const g = container.querySelector('g[transform]')
    expect(g?.getAttribute('transform')).toContain('rotate(-108)')
  })

  it('clamps the determinate value', () => {
    render(<LoadingIndicator aria-label="Loading" value={2} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  })

  it('renders the contained variant with a container circle', () => {
    const { container } = render(<LoadingIndicator aria-label="Loading" variant="contained" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-variant', 'contained')
    expect(container.querySelector('circle')).toBeInTheDocument()
  })

  it('applies a custom size', () => {
    render(<LoadingIndicator aria-label="Loading" size={96} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('width', '96')
    expect(bar).toHaveAttribute('height', '96')
  })

  it('forwards a ref', () => {
    const ref = createRef<SVGSVGElement>()
    render(<LoadingIndicator ref={ref} aria-label="Loading" />)
    expect(ref.current).toBeInstanceOf(SVGSVGElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<LoadingIndicator aria-label="Loading" value={0.5} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
