import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { CircularProgressIndicator } from './CircularProgressIndicator'
import { LinearProgressIndicator } from './LinearProgressIndicator'

describe('LinearProgressIndicator', () => {
  it('renders a progressbar', () => {
    render(<LinearProgressIndicator value={0.5} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('sets aria values for determinate progress', () => {
    render(<LinearProgressIndicator value={0.7} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '1')
    expect(progressbar).toHaveAttribute('aria-valuenow', '0.7')
  })

  it('omits value aria attributes for indeterminate progress', () => {
    render(<LinearProgressIndicator />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('data-indeterminate')
    expect(progressbar).not.toHaveAttribute('aria-valuemin')
    expect(progressbar).not.toHaveAttribute('aria-valuemax')
    expect(progressbar).not.toHaveAttribute('aria-valuenow')
  })

  it('clamps value to the supported range', () => {
    render(<LinearProgressIndicator value={1.5} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '1',
    )
  })

  it('renders the determinate stop indicator until progress is complete', () => {
    const { container, rerender } = render(<LinearProgressIndicator value={0.5} />)
    expect(container.querySelector('[class*="linearStop"]')).toBeInTheDocument()

    rerender(<LinearProgressIndicator value={1} />)
    expect(container.querySelector('[class*="linearStop"]')).not.toBeInTheDocument()
  })

  it('applies thickness', () => {
    render(<LinearProgressIndicator value={0.5} thickness={8} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'data-thickness',
      '8',
    )
  })

  it('renders a wavy determinate indicator', () => {
    const { container } = render(
      <LinearProgressIndicator value={0.3} shape="wavy" />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'data-shape',
      'wavy',
    )
    expect(container.querySelector('[class*="linearWavyPath"]')).toBeInTheDocument()
  })

  it('renders a wavy indeterminate indicator', () => {
    const { container } = render(
      <LinearProgressIndicator shape="wavy" aria-label="Loading" />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'data-shape',
      'wavy',
    )
    expect(container.querySelector('[class*="linearWavySvg"]')).toBeInTheDocument()
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<LinearProgressIndicator ref={ref} value={0} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <LinearProgressIndicator value={0.5} aria-label="Loading" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations when indeterminate', async () => {
    const { container } = render(
      <LinearProgressIndicator aria-label="Loading" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('CircularProgressIndicator', () => {
  it('renders a progressbar', () => {
    render(<CircularProgressIndicator value={0.5} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('sets aria values for determinate progress', () => {
    render(<CircularProgressIndicator value={0.3} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '1')
    expect(progressbar).toHaveAttribute('aria-valuenow', '0.3')
  })

  it('omits value aria attributes for indeterminate progress', () => {
    render(<CircularProgressIndicator />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('data-indeterminate')
    expect(progressbar).not.toHaveAttribute('aria-valuemin')
    expect(progressbar).not.toHaveAttribute('aria-valuemax')
    expect(progressbar).not.toHaveAttribute('aria-valuenow')
  })

  it('applies custom size', () => {
    render(<CircularProgressIndicator value={0} size={24} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('width', '24')
    expect(progressbar).toHaveAttribute('height', '24')
  })

  it('renders the determinate track as a gapped arc', () => {
    const { container } = render(<CircularProgressIndicator value={0.5} />)
    const track = container.querySelector('[class*="circularTrack"]')
    expect(track).toHaveAttribute('stroke-dasharray')
    expect(track).toHaveAttribute('stroke-dashoffset')

    const radius = (48 - 4) / 2
    const circumference = 2 * Math.PI * radius
    const gap = (4 + 4) / circumference
    const [trackLength] = track
      ?.getAttribute('stroke-dasharray')
      ?.split(' ')
      .map(Number) ?? [0]

    expect(trackLength).toBeCloseTo(1 - 0.5 - gap * 2, 4)
    expect(Number(track?.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      -(0.5 + gap),
      4,
    )
  })

  it('renders a wavy determinate indicator', () => {
    const { container } = render(
      <CircularProgressIndicator value={0.5} shape="wavy" />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'data-shape',
      'wavy',
    )
    expect(container.querySelector('path[class*="circularIndicator"]')).toBeInTheDocument()
  })

  it('hides the determinate track when there is no remaining arc after gaps', () => {
    const { container } = render(<CircularProgressIndicator value={1} />)
    expect(
      container.querySelector('[class*="circularTrack"]'),
    ).not.toBeInTheDocument()
  })

  it('clamps value to the supported range', () => {
    render(<CircularProgressIndicator value={-1} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  it('forwards ref', () => {
    const ref = createRef<SVGSVGElement>()
    render(<CircularProgressIndicator ref={ref} value={0} />)
    expect(ref.current).toBeInstanceOf(SVGSVGElement)
  })

  it('restarts indeterminate animation when thickness changes', () => {
    const { container, rerender } = render(
      <CircularProgressIndicator aria-label="Loading" thickness={4} />,
    )
    const layer = container.querySelector('[class*="circularLayer"]')

    rerender(<CircularProgressIndicator aria-label="Loading" thickness={8} />)

    expect(container.querySelector('[class*="circularLayer"]')).not.toBe(layer)
  })

  it('renders a wavy indeterminate indicator', () => {
    const { container } = render(
      <CircularProgressIndicator shape="wavy" aria-label="Loading" />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'data-shape',
      'wavy',
    )
    expect(container.querySelector('[class*="circularWavyTrack"]')).toBeInTheDocument()
    expect(container.querySelector('path[class*="circularIndicator"]')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <CircularProgressIndicator value={0.5} aria-label="Loading" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations when indeterminate', async () => {
    const { container } = render(
      <CircularProgressIndicator aria-label="Loading" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
