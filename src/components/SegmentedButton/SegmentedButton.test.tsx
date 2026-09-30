import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { SegmentedButton, SegmentedButtons } from './SegmentedButton'

const options = [
  { value: 'd', label: 'Day' },
  { value: 'w', label: 'Week' },
  { value: 'm', label: 'Month' },
]

const Icon = () => <svg data-testid="icon" />

describe('SegmentedButton', () => {
  it('renders single-select as a radiogroup of radios', () => {
    render(<SegmentedButton aria-label="View" options={options} value="w" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Week', checked: true })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Day', checked: false })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders multi-select as a group of aria-pressed toggle buttons', () => {
    render(
      <SegmentedButton aria-label="Style" multiSelect options={options} value={['w']} onChange={() => {}} />,
    )
    expect(screen.getByRole('group', { name: 'Style' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Week', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Day', pressed: false })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('selects a segment on click (single-select)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedButton options={options} value="w" onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'Month' }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'm')
  })

  it('toggles membership (multi-select)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedButton
        multiSelect
        options={options}
        value={['w']}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Day' }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), ['w', 'd'])
    await user.click(screen.getByRole('button', { name: 'Week' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), [])
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<SegmentedButton disabled options={options} value="w" onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'Day' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<SegmentedButton ref={ref} options={options} value="w" onChange={() => {}} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('keeps the deprecated SegmentedButtons alias', () => {
    expect(SegmentedButtons).toBe(SegmentedButton)
  })

  it('always renders the icon slot so selection does not add an element', () => {
    const { container, rerender } = render(
      <SegmentedButton options={options} value="" onChange={() => {}} />,
    )
    const count = () => container.querySelectorAll('button > *').length
    const before = count()
    rerender(<SegmentedButton options={options} value="w" onChange={() => {}} />)
    expect(count()).toBe(before)
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('data-check')
    expect(screen.getByRole('radio', { name: 'Day' })).not.toHaveAttribute('data-check')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <SegmentedButton
        aria-label="View"
        options={options}
        value="w"
        onChange={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (multi-select, segment disabled)', async () => {
    const { container } = render(
      <SegmentedButton
        aria-label="View"
        multiSelect
        options={[...options.slice(0, 2), { value: 'm', label: 'Month', disabled: true }]}
        value={['w', 'm']}
        onChange={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('SegmentedButton keyboard (single-select radiogroup)', () => {
  it('is a single Tab stop on the first segment regardless of selection', async () => {
    const user = userEvent.setup()
    render(
      <>
        <SegmentedButton aria-label="View" options={options} value="m" onChange={() => {}} />
        <button type="button">After</button>
      </>,
    )
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveAttribute('tabindex', '-1')
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('moves focus with the arrow keys (wrapping) without selecting', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedButton aria-label="View" options={options} value="w" onChange={onChange} />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
    // The roving tab stop follows focus.
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveAttribute('tabindex', '-1')
  })

  it('selects the focused segment with Space and Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedButton aria-label="View" options={options} defaultValue="d" onChange={onChange} />)
    await user.tab()
    await user.keyboard('{ArrowRight} ')
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'w')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'm')
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveAttribute('aria-checked', 'true')
  })

  it('skips disabled segments and starts on the first enabled one', async () => {
    const user = userEvent.setup()
    render(
      <SegmentedButton
        aria-label="View"
        options={[
          { value: 'd', label: 'Day', disabled: true },
          { value: 'w', label: 'Week' },
          { value: 'x', label: 'Fortnight', disabled: true },
          { value: 'm', label: 'Month' },
        ]}
        value="m"
        onChange={() => {}}
      />,
    )
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveFocus()
  })

  it('mirrors Left / Right in RTL', async () => {
    const user = userEvent.setup()
    render(
      <div dir="rtl" style={{ direction: 'rtl' }}>
        <SegmentedButton aria-label="View" options={options} value="w" onChange={() => {}} />
      </div>,
    )
    await user.tab()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveFocus()
    // Up / Down are not mirrored.
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveFocus()
  })

  it('composes a consumer onKeyDown', async () => {
    const user = userEvent.setup()
    const onKeyDown = vi.fn()
    render(
      <SegmentedButton aria-label="View" options={options} value="w" onChange={() => {}} onKeyDown={onKeyDown} />,
    )
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(onKeyDown).toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveFocus()
  })
})

describe('SegmentedButton keyboard (multi-select)', () => {
  it('keeps every segment in the Tab order and also moves with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<SegmentedButton aria-label="Style" multiSelect options={options} value={[]} onChange={() => {}} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Day' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Week' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'Week' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Day' })).not.toHaveAttribute('tabindex')
  })
})

describe('SegmentedButton icon-only segments', () => {
  const iconOptions = [
    { value: 'cheap', icon: <Icon />, ariaLabel: 'Inexpensive' },
    { value: 'pricey', icon: <Icon />, ariaLabel: 'Expensive' },
  ]

  it('names segments with ariaLabel', () => {
    render(<SegmentedButton aria-label="Price" options={iconOptions} value="cheap" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Inexpensive', checked: true })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Expensive', checked: false })).toBeInTheDocument()
  })

  it('keeps the icon while selected and shows the check beside it', () => {
    render(<SegmentedButton aria-label="Price" options={iconOptions} value="cheap" onChange={() => {}} />)
    const selected = screen.getByRole('radio', { name: 'Inexpensive' })
    expect(selected.querySelector('[data-testid="icon"]')).not.toBeNull()
    expect(selected).toHaveAttribute('data-check')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <SegmentedButton aria-label="Price" options={iconOptions} value="cheap" onChange={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('crossfades icon + label segments (both icon and check rendered while selected)', () => {
    render(
      <SegmentedButton
        aria-label="View"
        options={[{ value: 'd', label: 'Day', icon: <Icon /> }]}
        value="d"
        onChange={() => {}}
      />,
    )
    const seg = screen.getByRole('radio', { name: 'Day' })
    expect(seg).toHaveAttribute('data-slot-filled')
    expect(seg).toHaveAttribute('data-check')
    expect(seg.querySelectorAll('[data-testid="icon"]')).toHaveLength(1)
  })
})

describe('SegmentedButton uncontrolled mode', () => {
  it('single-select updates from defaultValue', async () => {
    const user = userEvent.setup()
    render(
      <SegmentedButton
        aria-label="View"
        defaultValue="day"
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ]}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: 'Week' }))
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'false')
  })

  it('multi-select accumulates from an empty default', async () => {
    const user = userEvent.setup()
    render(
      <SegmentedButton
        aria-label="Toppings"
        multiSelect
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'A' }))
    await user.click(screen.getByRole('button', { name: 'B' }))
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true')
  })
})
