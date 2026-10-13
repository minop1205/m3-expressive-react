import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Chip } from './Chip'
import { ChipSet } from './ChipSet'
import { Menu, MenuItem } from '../Menu/Menu'

function Filters({ disabledIndex }: { disabledIndex?: number }) {
  return (
    <>
      <button type="button">Before</button>
      <ChipSet aria-label="Filters">
        {['A', 'B', 'C', 'D'].map((label, i) => (
          <Chip key={label} variant="filter" label={label} disabled={i === disabledIndex} />
        ))}
      </ChipSet>
      <button type="button">After</button>
    </>
  )
}

function Recipients({ initial = ['A', 'B', 'C'] }: { initial?: string[] }) {
  const [items, setItems] = useState(initial)
  return (
    <>
      <button type="button">Before</button>
      <ChipSet aria-label="Recipients">
        {items.map((label) => (
          <Chip
            key={label}
            variant="input"
            label={label}
            removable
            onRemove={() => setItems((prev) => prev.filter((l) => l !== label))}
          />
        ))}
      </ChipSet>
      <button type="button">After</button>
    </>
  )
}

const btn = (name: string) => screen.getByRole('button', { name })

describe('ChipSet (#189)', () => {
  afterEach(() => {
    document.documentElement.dir = ''
  })

  it('renders a labelled toolbar', () => {
    render(<Filters />)
    expect(screen.getByRole('toolbar', { name: 'Filters' })).toBeInTheDocument()
  })

  it('is a single Tab stop', async () => {
    const user = userEvent.setup()
    render(<Filters />)
    btn('Before').focus()
    await user.tab()
    expect(btn('A')).toHaveFocus()
    await user.tab()
    expect(btn('After')).toHaveFocus()
    await user.tab({ shift: true })
    expect(btn('A')).toHaveFocus()
  })

  it('moves between chips with arrows and Home / End (no wrap)', async () => {
    const user = userEvent.setup()
    render(<Filters />)
    btn('A').focus()
    await user.keyboard('{ArrowRight}')
    expect(btn('B')).toHaveFocus()
    await user.keyboard('{End}')
    expect(btn('D')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(btn('D')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(btn('A')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(btn('A')).toHaveFocus()
  })

  it('remembers the last focused chip as the Tab stop', async () => {
    const user = userEvent.setup()
    render(<Filters />)
    btn('A').focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(btn('C')).toHaveFocus()
    await user.tab()
    expect(btn('After')).toHaveFocus()
    await user.tab({ shift: true })
    expect(btn('C')).toHaveFocus()
    expect(btn('A')).toHaveAttribute('tabindex', '-1')
  })

  it('skips disabled chips', async () => {
    const user = userEvent.setup()
    render(<Filters disabledIndex={1} />)
    btn('A').focus()
    await user.keyboard('{ArrowRight}')
    expect(btn('C')).toHaveFocus()
  })

  it('mirrors arrows in RTL', async () => {
    const user = userEvent.setup()
    document.documentElement.dir = 'rtl'
    render(
      <div dir="rtl" style={{ direction: 'rtl' }}>
        <Filters />
      </div>,
    )
    btn('A').focus()
    await user.keyboard('{ArrowLeft}')
    expect(btn('B')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(btn('A')).toHaveFocus()
  })

  it('steps through a removable chip’s remove action', async () => {
    const user = userEvent.setup()
    render(<Recipients />)
    btn('A').focus()
    await user.keyboard('{ArrowRight}')
    expect(btn('Remove A')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(btn('B')).toHaveFocus()
    // Backwards into a removable chip lands on its remove action first.
    await user.keyboard('{ArrowLeft}')
    expect(btn('Remove A')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(btn('A')).toHaveFocus()
  })

  it('Shift+Tab from a remove action leaves the set', async () => {
    const user = userEvent.setup()
    render(<Recipients />)
    btn('A').focus()
    await user.keyboard('{ArrowRight}')
    expect(btn('Remove A')).toHaveFocus()
    await user.tab({ shift: true })
    expect(btn('Before')).toHaveFocus()
    // The set is still a single Tab stop afterwards.
    await user.tab()
    expect(btn('A')).toHaveFocus()
  })

  it('Backspace removes the focused chip and focuses the next one', async () => {
    const user = userEvent.setup()
    render(<Recipients />)
    btn('B').focus()
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: 'B' })).toBeNull()
    await waitFor(() => expect(btn('C')).toHaveFocus())
    expect(btn('C')).toHaveAttribute('tabindex', '0')
    expect(btn('A')).toHaveAttribute('tabindex', '-1')
  })

  it('focuses the set when the last chip is removed, not <body> (#423)', async () => {
    const user = userEvent.setup()
    render(<Recipients initial={['A']} />)
    btn('A').focus()
    await user.keyboard('{Backspace}')
    const set = screen.getByRole('toolbar', { name: 'Recipients' })
    await waitFor(() => expect(set).toHaveFocus())
    // Focusable only for the hand-off: it leaves the Tab order on blur.
    await user.tab()
    expect(set).not.toHaveAttribute('tabindex')
  })

  it('keeps a Tab stop when the active chip is removed from outside', async () => {
    const { rerender } = render(
      <ChipSet aria-label="Set">
        <Chip label="A" />
        <Chip label="B" />
      </ChipSet>,
    )
    expect(btn('A')).toHaveAttribute('tabindex', '0')
    rerender(
      <ChipSet aria-label="Set">
        <Chip label="B" />
      </ChipSet>,
    )
    await waitFor(() => expect(btn('B')).toHaveAttribute('tabindex', '0'))
  })

  it('has no axe violations', async () => {
    const { container } = render(<Recipients />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (filters with a disabled chip)', async () => {
    const { container } = render(<Filters disabledIndex={2} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('ChipSet group-level disabled (#421)', () => {
  it('disables every chip in the set', () => {
    render(
      <ChipSet aria-label="Filters" disabled>
        <Chip variant="filter" label="One" />
        <Chip variant="assist" label="Two" />
      </ChipSet>,
    )
    expect(screen.getByRole('button', { name: 'One' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Two' })).toBeDisabled()
  })

  it('leaves chips enabled by default', () => {
    render(
      <ChipSet aria-label="Filters">
        <Chip variant="filter" label="One" />
      </ChipSet>,
    )
    expect(screen.getByRole('button', { name: 'One' })).toBeEnabled()
  })

  it('has no axe violations when disabled', async () => {
    const { container } = render(
      <ChipSet aria-label="Filters" disabled>
        <Chip variant="filter" label="One" />
      </ChipSet>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('ChipSet selection (B36 / #438)', () => {
  const sizes = ['S', 'M', 'L']
  const radio = (name: string) => screen.getByRole('radio', { name })
  const sizeChips = sizes.map((l) => (
    <Chip key={l} variant="filter" label={l} value={l.toLowerCase()} />
  ))

  it('leaves chips self-managed without a selectionMode', async () => {
    const user = userEvent.setup()
    render(
      <ChipSet aria-label="Sizes">
        <Chip variant="filter" label="S" value="s" />
      </ChipSet>,
    )
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    await user.click(btn('S'))
    expect(btn('S')).toHaveAttribute('aria-pressed', 'true')
  })

  it('single: radiogroup of radio chips, selecting one deselects the others', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ChipSet aria-label="Size" selectionMode="single" defaultValue="s" onChange={onChange}>
        {sizeChips}
      </ChipSet>,
    )
    expect(screen.getByRole('radiogroup', { name: 'Size' })).toBeInTheDocument()
    expect(radio('S')).toHaveAttribute('aria-checked', 'true')
    expect(radio('S')).not.toHaveAttribute('aria-pressed')
    await user.click(radio('L'))
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'l')
    expect(radio('L')).toHaveAttribute('aria-checked', 'true')
    expect(radio('S')).toHaveAttribute('aria-checked', 'false')
    // Re-activating the selected chip clears it (selectionRequired is off).
    await user.click(radio('L'))
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), null)
    expect(radio('L')).toHaveAttribute('aria-checked', 'false')
  })

  it('single + selectionRequired keeps the selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ChipSet
        aria-label="Size"
        selectionMode="single"
        defaultValue="s"
        selectionRequired
        onChange={onChange}
      >
        {sizeChips}
      </ChipSet>,
    )
    await user.click(radio('S'))
    expect(onChange).not.toHaveBeenCalled()
    expect(radio('S')).toHaveAttribute('aria-checked', 'true')
  })

  it('single: the selected chip is the Tab stop; arrows wrap and select', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <>
        <button type="button">Before</button>
        <ChipSet aria-label="Size" selectionMode="single" defaultValue="m" onChange={onChange}>
          {sizeChips}
        </ChipSet>
      </>,
    )
    btn('Before').focus()
    await user.tab()
    expect(radio('M')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(radio('L')).toHaveFocus()
    expect(radio('L')).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowDown}')
    expect(radio('S')).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 's')
    await user.keyboard('{ArrowUp}')
    expect(radio('L')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(radio('S')).toHaveAttribute('aria-checked', 'true')
  })

  it('single: Tab returns to the selected chip, not the last focused one', async () => {
    const user = userEvent.setup()
    function Sizes() {
      const [v, setV] = useState<string | null>('l')
      return (
        <>
          <button type="button" onClick={() => setV('s')}>
            Pick S
          </button>
          <ChipSet
            aria-label="Size"
            selectionMode="single"
            value={v}
            onChange={(_, next) => setV(next)}
          >
            {sizeChips}
          </ChipSet>
        </>
      )
    }
    render(<Sizes />)
    radio('L').focus()
    await user.click(btn('Pick S'))
    await waitFor(() => expect(radio('S')).toHaveAttribute('tabindex', '0'))
    await user.tab()
    expect(radio('S')).toHaveFocus()
  })

  it('multiple: toggle chips in a toolbar, value is an array', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const chipChange = vi.fn()
    render(
      <ChipSet
        aria-label="Diet"
        selectionMode="multiple"
        defaultValue={['veg']}
        onChange={onChange}
      >
        <Chip variant="filter" label="Vegetarian" value="veg" />
        <Chip variant="filter" label="Vegan" value="vegan" onChange={chipChange} />
      </ChipSet>,
    )
    expect(screen.getByRole('toolbar', { name: 'Diet' })).toBeInTheDocument()
    expect(btn('Vegetarian')).toHaveAttribute('aria-pressed', 'true')
    await user.click(btn('Vegan'))
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), ['veg', 'vegan'])
    expect(chipChange).toHaveBeenLastCalledWith(expect.anything(), true)
    expect(btn('Vegan')).toHaveAttribute('aria-pressed', 'true')
    await user.click(btn('Vegetarian'))
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), ['vegan'])
  })

  it('controlled value wins; chip-level selected is ignored', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ChipSet aria-label="Size" selectionMode="single" value="s" onChange={onChange}>
        <Chip variant="filter" label="S" value="s" />
        <Chip variant="filter" label="M" value="m" selected />
      </ChipSet>,
    )
    expect(radio('M')).toHaveAttribute('aria-checked', 'false')
    await user.click(radio('M'))
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'm')
    expect(radio('S')).toHaveAttribute('aria-checked', 'true')
  })

  it('chips without a value stay self-managed buttons', () => {
    render(
      <ChipSet aria-label="Size" selectionMode="single">
        <Chip variant="filter" label="S" value="s" />
        <Chip variant="assist" label="Help" />
      </ChipSet>,
    )
    expect(radio('S')).toBeInTheDocument()
    expect(btn('Help')).not.toHaveAttribute('role')
  })

  it('has no axe violations (single and multiple)', async () => {
    const { container } = render(
      <>
        <ChipSet aria-label="Size" selectionMode="single" defaultValue="m">
          {sizeChips}
        </ChipSet>
        <ChipSet aria-label="Diet" selectionMode="multiple" defaultValue={['a']}>
          <Chip variant="filter" label="A" value="a" />
          <Chip variant="input" label="B" value="b" removable />
        </ChipSet>
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Filter chip endIcon + Menu (B36 / #438)', () => {
  function PriceFilter() {
    const [price, setPrice] = useState<string | null>(null)
    return (
      <ChipSet aria-label="Filters">
        <Menu
          trigger={
            <Chip
              variant="filter"
              label={price ?? 'Price'}
              selected={price !== null}
              endIcon={<svg data-testid="arrow" />}
            />
          }
        >
          <MenuItem onClick={() => setPrice('$')}>$</MenuItem>
          <MenuItem onClick={() => setPrice('$$')}>$$</MenuItem>
        </Menu>
        <Chip variant="filter" label="Open now" />
      </ChipSet>
    )
  }

  it('renders the end icon hidden inside the chip action', () => {
    render(<Chip variant="filter" label="Price" endIcon={<svg data-testid="arrow" />} />)
    const icon = screen.getByTestId('arrow')
    expect(btn('Price')).toContainElement(icon)
    expect(icon.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('is replaced by the remove button on removable chips', () => {
    render(
      <Chip variant="filter" label="Price" removable endIcon={<svg data-testid="arrow" />} />,
    )
    expect(screen.queryByTestId('arrow')).toBeNull()
    expect(btn('Remove Price')).toBeInTheDocument()
  })

  it('opens a Menu as its trigger; the chip reports aria-expanded', async () => {
    const user = userEvent.setup()
    render(<PriceFilter />)
    const chip = btn('Price')
    expect(chip).toHaveAttribute('aria-haspopup', 'menu')
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('menuitem', { name: '$$' }))
    const updated = btn('$$')
    expect(updated).toHaveAttribute('aria-expanded', 'false')
    expect(updated).toHaveAttribute('aria-pressed', 'true')
  })

  it('stays part of the ChipSet roving focus', async () => {
    const user = userEvent.setup()
    render(<PriceFilter />)
    btn('Price').focus()
    await user.keyboard('{ArrowRight}')
    expect(btn('Open now')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(btn('Price')).toHaveFocus()
  })

  it('has no axe violations (closed and open)', async () => {
    const user = userEvent.setup()
    const { container } = render(<PriceFilter />)
    expect(await axe(container)).toHaveNoViolations()
    await user.click(btn('Price'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
