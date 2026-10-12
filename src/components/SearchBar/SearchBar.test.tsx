import { createRef } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { IconButton } from '../IconButton'
import { SearchBar, type SearchBarProps } from './SearchBar'

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

  it('pins the open view 2dp under the bar at its width', async () => {
    const user = userEvent.setup()
    render(
      <SearchBar aria-label="Search">
        <button>Result</button>
      </SearchBar>,
    )
    const bar = screen.getByRole('combobox').parentElement as HTMLElement
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({
      top: 20, bottom: 76, left: 16, right: 496, width: 480, height: 56,
    } as DOMRect)
    await user.click(screen.getByRole('combobox'))
    const view = document.getElementById(
      screen.getByRole('combobox').getAttribute('aria-controls')!,
    )!
    expect(view.style.top).toBe('78px')
    expect(view.style.left).toBe('16px')
    expect(view.style.width).toBe('480px')
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
    const input = screen.getByRole('combobox')
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
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
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
    const input = screen.getByRole('combobox')
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

  it('calls the consumer onPointerDownCapture / onPointerUpCapture on the root', () => {
    const onPointerDownCapture = vi.fn()
    const onPointerUpCapture = vi.fn()
    render(
      <SearchBar
        aria-label="Search"
        onPointerDownCapture={onPointerDownCapture}
        onPointerUpCapture={onPointerUpCapture}
      />,
    )
    const input = screen.getByRole('searchbox')
    fireEvent.pointerDown(input)
    fireEvent.pointerUp(input)
    expect(onPointerDownCapture).toHaveBeenCalledTimes(1)
    expect(onPointerUpCapture).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations', async () => {
    const { container } = render(<SearchBar aria-label="Search products" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  describe('slots, state layer and focus indicator', () => {
    it('hides only the default search glyph from assistive tech', () => {
      const { container } = render(<SearchBar aria-label="Search" />)
      const glyph = container.querySelector('svg')!
      expect(glyph.closest('[aria-hidden="true"]')).not.toBeNull()
    })

    it('renders no leading slot with startIcon={false}', () => {
      const { container } = render(<SearchBar aria-label="Search" startIcon={false} />)
      expect(container.querySelector('svg')).toBeNull()
      const bar = screen.getByRole('searchbox').parentElement!
      expect(bar).not.toHaveAttribute('data-has-start')
      expect(bar.firstElementChild).toBe(screen.getByRole('searchbox'))
    })

    it('keeps an interactive startIcon reachable and named', async () => {
      const user = userEvent.setup()
      const onBack = vi.fn()
      render(
        <SearchBar
          aria-label="Search"
          startIcon={
            <IconButton variant="standard" aria-label="Back" onClick={onBack} icon={<svg />} />
          }
          endIcon={
            <IconButton variant="standard" aria-label="Voice search" icon={<svg />} />
          }
        />,
      )
      const back = screen.getByRole('button', { name: 'Back' })
      expect(back.closest('[aria-hidden="true"]')).toBeNull()
      await user.tab()
      expect(back).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(onBack).toHaveBeenCalledTimes(1)
      await user.tab()
      expect(screen.getByRole('searchbox')).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: 'Voice search' })).toHaveFocus()
    })

    it('has no axe violations with interactive slots', async () => {
      const { container } = render(
        <SearchBar
          aria-label="Search"
          startIcon={
            <IconButton variant="standard" aria-label="Back" icon={<svg />} />
          }
        />,
      )
      expect(await axe(container)).toHaveNoViolations()
    })

    it('shows the bar focus ring on keyboard focus only', async () => {
      const user = userEvent.setup()
      render(<SearchBar aria-label="Search" />)
      const input = screen.getByRole('searchbox')
      const bar = input.parentElement!
      await user.click(input)
      expect(bar).not.toHaveAttribute('data-focus-visible')
      await user.tab()
      expect(input).not.toHaveFocus()
      await user.tab({ shift: true })
      expect(input).toHaveFocus()
      expect(bar).toHaveAttribute('data-focus-visible')
    })

    it('focuses the input when the bar container is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<SearchBar aria-label="Search" />)
      await user.click(container.querySelector('svg')!)
      expect(screen.getByRole('searchbox')).toHaveFocus()
    })

    it('closes the view when the scrim is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      const { container } = render(
        <SearchBar aria-label="Search" defaultOpen onOpenChange={onOpenChange}>
          <ul>
            <li>Result one</li>
          </ul>
        </SearchBar>,
      )
      const scrim = container.querySelector('[class*="scrim"]')!
      await user.click(scrim)
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    })

    it('makes the closed view inert', () => {
      render(
        <SearchBar aria-label="Search">
          <button type="button">Result one</button>
        </SearchBar>,
      )
      const item = screen.getByText('Result one')
      expect(item.closest('[inert]')).not.toBeNull()
    })
  })

  describe('search view: combobox semantics and keyboard', () => {
    const renderView = (props: Partial<Parameters<typeof SearchBar>[0]> = {}) =>
      render(
        <>
          <SearchBar aria-label="Search" {...props}>
            <ul>
              <li>
                <button type="button">One</button>
              </li>
              <li>
                <button type="button">Two</button>
              </li>
              <li>
                <button type="button" disabled>
                  Three (disabled)
                </button>
              </li>
            </ul>
          </SearchBar>
          <button type="button">Outside</button>
        </>,
      )

    it('exposes a combobox wired to the view', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('type', 'search')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      const view = document.getElementById(input.getAttribute('aria-controls')!)
      expect(view).toContainElement(screen.getByText('One'))
      expect(screen.getByRole('status')).toHaveTextContent('')
      await user.click(input)
      expect(input).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('status')).toHaveTextContent('Suggestions below')
    })

    it('localizes the announcement via suggestionsLabel', () => {
      renderView({ defaultOpen: true, suggestionsLabel: '候補を下に表示' })
      expect(screen.getByRole('status')).toHaveTextContent('候補を下に表示')
    })

    it('keeps the searchbox role when there is no view', () => {
      render(<SearchBar aria-label="Search" />)
      const input = screen.getByRole('searchbox')
      expect(input).not.toHaveAttribute('aria-expanded')
      expect(input).not.toHaveAttribute('aria-controls')
    })

    it('moves through the results with the arrow keys and back to the input', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{ArrowDown}')
      expect(screen.getByText('One')).toHaveFocus()
      await user.keyboard('{ArrowDown}')
      expect(screen.getByText('Two')).toHaveFocus()
      // The disabled item is skipped; the last item stays put.
      await user.keyboard('{ArrowDown}')
      expect(screen.getByText('Two')).toHaveFocus()
      await user.keyboard('{Home}')
      expect(screen.getByText('One')).toHaveFocus()
      await user.keyboard('{End}')
      expect(screen.getByText('Two')).toHaveFocus()
      await user.keyboard('{ArrowUp}{ArrowUp}')
      expect(input).toHaveFocus()
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('opens a closed view with ArrowDown', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{Escape}')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      await user.keyboard('{ArrowDown}')
      expect(input).toHaveAttribute('aria-expanded', 'true')
      expect(input).toHaveFocus()
    })

    it('closes with Escape from a result and returns focus to the input', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      renderView({ onOpenChange })
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{ArrowDown}')
      expect(screen.getByText('One')).toHaveFocus()
      await user.keyboard('{Escape}')
      expect(input).toHaveFocus()
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
      // Returning focus must not reopen the view.
      expect(onOpenChange).toHaveBeenCalledTimes(2)
    })

    it('prevents the default of Escape only while the view is open', () => {
      renderView({ defaultOpen: true })
      const input = screen.getByRole('combobox')
      input.focus()
      expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false)
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(true)
    })

    it('keeps the query when Escape closes the view', async () => {
      const user = userEvent.setup()
      renderView({ defaultValue: 'abc' })
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{Escape}')
      expect(input).toHaveValue('abc')
    })

    it('closes when focus moves out of the component', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(screen.getByText('Two')).toHaveFocus()
      await user.tab()
      expect(screen.getByText('Outside')).toHaveFocus()
      expect(input).toHaveAttribute('aria-expanded', 'false')
    })

    it('stays open while focus moves inside the view', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.tab()
      expect(screen.getByText('One')).toHaveFocus()
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('lets a consumer onKeyDown opt out with preventDefault', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      render(
        <SearchBar
          aria-label="Search"
          defaultValue="x"
          onSearch={onSearch}
          onKeyDown={(e) => e.preventDefault()}
        />,
      )
      screen.getByRole('searchbox').focus()
      await user.keyboard('{Enter}')
      expect(onSearch).not.toHaveBeenCalled()
    })

    it('does not call onSearch for the Enter that commits an IME composition', () => {
      const onSearch = vi.fn()
      render(<SearchBar aria-label="Search" defaultValue="かな" onSearch={onSearch} />)
      const input = screen.getByRole('searchbox')
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
      expect(onSearch).not.toHaveBeenCalled()
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onSearch).toHaveBeenCalledWith('かな')
    })

    it('has no axe violations with the view open', async () => {
      const { container } = renderView({ defaultOpen: true })
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations with the view closed', async () => {
      const { container } = renderView()
      expect(await axe(container)).toHaveNoViolations()
    })

    it('reopens the view on input after Escape closed it (#430)', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      await user.click(input)
      expect(input).toHaveAttribute('aria-expanded', 'true')
      await user.keyboard('{Escape}')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(input).toHaveFocus()
      await user.keyboard('abc')
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('reopens the view on pointer-down of the focused input after Escape (#430)', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{Escape}')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      await user.click(input)
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('never shows the view while disabled, even when open (#430)', () => {
      const { rerender } = render(
        <SearchBar aria-label="Search" disabled defaultOpen>
          <button type="button">One</button>
        </SearchBar>,
      )
      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('search')).not.toHaveAttribute('data-open')
      rerender(
        <SearchBar aria-label="Search" disabled open>
          <button type="button">One</button>
        </SearchBar>,
      )
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('search')).not.toHaveAttribute('data-open')
    })

    it('closes on an outside pointerdown (#430)', async () => {
      const user = userEvent.setup()
      renderView()
      const input = screen.getByRole('combobox')
      await user.click(input)
      expect(input).toHaveAttribute('aria-expanded', 'true')
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
      expect(input).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('layout="fullscreen" (#442)', () => {
    const renderFull = (props: Partial<SearchBarProps> = {}) =>
      render(
        <>
          <button type="button">Before</button>
          <SearchBar aria-label="Search" layout="fullscreen" {...props}>
            <button type="button">One</button>
            <button type="button">Two</button>
          </SearchBar>
          <button type="button">After</button>
        </>,
      )
    const barInput = () => screen.getAllByRole('combobox')[0]
    const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!
    const viewInput = () => within(dialog()).getByRole('combobox')

    it('opens a modal view on a press, focusing its field', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      renderFull({ onOpenChange })
      expect(barInput()).toHaveAttribute('aria-haspopup', 'dialog')
      expect(barInput()).toHaveAttribute('aria-expanded', 'false')
      await user.click(barInput())
      expect(onOpenChange).toHaveBeenLastCalledWith(true)
      expect(barInput()).toHaveAttribute('aria-expanded', 'true')
      expect(dialog()).toHaveAttribute('aria-modal', 'true')
      expect(barInput()).toHaveAttribute('aria-controls', dialog().id)
      expect(viewInput()).toHaveFocus()
      expect(within(dialog()).getByRole('button', { name: 'Back' })).toBeInTheDocument()
      // The rest of the page is inert while the view is open.
      expect(screen.getByRole('button', { name: 'After' }).closest('[inert]')).not.toBeNull()
      expect(screen.getByRole('search').querySelector(':scope > [data-open]')).toBe(
        dialog().parentElement,
      )
    })

    it('does not open on Tab focus alone; typing or ArrowDown opens it', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      renderFull({ onChange })
      screen.getByRole('button', { name: 'Before' }).focus()
      await user.tab()
      expect(barInput()).toHaveFocus()
      expect(barInput()).toHaveAttribute('aria-expanded', 'false')
      await user.keyboard('a')
      expect(barInput()).toHaveAttribute('aria-expanded', 'true')
      expect(viewInput()).toHaveValue('a')
      await user.keyboard('b')
      expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'ab')
      expect(barInput()).toHaveValue('ab')
    })

    it('collapses on Escape and returns focus to the bar without reopening', async () => {
      const user = userEvent.setup()
      renderFull({ defaultValue: 'cats' })
      barInput().focus()
      await user.keyboard('{ArrowDown}')
      expect(viewInput()).toHaveFocus()
      await user.keyboard('{Escape}')
      expect(barInput()).toHaveAttribute('aria-expanded', 'false')
      expect(barInput()).toHaveFocus()
      // Escape collapses only — the query is kept.
      expect(barInput()).toHaveValue('cats')
      expect(screen.getByRole('button', { name: 'After' }).closest('[inert]')).toBeNull()
    })

    it('collapses on the back button and returns focus to the bar', async () => {
      const user = userEvent.setup()
      renderFull()
      await user.click(barInput())
      await user.click(within(dialog()).getByRole('button', { name: 'Back' }))
      expect(barInput()).toHaveAttribute('aria-expanded', 'false')
      expect(barInput()).toHaveFocus()
    })

    it('collapses on Escape from a result', async () => {
      const user = userEvent.setup()
      renderFull()
      await user.click(barInput())
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('button', { name: 'One' })).toHaveFocus()
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
      await user.keyboard('{Escape}')
      expect(barInput()).toHaveAttribute('aria-expanded', 'false')
      expect(barInput()).toHaveFocus()
    })

    it('traps Tab inside the view', async () => {
      const user = userEvent.setup()
      renderFull()
      await user.click(barInput())
      const back = within(dialog()).getByRole('button', { name: 'Back' })
      await user.tab()
      expect(screen.getByRole('button', { name: 'One' })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
      await user.tab()
      expect(back).toHaveFocus()
      await user.tab({ shift: true })
      expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
    })

    it('starts the expand at the bar rect', async () => {
      const user = userEvent.setup()
      renderFull()
      const bar = barInput().parentElement as HTMLElement
      vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({
        top: 20, bottom: 76, left: 16, right: 496, width: 480, height: 56,
      } as DOMRect)
      await user.click(barInput())
      const overlay = dialog().parentElement as HTMLElement
      expect(overlay.style.getPropertyValue('--_collapsed-top')).toBe('20px')
      expect(overlay.style.getPropertyValue('--_collapsed-left')).toBe('16px')
      expect(overlay.style.getPropertyValue('--_collapsed-width')).toBe('480px')
    })

    it('fires onSearch on Enter in the view field and localizes the back button', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      renderFull({ defaultValue: 'dogs', onSearch, backLabel: 'Zurück' })
      await user.click(barInput())
      await user.keyboard('{Enter}')
      expect(onSearch).toHaveBeenCalledWith('dogs')
      expect(within(dialog()).getByRole('button', { name: 'Zurück' })).toBeInTheDocument()
    })

    it('supports controlled open', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      const { rerender } = render(
        <SearchBar aria-label="Search" layout="fullscreen" open onOpenChange={onOpenChange}>
          <button type="button">One</button>
        </SearchBar>,
      )
      await waitFor(() => expect(viewInput()).toHaveFocus())
      await user.keyboard('{Escape}')
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
      rerender(
        <SearchBar aria-label="Search" layout="fullscreen" open={false} onOpenChange={onOpenChange}>
          <button type="button">One</button>
        </SearchBar>,
      )
      // Opened without a trigger: focus still lands on the bar.
      expect(barInput()).toHaveFocus()
      expect(barInput()).toHaveAttribute('aria-expanded', 'false')
    })

    it('has no axe violations with the full-screen view open', async () => {
      const { container } = renderFull({ defaultOpen: true })
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations with the full-screen view closed', async () => {
      const { container } = renderFull()
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
