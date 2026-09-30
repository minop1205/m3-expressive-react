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
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'b')
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

describe('NavigationRail uncontrolled mode', () => {
  it('selects via defaultValue and updates on click without value', async () => {
    const user = userEvent.setup()
    render(
      <NavigationRail aria-label="Main" defaultValue="inbox">
        <NavigationRailItem value="inbox" icon={<svg aria-hidden="true" />} label="Inbox" />
        <NavigationRailItem value="sent" icon={<svg aria-hidden="true" />} label="Sent" />
      </NavigationRail>,
    )
    expect(screen.getByRole('button', { name: /Inbox/ })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: /Sent/ }))
    expect(screen.getByRole('button', { name: /Sent/ })).toHaveAttribute('aria-current', 'page')
  })
})

describe('NavigationRailItem icons and badges (#174 / #175)', () => {
  it('renders selectedIcon only while selected (#174)', () => {
    const { rerender } = render(
      <NavigationRailItem
        value="a"
        icon={<svg data-testid="outlined" aria-hidden="true" />}
        selectedIcon={<svg data-testid="filled" aria-hidden="true" />}
        label="Alpha"
        selected
      />,
    )
    expect(screen.getByTestId('filled')).toBeInTheDocument()
    expect(screen.queryByTestId('outlined')).not.toBeInTheDocument()
    rerender(
      <NavigationRailItem
        value="a"
        icon={<svg data-testid="outlined" aria-hidden="true" />}
        selectedIcon={<svg data-testid="filled" aria-hidden="true" />}
        label="Alpha"
      />,
    )
    expect(screen.getByTestId('outlined')).toBeInTheDocument()
    expect(screen.queryByTestId('filled')).not.toBeInTheDocument()
  })

  it('announces the badge after the label (#175)', () => {
    render(
      <NavigationRail value="a" aria-label="Rail">
        <NavigationRailItem value="a" icon={Icon} label="Alpha" badge="3" />
        <NavigationRailItem value="b" icon={Icon} label="Beta" badge />
        <NavigationRailItem value="c" icon={Icon} label="Gamma" badge="2" badgeLabel="2 nuevas" />
      </NavigationRail>,
    )
    // Browsers compute "Alpha 5 new notifications"; jsdom trims the hidden
    // suffix's leading space, hence the optional space.
    expect(screen.getByRole('button', { name: /^Alpha ?3 new notifications$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Beta ?New notification$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Gamma ?2 nuevas$/ })).toBeInTheDocument()
  })
})
