import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { NavigationRail, NavigationRailItem } from './NavigationRail'

const Icon = <svg viewBox="0 0 24 24" aria-hidden="true" />

function Example({ value = 'a', onChange = () => {} }) {
  return (
    <NavigationRail value={value} onChange={onChange} aria-label="Rail" header={<span>H</span>}>
      <NavigationRailItem value="a" icon={Icon} label="Alpha" />
      <NavigationRailItem value="b" icon={Icon} label="Beta" />
    </NavigationRail>
  )
}

describe('NavigationRail', () => {
  it('renders header and marks the selected item', () => {
    render(<Example value="b" />)
    expect(screen.getByText('H')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Beta/ })).toHaveAttribute('aria-current', 'page')
  })

  it('fires onChange on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /Beta/ }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLElement>()
    render(
      <NavigationRail ref={ref} value="a" onChange={() => {}}>
        <NavigationRailItem value="a" icon={Icon} label="A" />
      </NavigationRail>,
    )
    expect(ref.current?.tagName).toBe('NAV')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Example />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('NavigationRailItem (standalone)', () => {
  it('drives its own morph from the expanded prop', () => {
    const { rerender } = render(
      <NavigationRailItem value="a" icon={Icon} label="Alpha" expanded />,
    )
    const item = screen.getByRole('button', { name: /Alpha/ })
    expect(item.style.getPropertyValue('--_t')).toBe('1')
    rerender(<NavigationRailItem value="a" icon={Icon} label="Alpha" expanded={false} />)
    // The spring animates toward 0; the slide direction flag flips immediately.
    expect(item.style.getPropertyValue('--_slide')).toBe('0')
  })

  it('renders a large badge with content and a dot badge for `true`', () => {
    const { container, rerender } = render(
      <NavigationRailItem value="a" icon={Icon} label="Alpha" badge="3" />,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(container.querySelector('[class*="badgeDot"]')).not.toBeInTheDocument()
    rerender(<NavigationRailItem value="a" icon={Icon} label="Alpha" badge />)
    expect(container.querySelector('[class*="badgeDot"]')).toBeInTheDocument()
  })

  it('does not set an inline --_t when expanded is omitted (inherits from container)', () => {
    render(<NavigationRailItem value="a" icon={Icon} label="Alpha" />)
    const item = screen.getByRole('button', { name: /Alpha/ })
    expect(item.style.getPropertyValue('--_t')).toBe('')
  })

  it('does not shadow the rail-inherited --_t when inside a rail', () => {
    render(
      <NavigationRail value="a" onChange={() => {}} aria-label="Rail">
        <NavigationRailItem value="a" icon={Icon} label="Alpha" expanded />
      </NavigationRail>,
    )
    const item = screen.getByRole('button', { name: /Alpha/ })
    expect(item.style.getPropertyValue('--_t')).toBe('')
  })
})
