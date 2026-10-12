import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Option, Select, type SelectProps } from './Select'

function Fruit(props: Partial<SelectProps>) {
  return (
    <Select label="Fruit" {...props}>
      <Option value="apple">Apple</Option>
      <Option value="banana">Banana</Option>
      <Option value="blueberry">Blueberry</Option>
      <Option value="cherry" disabled>
        Cherry
      </Option>
      <Option value="grape">Grape</Option>
    </Select>
  )
}

const combobox = () => screen.getByRole('combobox')
const listbox = () => screen.getByRole('listbox', { hidden: true })
const option = (name: string) => screen.getByRole('option', { name, hidden: true })
const activeOption = () => {
  const id = combobox().getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

describe('Select', () => {
  it('renders an APG select-only combobox named by its label', () => {
    render(<Fruit />)
    const cb = combobox()
    expect(cb).toHaveAccessibleName('Fruit')
    expect(cb).toHaveAttribute('aria-haspopup', 'listbox')
    expect(cb).toHaveAttribute('aria-expanded', 'false')
    expect(cb).toHaveAttribute('aria-controls', listbox().id)
    expect(cb).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(5)
  })

  it('names the open listbox by the label', () => {
    render(<Fruit defaultOpen />)
    expect(screen.getByRole('listbox')).toHaveAccessibleName('Fruit')
  })

  it('keeps the required asterisk out of the accessible name', () => {
    render(<Fruit required />)
    expect(combobox()).toHaveAccessibleName('Fruit')
    expect(combobox()).toHaveAttribute('aria-required', 'true')
  })

  it('opens on click, selects an option and closes (uncontrolled)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit onChange={onChange} />)
    await user.click(combobox())
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    expect(combobox()).toHaveFocus()
    await user.click(option('Banana'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][1]).toBe('banana')
    expect(onChange.mock.calls[0][0]).toHaveProperty('type', 'click')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(combobox()).toHaveTextContent('Banana')
    expect(combobox()).toHaveFocus()
    expect(option('Banana')).toHaveAttribute('aria-selected', 'true')
  })

  it('toggles closed when the field is clicked again', async () => {
    const user = userEvent.setup()
    render(<Fruit />)
    await user.click(combobox())
    await user.click(combobox())
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not fire onChange when re-selecting the current value', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit defaultValue="apple" onChange={onChange} />)
    await user.click(combobox())
    await user.click(option('Apple'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores clicks on disabled options', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<Fruit onChange={onChange} />)
    await user.click(combobox())
    expect(option('Cherry')).toHaveAttribute('aria-disabled', 'true')
    await user.click(option('Cherry'))
    expect(onChange).not.toHaveBeenCalled()
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on an outside press without selecting', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <Fruit onChange={onChange} />
        <button>Outside</button>
      </>,
    )
    await user.click(combobox())
    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState('grape')
      return (
        <>
          <Fruit value={value} onChange={(_, v) => setValue(v)} />
          <span data-testid="value">{value}</span>
        </>
      )
    }
    const user = userEvent.setup()
    render(<Controlled />)
    expect(combobox()).toHaveTextContent('Grape')
    await user.click(combobox())
    expect(activeOption()).toBe(option('Grape'))
    await user.click(option('Apple'))
    expect(screen.getByTestId('value')).toHaveTextContent('apple')
    expect(combobox()).toHaveTextContent('Apple')
  })

  it('does not change a controlled value without the parent updating it', async () => {
    const user = userEvent.setup()
    render(<Fruit value="apple" onChange={() => {}} />)
    await user.click(combobox())
    await user.click(option('Banana'))
    expect(combobox()).toHaveTextContent('Apple')
  })

  it('supports controlled open state', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<Fruit open={false} onOpenChange={onOpenChange} />)
    await user.click(combobox())
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    rerender(<Fruit open onOpenChange={onOpenChange} defaultValue="banana" />)
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    expect(activeOption()).toBe(option('Apple'))
  })

  it('opens from defaultOpen on the selected option', () => {
    render(<Fruit defaultOpen defaultValue="blueberry" />)
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    expect(activeOption()).toBe(option('Blueberry'))
  })

  it('shows the placeholder while nothing is selected', () => {
    render(<Fruit placeholder="Pick one" />)
    expect(combobox()).toHaveTextContent('Pick one')
  })

  describe('keyboard', () => {
    it('opens with ArrowDown / Enter / Space on the selected (or first) option', async () => {
      const user = userEvent.setup()
      render(<Fruit defaultValue="banana" />)
      combobox().focus()
      await user.keyboard('{ArrowDown}')
      expect(combobox()).toHaveAttribute('aria-expanded', 'true')
      expect(activeOption()).toBe(option('Banana'))
      await user.keyboard('{Escape}')
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
      expect(combobox()).not.toHaveAttribute('aria-activedescendant')
      await user.keyboard('{Enter}')
      expect(combobox()).toHaveAttribute('aria-expanded', 'true')
      await user.keyboard('{Escape}')
      await user.keyboard(' ')
      expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    })

    it('opens on the first option when nothing is selected', async () => {
      const user = userEvent.setup()
      render(<Fruit />)
      combobox().focus()
      await user.keyboard('{ArrowUp}')
      expect(activeOption()).toBe(option('Apple'))
    })

    it('moves without wrapping and skips disabled options', async () => {
      const user = userEvent.setup()
      render(<Fruit />)
      combobox().focus()
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')
      expect(activeOption()).toBe(option('Apple'))
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(activeOption()).toBe(option('Blueberry'))
      await user.keyboard('{ArrowDown}')
      expect(activeOption()).toBe(option('Grape'))
      await user.keyboard('{ArrowDown}')
      expect(activeOption()).toBe(option('Grape'))
      await user.keyboard('{ArrowUp}')
      expect(activeOption()).toBe(option('Blueberry'))
    })

    it('jumps with Home / End (also opening the listbox)', async () => {
      const user = userEvent.setup()
      render(<Fruit defaultValue="banana" />)
      combobox().focus()
      await user.keyboard('{End}')
      expect(combobox()).toHaveAttribute('aria-expanded', 'true')
      expect(activeOption()).toBe(option('Grape'))
      await user.keyboard('{Home}')
      expect(activeOption()).toBe(option('Apple'))
    })

    it('selects with Enter and keeps focus on the combobox', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      render(<Fruit onChange={onChange} />)
      combobox().focus()
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
      expect(onChange).toHaveBeenCalledWith(expect.anything(), 'banana')
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
      expect(combobox()).toHaveTextContent('Banana')
      expect(combobox()).toHaveFocus()
    })

    it('selects with Space and Alt+ArrowUp', async () => {
      const user = userEvent.setup()
      render(<Fruit />)
      combobox().focus()
      await user.keyboard('{ArrowDown}{ArrowDown} ')
      expect(combobox()).toHaveTextContent('Banana')
      await user.keyboard('{ArrowDown}{ArrowDown}{Alt>}{ArrowUp}{/Alt}')
      expect(combobox()).toHaveTextContent('Blueberry')
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    })

    it('Escape closes without selecting and is consumed', async () => {
      const onChange = vi.fn()
      const onDocKeyDown = vi.fn((event: KeyboardEvent) => event.defaultPrevented)
      document.addEventListener('keydown', onDocKeyDown)
      const user = userEvent.setup()
      render(<Fruit onChange={onChange} />)
      combobox().focus()
      await user.keyboard('{ArrowDown}{ArrowDown}{Escape}')
      expect(onChange).not.toHaveBeenCalled()
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
      expect(onDocKeyDown).toHaveLastReturnedWith(true)
      // Closed: Escape is left alone (an enclosing dialog may close).
      await user.keyboard('{Escape}')
      expect(onDocKeyDown).toHaveLastReturnedWith(false)
      document.removeEventListener('keydown', onDocKeyDown)
    })

    it('Tab commits the active option, closes and moves focus on', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      render(
        <>
          <Fruit onChange={onChange} />
          <button>Next</button>
        </>,
      )
      combobox().focus()
      await user.keyboard('{ArrowDown}{ArrowDown}')
      await user.tab()
      expect(onChange).toHaveBeenCalledWith(expect.anything(), 'banana')
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    })

    it('closes when focus moves away', () => {
      render(
        <>
          <Fruit defaultOpen />
          <button>Elsewhere</button>
        </>,
      )
      combobox().focus()
      act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    })

    it('typeahead opens on and cycles through matching options', async () => {
      const user = userEvent.setup()
      render(<Fruit />)
      combobox().focus()
      await user.keyboard('b')
      expect(combobox()).toHaveAttribute('aria-expanded', 'true')
      expect(activeOption()).toBe(option('Banana'))
      await user.keyboard('b')
      expect(activeOption()).toBe(option('Blueberry'))
    })

    it('typeahead matches a typed prefix and skips disabled options', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        render(<Fruit defaultOpen />)
        combobox().focus()
        await user.keyboard('bl')
        expect(activeOption()).toBe(option('Blueberry'))
        vi.advanceTimersByTime(1000)
        await user.keyboard('c')
        // Cherry is disabled: nothing matches, the active option stays.
        expect(activeOption()).toBe(option('Blueberry'))
      } finally {
        vi.useRealTimers()
      }
    })

    it('PageDown / PageUp jump by ten options', async () => {
      const user = userEvent.setup()
      render(
        <Select label="Number">
          {Array.from({ length: 30 }, (_, i) => (
            <Option key={i} value={String(i)}>
              {`Item ${i}`}
            </Option>
          ))}
        </Select>,
      )
      combobox().focus()
      await user.keyboard('{ArrowDown}{PageDown}')
      expect(activeOption()).toBe(option('Item 10'))
      await user.keyboard('{PageDown}{PageDown}{PageDown}')
      expect(activeOption()).toBe(option('Item 29'))
      await user.keyboard('{PageUp}')
      expect(activeOption()).toBe(option('Item 19'))
    })

    it('marks only the keyboard-active option as focus-visible', async () => {
      const user = userEvent.setup()
      render(<Fruit />)
      await user.click(combobox())
      expect(option('Apple')).toHaveAttribute('data-active')
      expect(option('Apple')).not.toHaveAttribute('data-focus-visible')
      await user.keyboard('{ArrowDown}')
      expect(option('Banana')).toHaveAttribute('data-focus-visible')
    })
  })

  describe('disabled', () => {
    it('is out of the tab order and never opens', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      render(<Fruit disabled name="fruit" defaultValue="apple" />)
      expect(combobox()).toHaveAttribute('aria-disabled', 'true')
      expect(combobox()).not.toHaveAttribute('tabindex')
      await user.click(combobox())
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
      fireEvent.keyDown(combobox(), { key: 'ArrowDown' })
      expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('forms', () => {
    it('submits the value under `name` through a native input', async () => {
      const user = userEvent.setup()
      let data: FormData | null = null
      render(
        <form
          data-testid="form"
          onSubmit={(event) => {
            event.preventDefault()
            data = new FormData(event.currentTarget)
          }}
        >
          <Fruit name="fruit" defaultValue="apple" />
          <button type="submit">Submit</button>
        </form>,
      )
      await user.click(combobox())
      await user.click(option('Grape'))
      await user.click(screen.getByRole('button', { name: 'Submit' }))
      expect(data!.get('fruit')).toBe('grape')
    })

    it('leaves a disabled Select out of the submission', () => {
      render(
        <form data-testid="form">
          <Fruit name="fruit" defaultValue="apple" disabled />
        </form>,
      )
      const data = new FormData(screen.getByTestId('form') as HTMLFormElement)
      expect(data.has('fruit')).toBe(false)
    })

    it('restores an uncontrolled value on form.reset()', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      render(
        <form data-testid="form">
          <Fruit name="fruit" defaultValue="apple" onChange={onChange} />
        </form>,
      )
      const form = screen.getByTestId('form') as HTMLFormElement
      await user.click(combobox())
      await user.click(option('Banana'))
      expect(combobox()).toHaveTextContent('Banana')
      onChange.mockClear()
      act(() => form.reset())
      expect(combobox()).toHaveTextContent('Apple')
      expect(new FormData(form).get('fruit')).toBe('apple')
      expect(onChange).not.toHaveBeenCalled()
      // Picking the pre-reset value again still registers as a change.
      await user.click(combobox())
      await user.click(option('Banana'))
      expect(onChange).toHaveBeenCalledWith(expect.anything(), 'banana')
    })

    it('honours the form attribute', () => {
      render(
        <>
          <form id="f" data-testid="form" />
          <Fruit name="fruit" defaultValue="grape" form="f" />
        </>,
      )
      const data = new FormData(screen.getByTestId('form') as HTMLFormElement)
      expect(data.get('fruit')).toBe('grape')
    })

    it('takes part in required validation', () => {
      render(
        <form data-testid="form">
          <Fruit name="fruit" required />
        </form>,
      )
      const form = screen.getByTestId('form') as HTMLFormElement
      expect(form.checkValidity()).toBe(false)
    })

    it('forwards inputRef to the native input and ref to the root', () => {
      const inputRef = { current: null as HTMLInputElement | null }
      const ref = { current: null as HTMLDivElement | null }
      render(
        <Select ref={ref} inputRef={inputRef} label="Fruit" name="fruit" defaultValue="apple">
          <Option value="apple">Apple</Option>
        </Select>,
      )
      expect(inputRef.current).toBeInstanceOf(HTMLInputElement)
      expect(inputRef.current!.value).toBe('apple')
      expect(ref.current).toContainElement(combobox())
    })
  })

  describe('error and supporting text', () => {
    it('describes the combobox with the supporting text, error replacing it', () => {
      const { rerender } = render(<Fruit supportingText="Pick a fruit" errorText="Required" />)
      expect(combobox()).toHaveAccessibleDescription('Pick a fruit')
      rerender(<Fruit supportingText="Pick a fruit" errorText="Required" error />)
      expect(combobox()).toHaveAccessibleDescription('Required')
      expect(combobox()).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('alert')).toHaveTextContent('Required')
    })
  })

  describe('accessibility', () => {
    it('has no axe violations (closed)', async () => {
      const { container } = render(
        <Fruit defaultValue="apple" supportingText="Helper" required />,
      )
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations (open, outlined, error)', async () => {
      const { container } = render(
        <Fruit variant="outlined" defaultOpen error errorText="Required" />,
      )
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations without a visible label', async () => {
      const { container } = render(
        <Select aria-label="Sort order" defaultValue="asc">
          <Option value="asc">Ascending</Option>
          <Option value="desc">Descending</Option>
        </Select>,
      )
      expect(combobox()).toHaveAccessibleName('Sort order')
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
