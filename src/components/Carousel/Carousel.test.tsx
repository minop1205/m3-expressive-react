import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { Carousel, CarouselItem } from './Carousel'

function Example() {
  return (
    <Carousel aria-label="Photos">
      <CarouselItem>One</CarouselItem>
      <CarouselItem>Two</CarouselItem>
      <CarouselItem>Three</CarouselItem>
    </Carousel>
  )
}

describe('Carousel', () => {
  it('renders a carousel group with its items', () => {
    render(<Example />)
    const group = screen.getByRole('group', { name: 'Photos' })
    expect(group).toHaveAttribute('aria-roledescription', 'carousel')
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Three')).toBeInTheDocument()
  })

  it('defaults to the multi-browse variant', () => {
    render(<Example />)
    expect(screen.getByRole('group', { name: 'Photos' })).toHaveAttribute(
      'data-variant',
      'multi-browse',
    )
  })

  it('applies the item width / height / spacing via custom properties', () => {
    render(
      <Carousel aria-label="P" itemWidth={300} itemHeight={180} spacing={12}>
        <CarouselItem>One</CarouselItem>
      </Carousel>,
    )
    const group = screen.getByRole('group', { name: 'P' })
    expect(group.style.getPropertyValue('--_item-w')).toBe('300px')
    expect(group.style.getPropertyValue('--_item-h')).toBe('180px')
    expect(group.style.getPropertyValue('--_spacing')).toBe('12px')
  })

  it('supports the hero variant', () => {
    render(
      <Carousel aria-label="P" variant="hero">
        <CarouselItem>One</CarouselItem>
      </Carousel>,
    )
    expect(screen.getByRole('group', { name: 'P' })).toHaveAttribute('data-variant', 'hero')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Carousel ref={ref} aria-label="P">
        <CarouselItem>One</CarouselItem>
      </Carousel>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Example />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
