import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { DatePicker, type DatePickerCloseReason, type DateRange } from './DatePicker'

const day = (n: number) =>
  screen.getByRole('gridcell', { name: new RegExp(`\\b${n}, \\d{4}$`) })

describe('DatePicker input mode', () => {
  it('switches between calendar and text input from the header toggle', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    render(<DatePicker defaultValue={new Date(2024, 6, 4)} onModeChange={onModeChange} />)
    await user.click(screen.getByRole('button', { name: 'Switch to text input mode' }))
    expect(onModeChange).toHaveBeenCalledWith('input')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Date' })
    expect(input).toHaveValue('07/04/2024')
    expect(input).toHaveAttribute('placeholder', 'MM/DD/YYYY')
    await user.click(screen.getByRole('button', { name: 'Switch to calendar input mode' }))
    expect(onModeChange).toHaveBeenLastCalledWith('calendar')
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('supports a controlled mode', () => {
    const { rerender } = render(<DatePicker mode="input" />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('Entered date')).toBeInTheDocument()
    rerender(<DatePicker mode="calendar" />)
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('hides the toggle with showModeToggle={false}', () => {
    render(<DatePicker showModeToggle={false} />)
    expect(
      screen.queryByRole('button', { name: 'Switch to text input mode' }),
    ).not.toBeInTheDocument()
  })

  it('commits typed dates on blur / Enter without a mask', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker defaultMode="input" onChange={onChange} locale="en-GB" />)
    const input = screen.getByRole('textbox', { name: 'Date' })
    expect(input).toHaveAttribute('placeholder', 'DD/MM/YYYY')
    await user.type(input, '4')
    expect(onChange).not.toHaveBeenCalled()
    await user.type(input, '-7-2024{Enter}')
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 6, 4))
    expect(input).toHaveValue('04/07/2024')
    expect(screen.getByText(/Thu,? 4 Jul/)).toBeInTheDocument()
  })

  it('shows the pattern and range errors', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DatePicker
        defaultMode="input"
        max={new Date(2024, 11, 31)}
        onChange={onChange}
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Date' })
    await user.type(input, '2/30/2024{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Date does not match expected pattern: MM/DD/YYYY',
    )
    await user.clear(input)
    await user.type(input, '1/1/2025{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Date not allowed')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('offers start / end fields in range mode and validates the order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker range defaultMode="input" onChange={onChange} />)
    expect(screen.getByText('Enter dates')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Start date' }), '7/10/2024{Enter}')
    expect(onChange).toHaveBeenLastCalledWith([new Date(2024, 6, 10), null])
    await user.type(screen.getByRole('textbox', { name: 'End date' }), '7/1/2024{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid date range input')
    await user.clear(screen.getByRole('textbox', { name: 'End date' }))
    await user.type(screen.getByRole('textbox', { name: 'End date' }), '7/20/2024{Enter}')
    expect(onChange).toHaveBeenLastCalledWith([new Date(2024, 6, 10), new Date(2024, 6, 20)])
  })

  it('has no axe violations in input mode', async () => {
    const { container } = render(<DatePicker range defaultMode="input" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('DatePicker actions (draft / commit)', () => {
  it('renders no action row by default', () => {
    render(<DatePicker />)
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument()
  })

  it('reports picks as drafts and commits on OK', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onAccept = vi.fn()
    render(
      <DatePicker defaultValue={new Date(2024, 6, 4)} onChange={onChange} onAccept={onAccept} />,
    )
    await user.click(day(10))
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 6, 10))
    expect(onAccept).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(onAccept).toHaveBeenCalledWith(new Date(2024, 6, 10))
  })

  it('accepts with Enter on a day', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    render(<DatePicker defaultValue={new Date(2024, 6, 4)} onAccept={onAccept} />)
    day(4).focus()
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onAccept).toHaveBeenCalledWith(new Date(2024, 6, 5))
  })

  it('reverts to the committed value on Cancel', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onCancel = vi.fn()
    render(
      <DatePicker defaultValue={new Date(2024, 6, 4)} onChange={onChange} onCancel={onCancel} />,
    )
    await user.click(day(10))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 6, 4))
    expect(day(4)).toHaveAttribute('aria-selected', 'true')
    expect(day(10)).toHaveAttribute('aria-selected', 'false')
  })

  it('disables OK until a full range is chosen; Enter completing the range accepts', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    render(<DatePicker range defaultValue={[new Date(2024, 6, 4), null]} onAccept={onAccept} />)
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled()
    day(4).focus()
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}')
    expect(onAccept).toHaveBeenCalledWith([new Date(2024, 6, 4), new Date(2024, 6, 6)])
    expect(screen.getByRole('button', { name: 'OK' })).toBeEnabled()
  })

  it('localizes the action labels', () => {
    render(<DatePicker onAccept={() => {}} okLabel="決定" cancelLabel="キャンセル" />)
    expect(screen.getByRole('button', { name: '決定' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
  })
})

function ModalHarness({
  onAccept,
  onClose,
  initial = new Date(2024, 6, 4),
}: {
  onAccept?: (v: Date | DateRange) => void
  onClose?: (reason: DatePickerCloseReason) => void
  initial?: Date | null
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date | null>(initial)
  const [saved, setSaved] = useState<Date | null>(initial)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Pick
      </button>
      <output>{saved ? saved.toDateString() : 'none'}</output>
      <DatePicker
        open={open}
        value={draft}
        onChange={(v) => setDraft(v as Date)}
        onAccept={(v) => {
          setSaved(v as Date)
          onAccept?.(v)
        }}
        onClose={(reason) => {
          setOpen(false)
          onClose?.(reason)
        }}
      />
    </>
  )
}

describe('DatePicker modal (open)', () => {
  it('renders nothing while closed', () => {
    render(<DatePicker open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('opens as a labelled modal dialog with focus on the selected day', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    const dialog = screen.getByRole('dialog', { name: 'Select date' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(document.activeElement).toHaveAccessibleName('Thursday, July 4, 2024')
    expect(within(dialog).getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('commits with OK, closes with reason accept and restores focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    await user.click(day(12))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(onClose).toHaveBeenCalledWith('accept')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Fri Jul 12 2024')
    expect(screen.getByRole('button', { name: 'Pick' })).toHaveFocus()
  })

  it('Enter on a day saves and closes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onClose).toHaveBeenCalledWith('accept')
    expect(screen.getByRole('status')).toHaveTextContent('Thu Jul 11 2024')
  })

  it.each([
    ['Cancel', 'cancel'],
    ['Escape', 'escapeKeyDown'],
    ['scrim', 'backdropClick'],
  ] as const)('dismisses with %s, reverting the draft', async (how, reason) => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onAccept = vi.fn()
    const { container } = render(<ModalHarness onClose={onClose} onAccept={onAccept} />)
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    await user.click(day(20))
    if (how === 'Cancel') await user.click(screen.getByRole('button', { name: 'Cancel' }))
    else if (how === 'Escape') await user.keyboard('{Escape}')
    else await user.click(container.querySelector('[class*=scrim]') as HTMLElement)
    expect(onClose).toHaveBeenCalledWith(reason)
    expect(onAccept).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Thu Jul 04 2024')
    // Reopening shows the committed date again, not the discarded draft.
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    expect(day(4)).toHaveAttribute('aria-selected', 'true')
    expect(day(20)).toHaveAttribute('aria-selected', 'false')
  })

  it('traps focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('has no axe violations while open', async () => {
    const user = userEvent.setup()
    const { container } = render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
