import { useState, type FormEvent } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Autocomplete, type AutocompleteProps } from './Autocomplete'
import { Select, Option } from '../Select'

// Ruling B55 (#530 #531 #532 #535): why the text changed, Enter with no
// active option, keeping the selection while the text is edited, and
// `aria-required` without native validation.

const fruits = ['Apple', 'Banana', 'Grape']

function Fruit(props: Partial<AutocompleteProps>) {
  return <Autocomplete label="Fruit" options={fruits} {...props} />
}

const input = () => screen.getByRole('combobox')
const hidden = () => document.querySelector('input[name="fruit"]') as HTMLInputElement

describe('onInputChange reason (#530)', () => {
  it('tells typing, picking, the return to the label on blur / Enter, and clearing apart', async () => {
    const onInputChange = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <Fruit defaultValue="Apple" onInputChange={onInputChange} clearOnEscape />
        <button type="button">after</button>
      </>,
    )
    await user.click(input())
    await user.keyboard('{End}x')
    expect(onInputChange).toHaveBeenLastCalledWith(expect.anything(), 'Applex', 'input')
    await user.tab()
    expect(onInputChange).toHaveBeenLastCalledWith(expect.anything(), 'Apple', 'blur')

    await user.click(input())
    await user.keyboard('{End}zz{Enter}')
    expect(onInputChange).toHaveBeenLastCalledWith(expect.anything(), 'Apple', 'reset')

    await user.keyboard('{Backspace}{ArrowDown}{Enter}')
    expect(onInputChange).toHaveBeenLastCalledWith(expect.anything(), 'Apple', 'selectOption')

    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(onInputChange).toHaveBeenLastCalledWith(expect.anything(), '', 'clear')
  })

  it('lets a "pick then clear" field skip the pick', async () => {
    const user = userEvent.setup()
    const picked: string[] = []
    function AddField() {
      const [text, setText] = useState('')
      return (
        <Autocomplete
          label="Add fruit"
          options={fruits}
          value=""
          inputValue={text}
          onChange={(_, value) => {
            picked.push(value)
            setText('')
          }}
          onInputChange={(_, next, reason) => {
            if (reason !== 'selectOption') setText(next)
          }}
        />
      )
    }
    render(<AddField />)
    await user.type(input(), 'gr')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(picked).toEqual(['Grape'])
    expect(input()).toHaveValue('')
  })
})

describe('Enter with no active option (#531)', () => {
  function renderForm(props: Partial<AutocompleteProps> = {}) {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Fruit name="fruit" defaultValue="Apple" {...props} />
        <button type="submit">Go</button>
      </form>,
    )
    return onSubmit
  }

  it('does not submit the form while the list is open; the text returns to the label', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ noOptionsText: 'No match' })
    await user.click(input())
    await user.keyboard('{End}zz')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input()).toHaveValue('Apple')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(hidden()).toHaveValue('Apple')
  })

  it('does not submit half-typed text even when no option matches and the list is hidden', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    await user.click(input())
    await user.keyboard('{End}zz')
    expect(input()).toHaveAttribute('aria-expanded', 'false') // nothing matches, no noOptionsText
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input()).toHaveValue('Apple')
  })

  it('submits as usual when the text is the committed value and the list is closed', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    await user.click(input())
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('freeSolo: Enter commits the typed text and still submits the form', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ freeSolo: true })
    await user.click(input())
    await user.keyboard('{End}zz{Enter}')
    expect(hidden()).toHaveValue('Applezz')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('disableClearable (#532)', () => {
  it('keeps the value while the text is emptied, and restores the label on blur', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <Fruit name="fruit" defaultValue="Apple" disableClearable onChange={onChange} />
        <button type="button">after</button>
      </>,
    )
    await user.clear(input())
    expect(input()).toHaveValue('')
    expect(onChange).not.toHaveBeenCalled()
    expect(hidden()).toHaveValue('Apple')
    await user.tab()
    expect(input()).toHaveValue('Apple')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Escape with the list closed returns the edited text to the label (consumed), and is left alone otherwise', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Fruit
        defaultValue="Apple"
        disableClearable
        clearOnEscape
        noOptionsText="No match"
        onChange={onChange}
      />,
    )
    await user.click(input())
    await user.keyboard('{End}zz')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(fireEvent.keyDown(input(), { key: 'Escape' })).toBe(false) // closes the list
    expect(fireEvent.keyDown(input(), { key: 'Escape' })).toBe(false) // reverts the text
    expect(input()).toHaveValue('Apple')
    expect(onChange).not.toHaveBeenCalled()
    expect(fireEvent.keyDown(input(), { key: 'Escape' })).toBe(true) // nothing to revert
  })

  it('still changes the value when an option is picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit defaultValue="Apple" disableClearable onChange={onChange} />)
    await user.clear(input())
    await user.type(input(), 'gr')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'Grape')
    expect(input()).toHaveValue('Grape')
  })
})

describe('aria-required without native validation (#535)', () => {
  it('Autocomplete: aria-required and the asterisk, but the form stays valid', () => {
    render(
      <form data-testid="form">
        <Fruit name="fruit" aria-required />
      </form>,
    )
    expect(input()).toHaveAttribute('aria-required', 'true')
    expect(input()).toHaveAccessibleName('Fruit')
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(hidden()).not.toBeRequired()
    expect((screen.getByTestId('form') as HTMLFormElement).checkValidity()).toBe(true)
  })

  it('Autocomplete: required keeps the native constraint', () => {
    render(
      <form data-testid="form">
        <Fruit name="fruit" required />
      </form>,
    )
    expect(hidden()).toBeRequired()
    expect((screen.getByTestId('form') as HTMLFormElement).checkValidity()).toBe(false)
  })

  it('Select: aria-required alone marks the combobox and shows the asterisk', () => {
    render(
      <form data-testid="form">
        <Select label="Fruit" name="fruit" aria-required>
          <Option value="a">Apple</Option>
        </Select>
      </form>,
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true')
    expect(screen.getByText('*')).toBeInTheDocument()
    expect((screen.getByTestId('form') as HTMLFormElement).checkValidity()).toBe(true)
  })
})
