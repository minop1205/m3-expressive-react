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
