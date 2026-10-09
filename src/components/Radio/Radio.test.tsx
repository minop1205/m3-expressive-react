import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Radio } from './Radio'

describe('Radio', () => {
  it('renders a radio role element', () => {
    render(<Radio aria-label="Option" name="g" />)
    expect(screen.getByRole('radio')).toBeInTheDocument()
  })

  it('defaults to unchecked', () => {
    render(<Radio aria-label="Option" name="g" />)
    expect(screen.getByRole('radio')).not.toBeChecked()
  })

  it('reflects checked prop', () => {
    render(<Radio aria-label="Option" name="g" checked onChange={() => {}} />)
    expect(screen.getByRole('radio')).toBeChecked()
  })

  it('fires onChange with (event, value) on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Radio aria-label="Option" name="g" value="opt" onChange={onChange} />)

    await user.click(screen.getByRole('radio'))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'opt')
  })

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<Radio aria-label="Option" name="g" disabled onChange={onChange} />)
    await user.click(screen.getByRole('radio'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLSpanElement>()
    const { container } = render(<Radio ref={ref} aria-label="Option" name="g" />)
    expect(ref.current).toBe(container.firstElementChild)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('forwards inputRef to the native input', () => {
    const inputRef = createRef<HTMLInputElement>()
    render(<Radio inputRef={inputRef} aria-label="Option" name="g" />)
    expect(inputRef.current).toBe(screen.getByRole('radio'))
  })

  it('works in a radio group', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <>
        <Radio aria-label="A" name="group" value="a" onChange={onChange} />
        <Radio aria-label="B" name="group" value="b" onChange={onChange} />
      </>,
    )
    const [a, b] = screen.getAllByRole('radio')

    await user.click(a)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'a')

    await user.click(b)
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'b')
  })

  it('has no axe violations (unchecked)', async () => {
    const { container } = render(<Radio aria-label="Option" name="g" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (checked)', async () => {
    const { container } = render(
      <Radio aria-label="Option" name="g" checked onChange={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Radio keyboard', () => {
  it('selects a focused unselected radio on Space', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Radio name="g" value="a" aria-label="A" />
        <Radio name="g" value="b" aria-label="B" />
      </>,
    )
    const a = screen.getByRole('radio', { name: 'A' })
    a.focus()

    await user.keyboard(' ')
    expect(a).toBeChecked()

    // Space on an already-selected radio is a no-op (stays selected)
    await user.keyboard(' ')
    expect(a).toBeChecked()
  })

  it('moves focus AND selection with ArrowDown/ArrowUp within a same-name group', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Radio name="g" value="a" defaultChecked aria-label="A" />
        <Radio name="g" value="b" aria-label="B" />
        <Radio name="g" value="c" aria-label="C" />
      </>,
    )
    const a = screen.getByRole('radio', { name: 'A' })
    const b = screen.getByRole('radio', { name: 'B' })
    a.focus()

    await user.keyboard('{ArrowDown}')
    expect(b).toBeChecked()
    expect(b).toHaveFocus()
    expect(a).not.toBeChecked()

    await user.keyboard('{ArrowUp}')
    expect(a).toBeChecked()
    expect(a).toHaveFocus()
    expect(b).not.toBeChecked()
  })

  it('keeps the group mutually exclusive on pointer selection', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Radio name="g" value="a" defaultChecked aria-label="A" />
        <Radio name="g" value="b" aria-label="B" />
        <Radio name="g" value="c" aria-label="C" />
      </>,
    )
    await user.click(screen.getByRole('radio', { name: 'C' }))
    expect(screen.getByRole('radio', { name: 'C' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'B' })).not.toBeChecked()
  })
})

describe('Radio form submission', () => {
  it('submits the selected radio value under the group name', () => {
    render(
      <form data-testid="form">
        <Radio name="flavor" value="vanilla" aria-label="Vanilla" />
        <Radio name="flavor" value="chocolate" defaultChecked aria-label="Chocolate" />
      </form>,
    )
    const fd = new FormData(screen.getByTestId('form') as HTMLFormElement)
    expect(fd.get('flavor')).toBe('chocolate')
  })

  it('submits nothing when no radio is selected', () => {
    render(
      <form data-testid="form">
        <Radio name="flavor" value="vanilla" aria-label="Vanilla" />
        <Radio name="flavor" value="chocolate" aria-label="Chocolate" />
      </form>,
    )
    const fd = new FormData(screen.getByTestId('form') as HTMLFormElement)
    expect(fd.has('flavor')).toBe(false)
  })
})

describe('Radio uncontrolled mode', () => {
  it('supports defaultChecked with native group exclusivity', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Radio name="g" value="a" defaultChecked aria-label="A" />
        <Radio name="g" value="b" aria-label="B" />
      </>,
    )
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'B' }))
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked()
  })
})

describe('Radio form reset (#432)', () => {
  it('keeps onChange firing after form.reset() (standalone, uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(
      <form>
        <Radio name="r" value="a" aria-label="A" defaultChecked />
        <Radio name="r" value="b" aria-label="B" onChange={onChange} />
      </form>,
    )
    const form = container.querySelector('form')!
    const a = screen.getByRole('radio', { name: 'A' })
    const b = screen.getByRole('radio', { name: 'B' })

    await user.click(b)
    act(() => form.reset())
    expect(a).toBeChecked()
    expect(b).not.toBeChecked()

    onChange.mockClear()
    await user.click(b)
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'b')
  })
})
