import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Tab, Tabs } from './Tabs'

function Example({
  value = 'a',
  onChange = () => {},
  variant,
}: {
  value?: string
  onChange?: (event: React.MouseEvent<HTMLButtonElement>, v: string) => void
  variant?: 'primary' | 'secondary'
}) {
  return (
    <Tabs value={value} onChange={onChange} variant={variant} aria-label="Sections">
      <Tab value="a" label="Alpha" />
      <Tab value="b" label="Beta" />
      <Tab value="c" label="Gamma" />
    </Tabs>
  )
}

describe('Tabs', () => {
  it('renders a tablist with the selected tab marked', () => {
    render(<Example value="b" />)
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Beta', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alpha', selected: false })).toBeInTheDocument()
  })

  it('uses roving tabindex (only the selected tab is tabbable)', () => {
    render(<Example value="b" />)
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '-1')
  })

  it('selects on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Gamma' }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'c')
  })

  it('moves with arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Alpha' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'b')
  })

  it('supports the secondary variant', () => {
    render(<Example variant="secondary" />)
    expect(screen.getByRole('tablist')).toHaveAttribute('data-variant', 'secondary')
  })

  it('supports scrollable tabs', () => {
    render(
      <Tabs value="a" onChange={() => {}} scrollable aria-label="S">
        <Tab value="a" label="Alpha" />
        <Tab value="b" label="Beta" />
      </Tabs>,
    )
    expect(screen.getByRole('tablist')).toHaveAttribute('data-scrollable', 'true')
  })

  it('renders a single decorative indicator for the row', () => {
    const { container, rerender } = render(<Example value="b" />)
    const indicators = container.querySelectorAll('[role="tablist"] > [aria-hidden="true"]')
    expect(indicators).toHaveLength(1)
    expect(indicators[0]).not.toHaveAttribute('hidden')
    // No tab matches the value → nothing to point at.
    rerender(<Example value="zzz" />)
    expect(indicators[0]).toHaveAttribute('hidden')
  })

  it('scrolls the selected scrollable tab into the center on selection change', () => {
    const scrollBy = vi.fn()
    const original = Element.prototype.scrollBy
    Element.prototype.scrollBy = scrollBy
    try {
      const { rerender } = render(
        <Tabs value="a" onChange={() => {}} scrollable aria-label="S">
          <Tab value="a" label="Alpha" />
          <Tab value="b" label="Beta" />
        </Tabs>,
      )
      // First layout snaps instantly.
      expect(scrollBy).toHaveBeenCalledTimes(1)
      expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'instant' }))
      rerender(
        <Tabs value="b" onChange={() => {}} scrollable aria-label="S">
          <Tab value="a" label="Alpha" />
          <Tab value="b" label="Beta" />
        </Tabs>,
      )
      expect(scrollBy).toHaveBeenCalledTimes(2)
      expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }))
    } finally {
      Element.prototype.scrollBy = original
    }
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Tabs ref={ref} value="a" onChange={() => {}}>
        <Tab value="a" label="A" />
      </Tabs>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Example />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Tabs uncontrolled mode', () => {
  it('selects via defaultValue and updates on click without value', async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="one" aria-label="Sections">
        <Tab value="one" label="One" />
        <Tab value="two" label="Two" />
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Two' }))
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'false')
  })
})
