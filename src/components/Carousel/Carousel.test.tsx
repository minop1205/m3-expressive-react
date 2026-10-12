import { createRef, useEffect, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function Interactive({ onClick = () => {} }: { onClick?: (i: number) => void }) {
  return (
    <Carousel aria-label="Albums">
      {['One', 'Two', 'Three', 'Four'].map((t, i) => (
        <CarouselItem key={t} onClick={() => onClick(i)} disabled={i === 2}>
          {t}
        </CarouselItem>
      ))}
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

  it('has no axe violations with interactive items', async () => {
    const { container } = render(<Interactive />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Carousel layout modes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the keyline layout for multi-browse / hero and free flow for uncontained', () => {
    const { rerender } = render(<Example />)
    expect(screen.getByRole('group', { name: 'Photos' })).toHaveAttribute('data-mode', 'keylines')
    rerender(
      <Carousel aria-label="Photos" variant="uncontained">
        <CarouselItem>One</CarouselItem>
      </Carousel>,
    )
    expect(screen.getByRole('group', { name: 'Photos' })).toHaveAttribute('data-mode', 'flow')
  })

  it('keeps every item the same size under prefers-reduced-motion (#246)', () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
    render(<Example />)
    expect(screen.getByRole('group', { name: 'Photos' })).toHaveAttribute('data-mode', 'uniform')
  })
})

describe('CarouselItem slide semantics (#249)', () => {
  it('labels non-interactive items as slides with their position', () => {
    render(<Example />)
    const slides = screen.getAllByRole('group', { name: /of 3$/ })
    expect(slides).toHaveLength(3)
    expect(slides[1]).toHaveAttribute('aria-roledescription', 'slide')
    expect(slides[1]).toHaveAccessibleName('2 of 3')
  })

  it('accepts a localized position label', () => {
    render(
      <Carousel aria-label="写真" getItemLabel={(p, c) => `${c} 枚中 ${p} 枚目`}>
        <CarouselItem>One</CarouselItem>
        <CarouselItem>Two</CarouselItem>
      </Carousel>,
    )
    expect(screen.getByRole('group', { name: '2 枚中 2 枚目' })).toHaveTextContent('Two')
  })

  it('accepts localized role descriptions for the carousel and its slides', () => {
    render(
      <Carousel
        aria-label="写真"
        roleDescriptionLabel="カルーセル"
        itemRoleDescriptionLabel="スライド"
      >
        <CarouselItem>One</CarouselItem>
      </Carousel>,
    )
    expect(screen.getByRole('group', { name: '写真' })).toHaveAttribute(
      'aria-roledescription',
      'カルーセル',
    )
    expect(screen.getByRole('group', { name: '1 of 1' })).toHaveAttribute(
      'aria-roledescription',
      'スライド',
    )
  })

  it('lets an explicit aria-label name the slide', () => {
    render(
      <Carousel aria-label="Photos">
        <CarouselItem aria-label="Sunset">One</CarouselItem>
      </Carousel>,
    )
    expect(screen.getByRole('group', { name: 'Sunset' })).toHaveAttribute(
      'aria-roledescription',
      'slide',
    )
  })

  it('recomputes positions when items change', () => {
    const { rerender } = render(
      <Carousel aria-label="P">
        <CarouselItem>A</CarouselItem>
        <CarouselItem>B</CarouselItem>
      </Carousel>,
    )
    rerender(
      <Carousel aria-label="P">
        <CarouselItem key="c">C</CarouselItem>
        <CarouselItem key="b">B</CarouselItem>
        <CarouselItem key="a">A</CarouselItem>
      </Carousel>,
    )
    expect(screen.getByText('A').closest('[aria-roledescription="slide"]')).toHaveAccessibleName(
      '3 of 3',
    )
  })

  it('describes interactive items by position without a wrapping group', () => {
    render(<Interactive />)
    const two = screen.getByRole('button', { name: 'Two' })
    expect(two).toHaveAccessibleDescription('2 of 4')
    // Only the carousel itself is a group — no slide group around the button.
    expect(screen.getAllByRole('group')).toHaveLength(1)
  })
})

describe('CarouselItem interaction (#247)', () => {
  it('renders onClick items as buttons activated by click, Enter and Space', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Interactive onClick={onClick} />)
    const one = screen.getByRole('button', { name: 'One' })
    expect(one.tagName).toBe('BUTTON')
    await user.click(one)
    one.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick.mock.calls.map((c) => c[0])).toEqual([0, 0, 0])
  })

  it('renders href items as links', () => {
    render(
      <Carousel aria-label="P">
        <CarouselItem href="/album/1">Album</CarouselItem>
      </Carousel>,
    )
    const link = screen.getByRole('link', { name: 'Album' })
    expect(link).toHaveAttribute('href', '/album/1')
    expect(link).toHaveAccessibleDescription('1 of 1')
  })

  it('disables an interactive item', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<Interactive onClick={onClick} />)
    const three = screen.getByRole('button', { name: 'Three' })
    expect(three).toBeDisabled()
    await user.click(three)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards the ref to the item element', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Carousel aria-label="P">
        <CarouselItem ref={ref} onClick={() => {}}>
          One
        </CarouselItem>
      </Carousel>,
    )
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('keeps the container focusable only when no item is (scrollable-region-focusable)', () => {
    const { unmount } = render(<Example />)
    expect(screen.getByRole('group', { name: 'Photos' })).toHaveAttribute('tabindex', '0')
    unmount()
    render(<Interactive />)
    expect(screen.getByRole('group', { name: 'Albums' })).not.toHaveAttribute('tabindex')
  })

  it('re-evaluates container focusability when item content changes (#416)', async () => {
    function Toggle() {
      const [on, setOn] = useState(false)
      useEffect(() => {
        const t = window.setTimeout(() => setOn(true), 0)
        return () => window.clearTimeout(t)
      }, [])
      return on ? <button type="button">Play</button> : <span>Paused</span>
    }
    render(
      <Carousel aria-label="Media">
        <CarouselItem>
          <Toggle />
        </CarouselItem>
      </Carousel>,
    )
    const carousel = screen.getByRole('group', { name: 'Media' })
    expect(carousel).toHaveAttribute('tabindex', '0')
    await screen.findByRole('button', { name: 'Play' })
    await waitFor(() => expect(carousel).not.toHaveAttribute('tabindex'))
  })

  it('places initial Tab focus on the first item', async () => {
    const user = userEvent.setup()
    render(<Interactive />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
  })
})

