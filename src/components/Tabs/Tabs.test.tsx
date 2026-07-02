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
  onChange?: (v: string) => void
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
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('moves with arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Alpha' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('b')
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
