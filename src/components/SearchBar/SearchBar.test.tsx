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

  it('renders the view open initially with defaultOpen (uncontrolled)', () => {
    render(
      <SearchBar aria-label="Search" defaultOpen>
        <ul>
          <li>Result one</li>
        </ul>
      </SearchBar>,
    )
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-expanded', 'true')
  })

  it('notifies onOpenChange and follows the controlled open prop', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <SearchBar aria-label="Search" open={false} onOpenChange={onOpenChange}>
        <ul>
          <li>Result one</li>
        </ul>
      </SearchBar>,
    )
    const input = screen.getByRole('searchbox')
    await user.click(input)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    // Controlled: stays closed until the prop changes.
    expect(input).toHaveAttribute('aria-expanded', 'false')
    rerender(
      <SearchBar aria-label="Search" open onOpenChange={onOpenChange}>
        <ul>
          <li>Result one</li>
        </ul>
      </SearchBar>,
    )
    expect(input).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('marks the wrapper and disables the input when disabled', () => {
    render(<SearchBar aria-label="Search" disabled />)
    expect(screen.getByRole('search')).toHaveAttribute('data-disabled')
    expect(screen.getByRole('searchbox')).toBeDisabled()
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<SearchBar ref={ref} aria-label="Search" />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toBe(screen.getByRole('search'))
  })

  it('forwards inputRef to the native input', () => {
    const inputRef = createRef<HTMLInputElement>()
    render(<SearchBar inputRef={inputRef} aria-label="Search" />)
    expect(inputRef.current).toBe(screen.getByRole('searchbox'))
  })

  it('names the searchbox via inputProps aria-label, distinct from the landmark', () => {
    render(
      <SearchBar
        aria-label="Site search"
        inputProps={{ 'aria-label': 'Search query' }}
      />,
    )
    expect(screen.getByRole('search')).toHaveAccessibleName('Site search')
    expect(screen.getByRole('searchbox', { name: 'Search query' })).toBeInTheDocument()
  })

  it('does not let inputProps clobber the controlled value or type', () => {
    render(
      <SearchBar
        aria-label="Search"
        value="controlled"
        onChange={() => {}}
        inputProps={{ value: 'clobbered', type: 'text' } as never}
      />,
    )
    const input = screen.getByRole('searchbox')
    expect(input).toHaveValue('controlled')
    expect(input).toHaveAttribute('type', 'search')
  })

  it('spreads unknown rest props on the root element', () => {
    render(<SearchBar aria-label="Search" data-testid="root-landing" />)
    expect(screen.getByRole('search')).toHaveAttribute(
      'data-testid',
      'root-landing',
    )
    expect(screen.getByRole('searchbox')).not.toHaveAttribute('data-testid')
  })

  it('has no axe violations', async () => {
    const { container } = render(<SearchBar aria-label="Search products" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
