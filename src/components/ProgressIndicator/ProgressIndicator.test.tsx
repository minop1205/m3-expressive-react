import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import {
  CircularProgressIndicator,
  getAdditionalRotation,
  getIndeterminateRotation,
  getIndeterminateSweep,
} from './CircularProgressIndicator'
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

  it('accepts an arbitrary (configurable) thickness', () => {
    render(<LinearProgressIndicator value={0.5} thickness={12} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('data-thickness', '12')
    expect(bar.style.getPropertyValue('--_thickness')).toBe('12px')
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

  it('renders low progress as a dot with a shrinking gap', () => {
    const { container } = render(<LinearProgressIndicator value={0.005} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.style.getPropertyValue('--_track-start')).toBe(
      'calc(max(0.5%, 4px) + min(0.5%, 4px))',
    )
    expect(container.querySelector('[class*="linearIndicator"]')).toBeInTheDocument()
  })

  it('renders the reduced-motion sweep for indeterminate progress', () => {
    const { container } = render(<LinearProgressIndicator aria-label="Loading" />)
    expect(
      container.querySelector('[class*="linearReducedMotionSegment"]'),
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll('[class*="linearReducedMotionTrack"]'),
    ).toHaveLength(2)
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

    const radius = (40 - 4) / 2
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

  it.each([
    ['flat', 4, 40],
    ['flat', 8, 44],
    ['wavy', 4, 48],
    ['wavy', 8, 52],
  ] as const)(
    'defaults the size for %s %idp to %i',
    (shape, thickness, expected) => {
      render(
        <CircularProgressIndicator
          value={0.5}
          shape={shape}
          thickness={thickness}
        />,
      )
      const svg = screen.getByRole('progressbar')
      expect(svg).toHaveAttribute('width', String(expected))
      expect(svg).toHaveAttribute('viewBox', `0 0 ${expected} ${expected}`)
    },
  )

  it('keeps the stroke in px whatever the size (viewBox = size)', () => {
    const { container } = render(
      <CircularProgressIndicator value={0.45} size={24} />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'viewBox',
      '0 0 24 24',
    )
    const indicator = container.querySelector('circle[class*="circularIndicator"]')
    expect(indicator).toHaveAttribute('stroke-width', '4')
    expect(indicator).toHaveAttribute('r', String((24 - 4) / 2))
  })

  it('keeps the wavy stroke inside the box', () => {
    const { container } = render(
      <CircularProgressIndicator value={0.5} shape="wavy" />,
    )
    const d =
      container.querySelector('path[class*="circularIndicator"]')?.getAttribute('d') ?? ''
    const coords = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
    // stroke half-width (2) must stay within [0, 48]
    expect(Math.min(...coords)).toBeGreaterThanOrEqual(2 - 0.01)
    expect(Math.max(...coords)).toBeLessThanOrEqual(46 + 0.01)
  })

  it('shrinks the track gap at very low progress', () => {
    const { container } = render(<CircularProgressIndicator value={0.01} />)
    const track = container.querySelector('[class*="circularTrack"]')
    // gap = min(sweep, gapSweep) = 0.01
    expect(Number(track?.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      -0.02,
      4,
    )
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

describe('circular indeterminate motion (Compose constants)', () => {
  it('steps the additional rotation by 90° in 300ms, then holds', () => {
    expect(getAdditionalRotation(0)).toBe(0)
    expect(getAdditionalRotation(150)).toBeCloseTo(45)
    expect(getAdditionalRotation(300)).toBe(90)
    expect(getAdditionalRotation(1499)).toBe(90)
    expect(getAdditionalRotation(1800)).toBe(180)
    expect(getAdditionalRotation(5999)).toBe(360)
  })

  it('rotates 1080° per 6000ms cycle on top of the steps', () => {
    expect(getIndeterminateRotation(3000)).toBeCloseTo(540 + 180)
  })

  it('sweeps 0.1 → 0.87 at 3000ms → 0.1 at 6000ms', () => {
    expect(getIndeterminateSweep(0)).toBeCloseTo(0.1)
    expect(getIndeterminateSweep(1500)).toBeCloseTo(0.1 + 0.77 / 2) // linear growth
    expect(getIndeterminateSweep(3000)).toBeCloseTo(0.87)
    expect(getIndeterminateSweep(6000)).toBeCloseTo(0.1)
  })

  it('drives flat and wavy with the same JS driver (no CSS keyframes)', () => {
    const { container } = render(<CircularProgressIndicator aria-label="Loading" />)
    const layer = container.querySelector('[class*="circularLayer"] > g')
    expect(layer?.getAttribute('style')).toMatch(/rotate\(/)
  })
})

describe('non-finite values (#423)', () => {
  it('never renders aria-valuenow="NaN"', () => {
    render(
      <>
        <LinearProgressIndicator value={Number.NaN} aria-label="Linear" />
        <CircularProgressIndicator value={Number.POSITIVE_INFINITY} aria-label="Circular" />
      </>,
    )
    expect(screen.getByRole('progressbar', { name: 'Linear' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('progressbar', { name: 'Circular' })).toHaveAttribute('aria-valuenow', '0')
  })
})

