import { createRef, useState, type ChangeEvent } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Select, type NativeSelectProps } from './Select'

function Fruit(props: Partial<NativeSelectProps>) {
  return (
    <Select native label="Fruit" {...props}>
      <option value="" />
      <option value="apple">Apple</option>
      <optgroup label="Berries">
        <option value="blueberry">Blueberry</option>
        <option value="cherry" disabled>
          Cherry
        </option>
      </optgroup>
      <option value="grape">Grape</option>
    </Select>
  )
}

const select = () => screen.getByRole('combobox') as HTMLSelectElement
const root = () => select().closest('[data-native]') as HTMLElement
const isEmpty = () => root().hasAttribute('data-empty')

describe('Select native (B53)', () => {
  it('renders a real <select> with native options and no listbox', () => {
    render(<Fruit />)
    expect(select().tagName).toBe('SELECT')
    expect(select().options).toHaveLength(5)
    expect(screen.getByRole('group', { name: 'Berries' })).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('names the select with the label and describes it with the supporting text', () => {
    render(<Fruit supportingText="Pick one" />)
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toBe(select())
    expect(select()).toHaveAccessibleDescription('Pick one')
  })

  it('forwards ref to the root and inputRef to the <select> (A10)', () => {
    const ref = createRef<HTMLDivElement>()
    const inputRef = createRef<HTMLSelectElement>()
    render(
      <Select native label="Fruit" ref={ref} inputRef={inputRef}>
        <option value="a">A</option>
      </Select>,
    )
    expect(ref.current).toBe(root())
    expect(inputRef.current).toBe(select())
  })

  it('puts className / style on the root and other attributes on the <select>', () => {
    render(<Fruit className="custom" style={{ width: 300 }} data-testid="s" autoComplete="off" />)
    expect(root()).toHaveClass('custom')
    expect(root().style.width).toBe('300px')
    expect(screen.getByTestId('s')).toBe(select())
    expect(select()).toHaveAttribute('autocomplete', 'off')
  })

  it('uncontrolled: onChange gets the native event and the value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn((event: ChangeEvent<HTMLSelectElement>, value: string) => {
      expect(event.target).toBe(select())
      expect(event.target.value).toBe(value)
    })
    render(<Fruit onChange={onChange} />)
    await user.selectOptions(select(), 'grape')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][1]).toBe('grape')
    expect(select().value).toBe('grape')
    expect(isEmpty()).toBe(false)
  })

  it('controlled: follows value and stays put when the parent ignores the change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<Fruit value="apple" onChange={onChange} />)
    expect(select().value).toBe('apple')
    await user.selectOptions(select(), 'grape')
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'grape')
    expect(select().value).toBe('apple')
    rerender(<Fruit value="" onChange={onChange} />)
    expect(select().value).toBe('')
    expect(isEmpty()).toBe(true)
  })

  it('controlled: updates with state', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [value, setValue] = useState('apple')
      return <Fruit value={value} onChange={(_, next) => setValue(next)} />
    }
    render(<Controlled />)
    await user.selectOptions(select(), 'blueberry')
    expect(select().value).toBe('blueberry')
    expect(isEmpty()).toBe(false)
  })

  describe('label state', () => {
    it('an empty first option counts as empty (label rests)', () => {
      render(<Fruit />)
      expect(select().value).toBe('')
      expect(isEmpty()).toBe(true)
    })

    it('a non-empty value floats the label', () => {
      render(<Fruit defaultValue="apple" />)
      expect(isEmpty()).toBe(false)
    })

    it('without an empty option, the first enabled option is selected (populated)', () => {
      render(
        <Select native label="Fruit">
          <option value="apple" disabled>
            Apple
          </option>
          <option value="banana">Banana</option>
        </Select>,
      )
      expect(select().value).toBe('banana')
      expect(isEmpty()).toBe(false)
    })

    it('focus floats the label', async () => {
      const user = userEvent.setup()
      render(<Fruit />)
      await user.tab()
      expect(select()).toHaveFocus()
      expect(root().className).toMatch(/focused/)
    })
  })

  describe('form', () => {
    it('submits name / value natively', async () => {
      const user = userEvent.setup()
      render(
        <form data-testid="form">
          <Fruit name="fruit" defaultValue="apple" />
        </form>,
      )
      const form = screen.getByTestId('form') as HTMLFormElement
      expect(new FormData(form).get('fruit')).toBe('apple')
      await user.selectOptions(select(), 'grape')
      expect(new FormData(form).get('fruit')).toBe('grape')
    })

    it('honours the form attribute', () => {
      render(
        <>
          <form id="outer" data-testid="form" />
          <Fruit name="fruit" form="outer" defaultValue="grape" />
        </>,
      )
      const form = screen.getByTestId('form') as HTMLFormElement
      expect(new FormData(form).get('fruit')).toBe('grape')
    })

    it('required: an empty value fails constraint validation', async () => {
      const user = userEvent.setup()
      render(<Fruit required />)
      expect(select()).toBeRequired()
      expect(select().checkValidity()).toBe(false)
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
      await user.selectOptions(select(), 'apple')
      expect(select().checkValidity()).toBe(true)
    })

    it('disabled: not submitted and not focusable', () => {
      render(
        <form data-testid="form">
          <Fruit name="fruit" defaultValue="apple" disabled />
        </form>,
      )
      expect(select()).toBeDisabled()
      expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('fruit')).toBeNull()
    })

    it('reset: uncontrolled returns to defaultValue without onChange', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <form data-testid="form">
          <Fruit name="fruit" defaultValue="apple" onChange={onChange} />
        </form>,
      )
      await user.selectOptions(select(), 'grape')
      onChange.mockClear()
      await act(async () => {
        ;(screen.getByTestId('form') as HTMLFormElement).reset()
      })
      expect(select().value).toBe('apple')
      expect(onChange).not.toHaveBeenCalled()
      expect(isEmpty()).toBe(false)
    })

    it('reset: uncontrolled without defaultValue returns to the empty option', async () => {
      const user = userEvent.setup()
      render(
        <form data-testid="form">
          <Fruit name="fruit" />
        </form>,
      )
      await user.selectOptions(select(), 'grape')
      expect(isEmpty()).toBe(false)
      await act(async () => {
        ;(screen.getByTestId('form') as HTMLFormElement).reset()
      })
      expect(select().value).toBe('')
      expect(isEmpty()).toBe(true)
    })

    it('reset: a controlled value survives', async () => {
      render(
        <form data-testid="form">
          <Fruit name="fruit" value="grape" onChange={() => {}} />
        </form>,
      )
      await act(async () => {
        ;(screen.getByTestId('form') as HTMLFormElement).reset()
      })
      expect(select().value).toBe('grape')
      expect(isEmpty()).toBe(false)
    })
  })

  it('error: aria-invalid and the error text as an alert', () => {
    render(<Fruit error errorText="Required" supportingText="Pick one" />)
    expect(select()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
    expect(select()).toHaveAccessibleDescription('Required')
  })

  it('a click on the field padding focuses the select and asks for the picker', async () => {
    const user = userEvent.setup()
    const showPicker = vi.fn()
    render(<Fruit />)
    select().showPicker = showPicker
    const arrow = root().querySelector('svg')!.parentElement!
    await user.click(arrow)
    expect(select()).toHaveFocus()
    expect(showPicker).toHaveBeenCalledTimes(1)
  })

  it('the listbox Select is unchanged without native', () => {
    render(<Select label="Plain" />)
    expect(screen.getByRole('combobox').tagName).toBe('DIV')
  })

  describe('a11y', () => {
    it.each([
      ['empty', {}],
      ['filled with value', { defaultValue: 'apple', supportingText: 'Pick one' }],
      ['outlined', { variant: 'outlined' as const, defaultValue: 'apple' }],
      ['error', { error: true, errorText: 'Required', required: true }],
      ['disabled', { disabled: true, defaultValue: 'apple' }],
    ])('has no axe violations (%s)', async (_, props) => {
      const { container } = render(<Fruit {...props} />)
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
