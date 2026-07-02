import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { NavigationBar, NavigationBarItem } from './NavigationBar'

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
    expect(onChange).toHaveBeenCalledWith('c')
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
