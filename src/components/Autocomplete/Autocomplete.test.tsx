import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import {
  Autocomplete,
  Option,
  type AutocompleteFilterState,
  type AutocompleteOptionItem,
  type AutocompleteProps,
} from './Autocomplete'

const fruits = [
  'Apple',
  'Banana',
  'Blueberry',
  { value: 'cherry', label: 'Cherry', disabled: true },
  'Grape',
]

function Fruit(props: Partial<AutocompleteProps>) {
  return <Autocomplete label="Fruit" options={fruits} {...props} />
}

const input = () => screen.getByRole('combobox')
const listbox = () => document.getElementById(input().getAttribute('aria-controls')!)!
const options = () => screen.queryAllByRole('option', { hidden: true })
const optionNames = () => options().map((o) => o.textContent)
const option = (name: string) => screen.getByRole('option', { name, hidden: true })
const toggle = () => screen.getByRole('button', { name: 'Toggle dropdown menu', hidden: true })
const activeOption = () => {
  const id = input().getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

describe('Autocomplete', () => {
  it('renders an APG editable combobox with list autocomplete', () => {
    render(<Fruit />)
    const cb = input()
    expect(cb.tagName).toBe('INPUT')
    expect(cb).toHaveAccessibleName('Fruit')
    expect(cb).toHaveAttribute('aria-autocomplete', 'list')
    expect(cb).toHaveAttribute('aria-expanded', 'false')
    expect(cb).toHaveAttribute('aria-controls', listbox().id)
    expect(cb).toHaveAttribute('autocomplete', 'off')
    expect(cb).not.toHaveAttribute('aria-activedescendant')
    expect(toggle()).toHaveAttribute('tabindex', '-1')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('names the listbox by the label and keeps the asterisk out of the name', () => {
    render(<Fruit required defaultOpen />)
    expect(input()).toHaveAccessibleName('Fruit')
    expect(input()).toHaveAttribute('aria-required', 'true')
    expect(screen.getByRole('listbox')).toHaveAccessibleName('Fruit')
  })

  it('typing opens a filtered listbox without activating an option', async () => {
    const onInputChange = vi.fn()
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit onInputChange={onInputChange} onOpenChange={onOpenChange} />)
    await user.type(input(), 'b')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(optionNames()).toEqual(['Banana', 'Blueberry'])
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    expect(input()).toHaveFocus()
    expect(onInputChange).toHaveBeenLastCalledWith(expect.anything(), 'b')
    await user.type(input(), 'lu')
    expect(optionNames()).toEqual(['Blueberry'])
  })

  it('filters ignoring case and accents, anywhere in the label', async () => {
    const user = userEvent.setup()
    render(<Autocomplete label="City" options={['Zürich', 'Genève', 'Bern']} />)
    await user.type(input(), 'ZUR')
    expect(optionNames()).toEqual(['Zürich'])
    await user.clear(input())
    await user.type(input(), 'nev')
    expect(optionNames()).toEqual(['Genève'])
  })

  it('ArrowDown opens on the first enabled option, moves (skipping disabled) and wraps', async () => {
    const user = userEvent.setup()
    render(<Fruit />)
    input().focus()
    await user.keyboard('{ArrowDown}')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(activeOption()).toHaveTextContent('Apple')
    expect(activeOption()).toHaveAttribute('data-focus-visible')
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(activeOption()).toHaveTextContent('Grape')
    await user.keyboard('{ArrowDown}')
    expect(activeOption()).toHaveTextContent('Apple')
    await user.keyboard('{ArrowUp}')
    expect(activeOption()).toHaveTextContent('Grape')
    expect(input()).toHaveFocus()
  })

  it('ArrowUp opens on the last option; Alt+ArrowDown opens without one', async () => {
    const user = userEvent.setup()
    render(<Fruit />)
    input().focus()
    await user.keyboard('{ArrowUp}')
    expect(activeOption()).toHaveTextContent('Grape')
    await user.keyboard('{Escape}')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(activeOption()).toBeNull()
  })

  it('Enter picks the active option: value, input text, and close', async () => {
    const onChange = vi.fn()
    const onInputChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit onChange={onChange} onInputChange={onInputChange} name="fruit" />)
    await user.type(input(), 'bl')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'Blueberry')
    expect(onInputChange).toHaveBeenLastCalledWith(expect.anything(), 'Blueberry')
    expect(input()).toHaveValue('Blueberry')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(document.querySelector('input[name="fruit"]')).toHaveValue('Blueberry')
  })

  it('opening on a picked value shows every option with the selected one checked', async () => {
    const user = userEvent.setup()
    render(<Fruit defaultValue="Banana" />)
    expect(input()).toHaveValue('Banana')
    input().focus()
    await user.keyboard('{ArrowDown}')
    expect(optionNames()).toHaveLength(5)
    expect(option('Banana')).toHaveAttribute('aria-selected', 'true')
    expect(activeOption()).toHaveTextContent('Banana')
  })

  it('clicking an option selects it and keeps focus in the input', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit onChange={onChange} />)
    await user.click(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    await user.click(option('Grape'))
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'Grape')
    expect(input()).toHaveValue('Grape')
    expect(input()).toHaveFocus()
  })

  it('disabled options cannot be picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<Fruit onChange={onChange} defaultOpen />)
    await user.click(option('Cherry'))
    expect(onChange).not.toHaveBeenCalled()
    expect(option('Cherry')).toHaveAttribute('aria-disabled', 'true')
  })

  it('Escape closes the listbox, then clears the field', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit defaultValue="Apple" onChange={onChange} />)
    input().focus()
    await user.keyboard('{ArrowDown}')
    const escape = fireEvent.keyDown(input(), { key: 'Escape' })
    expect(escape).toBe(false) // consumed (an enclosing modal stays open)
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(input()).toHaveValue('Apple')
    await user.keyboard('{Escape}')
    expect(input()).toHaveValue('')
    expect(onChange).toHaveBeenCalledWith(expect.anything(), '')
  })

  it('without freeSolo, unmatched text returns to the selected label on blur', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <Fruit defaultValue="Apple" onChange={onChange} />
        <button type="button">after</button>
      </>,
    )
    await user.click(input())
    await user.keyboard('{End}xyz')
    expect(input()).toHaveValue('Applexyz')
    await user.tab()
    expect(input()).toHaveValue('Apple')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clearing the text clears the value', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit defaultValue="Apple" onChange={onChange} name="fruit" />)
    await user.clear(input())
    expect(onChange).toHaveBeenCalledWith(expect.anything(), '')
    expect(document.querySelector('input[name="fruit"]')).toHaveValue('')
  })

  it('freeSolo commits typed text on Enter and on blur', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <Fruit freeSolo onChange={onChange} name="fruit" />
        <button type="button">after</button>
      </>,
    )
    await user.type(input(), 'Kiwi{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'Kiwi')
    expect(document.querySelector('input[name="fruit"]')).toHaveValue('Kiwi')
    await user.type(input(), 's')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'Kiwis')
    expect(input()).toHaveValue('Kiwis')
  })

  it('freeSolo text equal to an option label commits that option', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Autocomplete
        label="Fruit"
        freeSolo
        options={[{ value: 'b', label: 'Banana' }]}
        onChange={onChange}
      />,
    )
    await user.type(input(), 'Banana{Escape}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'b')
  })

  it('closes when nothing matches, or shows noOptionsText', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Fruit />)
    await user.type(input(), 'zz')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(listbox()).not.toHaveAttribute('data-open')
    unmount()

    render(<Fruit noOptionsText="No fruit" />)
    await user.type(input(), 'zz')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('No fruit')).toBeInTheDocument()
    expect(options()).toHaveLength(0)
  })

  it('the toggle button opens and closes without taking focus', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit onOpenChange={onOpenChange} />)
    await user.click(toggle())
    expect(input()).toHaveFocus()
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(options()).toHaveLength(5)
    await user.click(toggle())
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })

  it('an outside press closes the listbox', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Fruit />
        <button type="button">outside</button>
      </>,
    )
    await user.click(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: 'outside' }))
    expect(input()).toHaveAttribute('aria-expanded', 'false')
  })

  it('accepts Option children, filtered by textValue or text content', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Autocomplete label="Mode" onChange={onChange}>
        <Option value="car" startIcon={<svg />}>
          Car
        </Option>
        <Option value="train" textValue="Train">
          <strong>Train</strong> (rail)
        </Option>
      </Autocomplete>,
    )
    await user.type(input(), 'tra')
    expect(optionNames()).toEqual(['Train (rail)'])
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'train')
    expect(input()).toHaveValue('Train')
  })

  it('uses a custom filterOptions', async () => {
    const filterOptions = vi.fn(
      (items: AutocompleteOptionItem[], { inputValue }: AutocompleteFilterState) =>
        items.filter((item) => item.label.startsWith(inputValue)),
    )
    const user = userEvent.setup()
    render(<Fruit filterOptions={filterOptions} />)
    await user.type(input(), 'B')
    expect(optionNames()).toEqual(['Banana', 'Blueberry'])
    expect(filterOptions).toHaveBeenLastCalledWith(expect.any(Array), {
      inputValue: 'B',
    })
  })

  it('supports controlled value and inputValue', async () => {
    function Controlled() {
      const [value, setValue] = useState('')
      const [text, setText] = useState('')
      return (
        <>
          <Fruit
            value={value}
            onChange={(_, v) => setValue(v)}
            inputValue={text}
            onInputChange={(_, v) => setText(v.toUpperCase())}
          />
          <output>{value || '-'}</output>
        </>
      )
    }
    const user = userEvent.setup()
    render(<Controlled />)
    await user.type(input(), 'g')
    expect(input()).toHaveValue('G')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Grape')
    expect(input()).toHaveValue('GRAPE')
  })

  it('takes part in forms: submit, required validation and reset', async () => {
    const user = userEvent.setup()
    render(
      <form data-testid="form">
        <Fruit name="fruit" required defaultValue="Apple" />
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement
    expect(new FormData(form).get('fruit')).toBe('Apple')
    await user.clear(input())
    expect(form.checkValidity()).toBe(false)
    await user.type(input(), 'gr')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(new FormData(form).get('fruit')).toBe('Grape')
    fireEvent.reset(form)
    expect(input()).toHaveValue('Apple')
  })

  it('disabled: no typing, no toggle, no submission', () => {
    render(
      <form data-testid="form">
        <Fruit name="fruit" disabled defaultValue="Apple" />
      </form>,
    )
    expect(input()).toBeDisabled()
    expect(toggle()).toBeDisabled()
    expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('fruit')).toBeNull()
  })

  it('error state exposes aria-invalid and the alert text', () => {
    render(<Fruit error errorText="Pick a fruit" supportingText="help" />)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a fruit')
    expect(input()).toHaveAccessibleDescription('Pick a fruit')
  })

  it('forwards ref to the root and inputRef to the text input', () => {
    const ref = { current: null as HTMLDivElement | null }
    const inputRef = { current: null as HTMLInputElement | null }
    render(
      <Autocomplete
        label="Fruit"
        options={fruits}
        ref={ref}
        inputRef={inputRef}
        className="custom"
      />,
    )
    expect(ref.current).toHaveClass('custom')
    expect(inputRef.current).toBe(input())
  })

  describe('filtering motion', () => {
    // jsdom has no layout: place each option 44px below the previous one.
    const offsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')!
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get(this: HTMLElement) {
          return Array.from(this.parentElement?.children ?? []).indexOf(this) * 44
        },
      })
    })
    afterEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', offsetTop)
      vi.unstubAllGlobals()
    })

    const styleChanges = async (type: string) => {
      const user = userEvent.setup()
      render(<Fruit />)
      await user.click(input())
      const records: MutationRecord[] = []
      const observer = new MutationObserver((list) => records.push(...list))
      observer.observe(listbox(), {
        subtree: true,
        attributeFilter: ['style'],
        attributeOldValue: true,
      })
      await user.type(input(), type)
      records.push(...observer.takeRecords())
      observer.disconnect()
      return records
        .filter((r) => (r.target as HTMLElement).getAttribute('role') === 'option')
        .map((r) => r.oldValue ?? '')
    }

    it('options that stay ease from their old position (FLIP)', async () => {
      // Each kept option moves up one row: it starts 44px lower.
      const old = await styleChanges('bl')
      expect(old.some((v) => v.includes('translateY(44px)'))).toBe(true)
    })

    it('does not move under reduced motion', async () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }))
      expect(await styleChanges('bl')).toEqual([])
    })
  })

  describe('a11y', () => {
    it('has no axe violations (closed)', async () => {
      const { container } = render(<Fruit supportingText="Choose one" />)
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations (open, selected, active, disabled)', async () => {
      const user = userEvent.setup()
      const { container } = render(<Fruit defaultValue="Banana" variant="outlined" />)
      input().focus()
      await user.keyboard('{ArrowDown}')
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations (no options text)', async () => {
      const user = userEvent.setup()
      const { container } = render(<Fruit noOptionsText="No options" />)
      await user.type(input(), 'zz')
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations (disabled, error)', async () => {
      const { container } = render(
        <>
          <Fruit disabled />
          <Autocomplete label="Other" options={fruits} error errorText="Required" />
        </>,
      )
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})

describe('Autocomplete rich label / supporting text (B48)', () => {
  it('names the input from a ReactNode label and describes it with a rich supporting line', async () => {
    const { container } = render(
      <Fruit
        variant="outlined"
        required
        label={
          <>
            Fruit <em>(type to filter)</em>
          </>
        }
        supportingText={
          <>
            Seasonal. <a href="/fruit">Details</a>
          </>
        }
      />,
    )
    expect(input()).toHaveAccessibleName('Fruit (type to filter)')
    expect(input()).toHaveAccessibleDescription('Seasonal. Details')
    expect(screen.getByRole('link', { name: 'Details' })).toBeInTheDocument()
    const notchCopy = container.querySelector('[class*="outlineLabel"]')!
    expect(notchCopy.querySelector('em')).toHaveTextContent('(type to filter)')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('replaces the supporting node with an errorText node in error', async () => {
    const { container } = render(
      <Fruit
        error
        supportingText={<span>Seasonal</span>}
        errorText={
          <>
            Pick a fruit. <a href="/fruit">Help</a>
          </>
        }
      />,
    )
    expect(screen.queryByText('Seasonal')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a fruit. Help')
    expect(input()).toHaveAccessibleDescription('Pick a fruit. Help')
    expect(await axe(container)).toHaveNoViolations()
  })
})
