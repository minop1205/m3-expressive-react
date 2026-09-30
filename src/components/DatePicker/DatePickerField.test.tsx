import { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { DatePickerField } from './DatePickerField'
import { getDatePattern, parseDateInput } from './dateUtils'

const toggle = () => screen.getByRole('button', { name: 'Open calendar' })

describe('DatePickerField', () => {
  it('renders a labelled text field with the format as helper text', () => {
    render(<DatePickerField label="Birthday" />)
    const input = screen.getByRole('textbox', { name: 'Birthday' })
    expect(input).toHaveAccessibleDescription('MM/DD/YYYY')
  })

  it('states the locale format', () => {
    render(<DatePickerField locale="de-DE" />)
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('DD.MM.YYYY')
  })

  it('wires the toggle to the popup dialog', async () => {
    const user = userEvent.setup()
    render(<DatePickerField />)
    expect(toggle()).toHaveAttribute('aria-haspopup', 'dialog')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    // Nothing rendered while closed.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    await user.click(toggle())
    const dialog = screen.getByRole('dialog', { name: 'Choose date' })
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(toggle()).toHaveAttribute('aria-controls', dialog.id)
  })

  it('positions the popup below the field via the shared popup helper', async () => {
    const user = userEvent.setup()
    const { container } = render(<DatePickerField />)
    const field = container.firstElementChild as HTMLElement
    vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({
      top: 100, bottom: 180, left: 40, right: 320, width: 280, height: 80,
    } as DOMRect)
    await user.click(toggle())
    const popup = screen.getByRole('dialog')
    // Fixed coordinates: 4dp under the field, start-aligned.
    expect(popup.style.top).toBe('184px')
    expect(popup.style.left).toBe('40px')
  })

  it('moves focus to the selected day on open', async () => {
    const user = userEvent.setup()
    render(<DatePickerField defaultValue={new Date(2024, 6, 10)} />)
    await user.click(toggle())
    expect(document.activeElement).toHaveAccessibleName('Wednesday, July 10, 2024')
  })

  it('moves focus to today when nothing is selected', async () => {
    const user = userEvent.setup()
    render(<DatePickerField />)
    await user.click(toggle())
    expect(document.activeElement).toHaveAttribute('aria-current', 'date')
  })

  it('selects a date from the calendar, closes and restores focus to the toggle', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField defaultValue={new Date(2024, 6, 1)} onChange={onChange} />)
    await user.click(toggle())
    await user.click(screen.getByRole('gridcell', { name: /July 12, 2024/ }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].getDate()).toBe(12)
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveFocus()
    expect(screen.getByRole('textbox')).toHaveValue('07/12/2024')
  })

  it('selects with the keyboard', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField defaultValue={new Date(2024, 6, 1)} onChange={onChange} />)
    await user.click(toggle())
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 6, 8))
    expect(toggle()).toHaveFocus()
  })

  it('closes on Escape and returns focus to the toggle', async () => {
    const user = userEvent.setup()
    render(<DatePickerField />)
    await user.click(toggle())
    await user.keyboard('{ArrowRight}{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toggle()).toHaveFocus()
  })

  it('keeps an enclosing Escape handler from firing', async () => {
    const user = userEvent.setup()
    const outer = vi.fn()
    render(
      <div onKeyDown={(e) => e.key === 'Escape' && outer()}>
        <DatePickerField />
      </div>,
    )
    await user.click(toggle())
    await user.keyboard('{Escape}')
    expect(outer).not.toHaveBeenCalled()
  })

  it('closes when focus leaves the field', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DatePickerField />
        <button type="button">After</button>
      </>,
    )
    await user.click(toggle())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'After' }).focus())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('stays open while paging months with the keyboard', async () => {
    const user = userEvent.setup()
    render(<DatePickerField defaultValue={new Date(2024, 6, 10)} />)
    await user.click(toggle())
    await user.keyboard('{PageDown}')
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.activeElement).toHaveAccessibleName('Saturday, August 10, 2024')
  })

  it('closes on an outside click', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DatePickerField />
        <p>Outside</p>
      </>,
    )
    await user.click(toggle())
    await user.click(screen.getByText('Outside'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not commit while typing; parses on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, '2')
    expect(onChange).not.toHaveBeenCalled()
    await user.type(input, '/5/2024')
    expect(onChange).not.toHaveBeenCalled()
    await user.tab()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 1, 5))
    // Formatted on commit.
    expect(input).toHaveValue('02/05/2024')
  })

  it('parses on Enter in the locale order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField locale="en-GB" onChange={onChange} />)
    await user.type(screen.getByRole('textbox'), '4.7.2024{Enter}')
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 6, 4))
    expect(screen.getByRole('textbox')).toHaveValue('04/07/2024')
  })

  it('accepts ISO dates in any locale', () => {
    const onChange = vi.fn()
    render(<DatePickerField onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '2024-07-04' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 6, 4))
  })

  it('shows an error for text that is not a date', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, '13/45/2024{Enter}')
    expect(onChange).not.toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Date does not match expected pattern: MM/DD/YYYY',
    )
    // Editing clears the error until the next commit.
    await user.type(input, '{Backspace}')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('rejects dates outside min / max', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DatePickerField
        min={new Date(2024, 0, 1)}
        max={new Date(2024, 11, 31)}
        onChange={onChange}
        getErrorLabel={(e) => (e === 'outOfRange' ? '範囲外です' : '形式が違います')}
      />,
    )
    await user.type(screen.getByRole('textbox'), '01/01/2025{Enter}')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('範囲外です')
  })

  it('clears the value when the text is emptied', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField defaultValue={new Date(2024, 6, 4)} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.tab()
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('uses the docked layout: month and year menus with their own arrows', async () => {
    const user = userEvent.setup()
    render(<DatePickerField defaultValue={new Date(2024, 6, 10)} />)
    await user.click(toggle())
    const dialog = screen.getByRole('dialog')
    // No modal headline header.
    expect(within(dialog).queryByText('Select date')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Jul' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(dialog).getByRole('button', { name: '2024' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Next year' }))
    expect(within(dialog).getByRole('grid', { name: 'July 2025' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Previous month' }))
    expect(within(dialog).getByRole('grid', { name: 'June 2025' })).toBeInTheDocument()
  })

  it('shows neighbouring-month days without making them selectable', async () => {
    const user = userEvent.setup()
    render(<DatePickerField defaultValue={new Date(2024, 6, 10)} />)
    await user.click(toggle())
    // July 2024 starts on a Monday: 30 June fills the first cell.
    const firstWeek = within(screen.getByRole('grid')).getAllByRole('row')[1]
    const first = within(firstWeek).getAllByRole('gridcell')[0]
    expect(first).toHaveTextContent('30')
    expect(first.tagName).toBe('SPAN')
    expect(first).not.toHaveAccessibleName()
  })

  it('picks a month from the month menu', async () => {
    const user = userEvent.setup()
    render(<DatePickerField defaultValue={new Date(2024, 6, 10)} />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Jul' }))
    const list = screen.getByRole('listbox', { name: 'Select month' })
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(within(list).getAllByRole('option')).toHaveLength(12)
    expect(screen.getByRole('option', { name: 'July' })).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(screen.getByRole('grid', { name: 'September 2024' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sep' })).toHaveFocus()
    // Still open; the value is unchanged until a day is picked.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('picks a year from the year menu', async () => {
    const user = userEvent.setup()
    render(
      <DatePickerField
        defaultValue={new Date(2024, 6, 10)}
        min={new Date(2020, 0, 1)}
        max={new Date(2035, 11, 31)}
      />,
    )
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: '2024' }))
    expect(screen.getByRole('listbox', { name: 'Select year' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '2024' })).toHaveFocus()
    await user.click(screen.getByRole('option', { name: '2031' }))
    expect(screen.getByRole('grid', { name: 'July 2031' })).toBeInTheDocument()
  })

  it('has no axe violations with the month menu open', async () => {
    const user = userEvent.setup()
    const { container } = render(<DatePickerField defaultValue={new Date(2024, 6, 10)} />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Jul' }))
    expect(await axe(container)).toHaveNoViolations()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DatePickerField ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('passes HTML attributes through to the root element', () => {
    render(
      <DatePickerField
        data-testid="date-field"
        style={{ marginTop: 8 }}
        aria-label="Pick a date"
      />,
    )
    const root = screen.getByTestId('date-field')
    expect(root).toHaveStyle({ marginTop: '8px' })
    expect(root).toHaveAttribute('aria-label', 'Pick a date')
  })

  it('merges a custom className with the internal one', () => {
    render(<DatePickerField data-testid="date-field" className="custom" />)
    const root = screen.getByTestId('date-field')
    expect(root).toHaveClass('custom')
    expect(root.className.split(' ').length).toBeGreaterThan(1)
  })

  it('has no axe violations', async () => {
    const { container } = render(<DatePickerField label="Date" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations with the popup open', async () => {
    const user = userEvent.setup()
    const { container } = render(<DatePickerField label="Date" />)
    await user.click(toggle())
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('date input parsing', () => {
  it('derives the pattern from the locale', () => {
    expect(getDatePattern('en-US')).toBe('MM/DD/YYYY')
    expect(getDatePattern('en-GB')).toBe('DD/MM/YYYY')
    expect(getDatePattern('de-DE')).toBe('DD.MM.YYYY')
    expect(getDatePattern('ja-JP')).toBe('YYYY/MM/DD')
  })

  it('accepts any separator and optional leading zeros', () => {
    const expected = new Date(2024, 6, 4)
    for (const text of ['07/04/2024', '7/4/2024', '7-4-2024', '7.4.2024', '7 4 2024', ' 07 / 04 / 2024 ']) {
      expect(parseDateInput(text, 'en-US')).toEqual(expected)
    }
    expect(parseDateInput('4/7/2024', 'en-GB')).toEqual(expected)
    expect(parseDateInput('2024/7/4', 'ja-JP')).toEqual(expected)
    expect(parseDateInput('2024. 07. 04.', 'ko-KR')).toEqual(expected)
  })

  it('rejects partial, impossible and non-numeric input', () => {
    for (const text of ['2', '7/4', '7/4/24', '2/30/2024', '13/1/2024', 'July 4 2024', '7/4/2024x']) {
      expect(parseDateInput(text, 'en-US')).toBeNull()
    }
    expect(parseDateInput('2/29/2024', 'en-US')).toEqual(new Date(2024, 1, 29))
  })
})
