import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('renders a search landmark with a searchbox', () => {
    render(<SearchBar aria-label="Search" />)
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('fires onChange as the user types (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SearchBar aria-label="Search" onChange={onChange} />)
    await user.type(screen.getByRole('searchbox'), 'hi')
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'hi')
    expect(screen.getByRole('searchbox')).toHaveValue('hi')
  })

  it('fires onSearch on Enter', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchBar aria-label="Search" defaultValue="cats" onSearch={onSearch} />)
    const input = screen.getByRole('searchbox')
    input.focus()
    await user.keyboard('{Enter}')
    expect(onSearch).toHaveBeenCalledWith('cats')
  })

  it('opens the search view on focus and closes on Escape', async () => {
    const user = userEvent.setup()
    render(
      <SearchBar aria-label="Search">
        <ul>
          <li>Result one</li>
        </ul>
      </SearchBar>,
    )
    const input = screen.getByRole('searchbox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    await user.click(input)
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Result one')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('marks the wrapper and disables the input when disabled', () => {
    render(<SearchBar aria-label="Search" disabled />)
    expect(screen.getByRole('search')).toHaveAttribute('data-disabled')
    expect(screen.getByRole('searchbox')).toBeDisabled()
  })

  it('forwards a ref to the input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<SearchBar ref={ref} aria-label="Search" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<SearchBar aria-label="Search products" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