describe('Carousel keyboard navigation (#248)', () => {
  it('moves between items with Left / Right, skipping disabled items', async () => {
    const user = userEvent.setup()
    render(<Interactive />)
    screen.getByRole('button', { name: 'One' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Four' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Four' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
  })

  it('does not intercept Up / Down', () => {
    render(<Interactive />)
    const one = screen.getByRole('button', { name: 'One' })
    one.focus()
    expect(fireEvent.keyDown(one, { key: 'ArrowDown' })).toBe(true)
    expect(one).toHaveFocus()
  })

  it('never intercepts keys from content nested inside an item', () => {
    render(
      <Carousel aria-label="P">
        <CarouselItem>
          <input aria-label="Caption" />
        </CarouselItem>
        <CarouselItem onClick={() => {}}>Two</CarouselItem>
      </Carousel>,
    )
    const input = screen.getByRole('textbox', { name: 'Caption' })
    input.focus()
    expect(fireEvent.keyDown(input, { key: 'ArrowRight' })).toBe(true)
    expect(input).toHaveFocus()
  })

  it('leaves the event to a consumer that handled it', () => {
    render(
      <Carousel aria-label="P" onKeyDown={(e) => e.preventDefault()}>
        <CarouselItem onClick={() => {}}>One</CarouselItem>
        <CarouselItem onClick={() => {}}>Two</CarouselItem>
      </Carousel>,
    )
    const one = screen.getByRole('button', { name: 'One' })
    one.focus()
    fireEvent.keyDown(one, { key: 'ArrowRight' })
    expect(one).toHaveFocus()
  })
})

describe('Carousel mouse drag (#374)', () => {
  // jsdom has no layout: give carousels a scrollable range.
  const restore: (() => void)[] = []
  const stub = (prop: 'scrollWidth' | 'clientWidth', value: number) => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get(this: HTMLElement) {
        return this.hasAttribute('data-carousel') ? value : (original?.get?.call(this) ?? 0)
      },
    })
    restore.push(() => {
      if (original) Object.defineProperty(HTMLElement.prototype, prop, original)
    })
  }
  afterEach(() => {
    restore.splice(0).forEach((r) => r())
  })

  const setup = (onClick = vi.fn()) => {
    stub('scrollWidth', 1200)
    stub('clientWidth', 400)
    render(
      <Carousel aria-label="Albums">
        <CarouselItem onClick={onClick}>One</CarouselItem>
        <CarouselItem onClick={onClick}>Two</CarouselItem>
        <CarouselItem>
          <input aria-label="Caption" />
        </CarouselItem>
      </Carousel>,
    )
    return { carousel: screen.getByRole('group', { name: 'Albums' }), onClick }
  }

  const press = (el: Element, x: number, pointerType = 'mouse') =>
    fireEvent.pointerDown(el, { pointerId: 1, pointerType, button: 0, clientX: x, clientY: 10 })
  const move = (x: number, buttons = 1) =>
    fireEvent.pointerMove(document.body, {
      pointerId: 1,
      pointerType: 'mouse',
      buttons,
      clientX: x,
      clientY: 10,
    })
  const release = (x: number) =>
    fireEvent.pointerUp(document.body, { pointerId: 1, pointerType: 'mouse', clientX: x, clientY: 10 })

  it('marks a scrollable carousel as draggable (grab cursor)', () => {
    const { carousel } = setup()
    expect(carousel).toHaveAttribute('data-draggable')
  })

  it('drags past the slop and swallows the click that ends the drag', () => {
    const { carousel, onClick } = setup()
    const two = screen.getByRole('button', { name: 'Two' })
    press(two, 200)
    move(195)
    expect(carousel).not.toHaveAttribute('data-dragging')
    move(170)
    expect(carousel).toHaveAttribute('data-dragging')
    release(150)
    fireEvent.click(two)
    expect(onClick).not.toHaveBeenCalled()
    expect(carousel).not.toHaveAttribute('data-dragging')
  })

  it('still clicks after a press that moved less than the slop', () => {
    const { onClick } = setup()
    const two = screen.getByRole('button', { name: 'Two' })
    press(two, 200)
    move(196)
    release(196)
    fireEvent.click(two)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('never starts a drag on interactive content nested inside an item', () => {
    const { carousel } = setup()
    press(screen.getByRole('textbox', { name: 'Caption' }), 200)
    move(100)
    expect(carousel).not.toHaveAttribute('data-dragging')
    release(100)
  })

  it('drops a stale drag when a move arrives with no button down (#416)', () => {
    const { carousel } = setup()
    press(screen.getByRole('button', { name: 'Two' }), 200)
    move(170)
    expect(carousel).toHaveAttribute('data-dragging')
    const scrolled = carousel.scrollLeft
    // The release happened outside the window: the next move has no button.
    move(120, 0)
    expect(carousel).not.toHaveAttribute('data-dragging')
    move(60)
    expect(carousel).not.toHaveAttribute('data-dragging')
    expect(carousel.scrollLeft).toBe(scrolled)
  })

  it('lays out re-keyed items of the same count (#416)', () => {
    stub('scrollWidth', 1600)
    stub('clientWidth', 400)
    const items = (prefix: string) =>
      [1, 2, 3, 4, 5].map((n) => (
        <CarouselItem key={`${prefix}${n}`}>{`${prefix}${n}`}</CarouselItem>
      ))
    const { rerender } = render(<Carousel aria-label="Results">{items('a')}</Carousel>)
    rerender(<Carousel aria-label="Results">{items('b')}</Carousel>)
    const carousel = screen.getByRole('group', { name: 'Results' })
    const slots = Array.from(carousel.querySelectorAll<HTMLElement>('[data-carousel-slot]'))
    expect(slots).toHaveLength(5)
    expect(slots[0]).toHaveTextContent('b1')
    for (const slot of slots) {
      expect(slot.style.getPropertyValue('scroll-margin-inline-start')).not.toBe('')
      const clip = slot.querySelector<HTMLElement>('[data-carousel-clip="end"]')
      expect(clip?.style.transform).not.toBe('')
    }
  })

  it('leaves touch and pen to native scrolling', () => {
    const { carousel } = setup()
    press(screen.getByRole('button', { name: 'Two' }), 200, 'touch')
    move(100)
    expect(carousel).not.toHaveAttribute('data-dragging')
    release(100)
  })
})
