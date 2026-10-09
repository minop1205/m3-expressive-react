import { describe, it, expect, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Chip } from './Chip'
import { ChipSet } from './ChipSet'

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
