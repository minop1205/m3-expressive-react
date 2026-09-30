import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { NavigationBar, NavigationBarItem } from './NavigationBar'
import rippleStyles from '../../primitives/Ripple/Ripple.module.css'

const Icon = <svg viewBox="0 0 24 24" aria-hidden="true" />

function Example({ value = 'a', onChange = () => {} }) {
  return (
    <NavigationBar value={value} onChange={onChange} aria-label="Primary">
      <NavigationBarItem value="a" icon={Icon} label="Alpha" />
      <NavigationBarItem value="b" icon={Icon} label="Beta" />
      <NavigationBarItem value="c" icon={Icon} label="Gamma" badge="2" />
    </NavigationBar>
  )
}

describe('NavigationBar', () => {
  it('marks the selected item with aria-current', () => {
    render(<Example value="b" />)
    expect(screen.getByRole('button', { name: /Beta/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /Alpha/ })).not.toHaveAttribute('aria-current')
  })

  it('fires onChange on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /Gamma/ }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'c')
  })

  it('renders a badge', () => {
    render(<Example />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('supports the horizontal (flexible) item layout', () => {
    render(
      <NavigationBar value="a" onChange={() => {}} itemLayout="horizontal" aria-label="P">
        <NavigationBarItem value="a" icon={Icon} label="Alpha" />
      </NavigationBar>,
    )
    expect(screen.getByRole('navigation')).toHaveAttribute('data-layout', 'horizontal')
    expect(screen.getByRole('button', { name: /Alpha/ })).toBeInTheDocument()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLElement>()
    render(
      <NavigationBar ref={ref} value="a" onChange={() => {}}>
        <NavigationBarItem value="a" icon={Icon} label="A" />
      </NavigationBar>,
    )
    expect(ref.current?.tagName).toBe('NAV')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Example />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('NavigationBar uncontrolled mode', () => {
  it('selects via defaultValue and updates on click without value', async () => {
    const user = userEvent.setup()
    render(
      <NavigationBar aria-label="Main" defaultValue="home">
        <NavigationBarItem value="home" icon={<svg aria-hidden="true" />} label="Home" />
        <NavigationBarItem value="mail" icon={<svg aria-hidden="true" />} label="Mail" />
      </NavigationBar>,
    )
    expect(screen.getByRole('button', { name: /Home/ })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: /Mail/ }))
    expect(screen.getByRole('button', { name: /Mail/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /Home/ })).not.toHaveAttribute('aria-current')
  })
})

describe('NavigationBar items (#173–#175)', () => {
  it('renders selectedIcon for the selected item and icon for the rest (#174)', () => {
    render(
      <NavigationBar value="a" aria-label="Main">
        <NavigationBarItem
          value="a"
          icon={<svg data-testid="a-outlined" aria-hidden="true" />}
          selectedIcon={<svg data-testid="a-filled" aria-hidden="true" />}
          label="Alpha"
        />
        <NavigationBarItem
          value="b"
          icon={<svg data-testid="b-outlined" aria-hidden="true" />}
          selectedIcon={<svg data-testid="b-filled" aria-hidden="true" />}
          label="Beta"
        />
        <NavigationBarItem value="c" icon={<svg data-testid="c-only" aria-hidden="true" />} label="Gamma" />
      </NavigationBar>,
    )
    expect(screen.getByTestId('a-filled')).toBeInTheDocument()
    expect(screen.queryByTestId('a-outlined')).not.toBeInTheDocument()
    expect(screen.getByTestId('b-outlined')).toBeInTheDocument()
    expect(screen.queryByTestId('b-filled')).not.toBeInTheDocument()
    expect(screen.getByTestId('c-only')).toBeInTheDocument()
  })

  it('announces badges after the label (#175)', () => {
    render(
      <NavigationBar value="a" aria-label="Main">
        <NavigationBarItem value="a" icon={Icon} label="Alpha" badge="5" />
        <NavigationBarItem value="b" icon={Icon} label="Beta" badge />
        <NavigationBarItem value="c" icon={Icon} label="Gamma" badge={1} />
        <NavigationBarItem value="d" icon={Icon} label="Delta" badge="3" badgeLabel="3 unread messages" />
        <NavigationBarItem value="e" icon={Icon} label="Echo" badge={false} />
      </NavigationBar>,
    )
    // Browsers compute "Alpha 5 new notifications"; jsdom trims the hidden
    // suffix's leading space, hence the optional space.
    expect(screen.getByRole('button', { name: /^Alpha ?5 new notifications$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Beta ?New notification$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Gamma ?1 new notification$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Delta ?3 unread messages$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Echo' })).toBeInTheDocument()
    // The visible badge itself is decorative.
    expect(screen.getByText('5')).toHaveAttribute('aria-hidden', 'true')
  })

  it('drives the indicator ripple from the whole item (#173)', () => {
    const { container } = render(<Example />)
    const item = screen.getByRole('button', { name: /Alpha/ })
    const layer = item.querySelector(`.${rippleStyles.stateLayer}`)
    expect(layer).not.toBeNull()
    // The ripple lives inside the indicator, not directly in the item box.
    expect(layer!.closest('[class*="indicator"]')).not.toBeNull()
    fireEvent.pointerEnter(item)
    expect(layer).toHaveClass(rippleStyles.hovered)
    fireEvent.pointerLeave(item)
    expect(layer).not.toHaveClass(rippleStyles.hovered)
    expect(container.querySelectorAll(`.${rippleStyles.stateLayer}`)).toHaveLength(3)
  })

  it('exposes the horizontal item count for the centered arrangement (#172)', () => {
    render(
      <NavigationBar value="a" itemLayout="horizontal" aria-label="Main">
        <NavigationBarItem value="a" icon={Icon} label="Alpha" />
        <NavigationBarItem value="b" icon={Icon} label="Beta" />
        <NavigationBarItem value="c" icon={Icon} label="Gamma" />
        {null}
      </NavigationBar>,
    )
    expect(screen.getByRole('navigation')).toHaveAttribute('data-item-count', '3')
  })

  it('has no axe violations with badges, a disabled item and horizontal layout', async () => {
    const { container } = render(
      <NavigationBar value="a" itemLayout="horizontal" aria-label="Main">
        <NavigationBarItem value="a" icon={Icon} selectedIcon={Icon} label="Alpha" badge="5" />
        <NavigationBarItem value="b" icon={Icon} label="Beta" badge />
        <NavigationBarItem value="c" icon={Icon} label="Gamma" disabled />
      </NavigationBar>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
