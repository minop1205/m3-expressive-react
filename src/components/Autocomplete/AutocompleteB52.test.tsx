import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Autocomplete, Option, type AutocompleteProps } from './Autocomplete'

// Ruling B52 (#518): the m3 autocomplete menu look, Option supportingText,
// openOnFocus, labelPlacement / shrinkLabel. (The freeSolo exact-match change
// is tested in Autocomplete.test.tsx.)

const fruits = ['Apple', 'Banana', 'Blueberry', 'Grape']

function Fruit(props: Partial<AutocompleteProps>) {
  return <Autocomplete label="Fruit" options={fruits} {...props} />
}

const plans = [
  { value: 'free', label: 'Free', supportingText: 'Zero cost, for one user' },
  { value: 'pro', label: 'Pro', supportingText: 'Unlimited projects and seats' },
]

const input = () => screen.getByRole('combobox')
const options = () => screen.queryAllByRole('option', { hidden: true })
const option = (name: string) => screen.getByRole('option', { name, hidden: true })

describe('Autocomplete listbox look (B52)', () => {
  it('marks the selected option without a check mark', async () => {
    const user = userEvent.setup()
    render(<Fruit defaultValue="Banana" />)
    await user.click(input())
    expect(option('Banana')).toHaveAttribute('aria-selected', 'true')
    expect(option('Banana').querySelector('svg')).toBeNull()
  })
})

describe('Autocomplete option supportingText (B52)', () => {
  it('names options by the label and describes them by the supporting text (options prop)', async () => {
    const user = userEvent.setup()
    render(<Autocomplete label="Plan" options={plans} />)
    await user.click(input())
    expect(option('Free')).toHaveAccessibleDescription('Zero cost, for one user')
    expect(option('Pro')).toHaveAccessibleName('Pro')
  })

  it('works with Option children too', async () => {
    const user = userEvent.setup()
    render(
      <Autocomplete label="Plan">
        <Option value="free" supportingText="Zero cost">
          Free
        </Option>
      </Autocomplete>,
    )
    await user.click(input())
    expect(option('Free')).toHaveAccessibleDescription('Zero cost')
  })

  it('filters by the label only and puts only the label in the input', async () => {
    const user = userEvent.setup()
    render(<Autocomplete label="Plan" options={plans} />)
    // "seats" is in Pro's supporting text, not in a label.
    await user.type(input(), 'seats')
    expect(options()).toHaveLength(0)
    await user.clear(input())
    await user.type(input(), 'pr')
    await user.click(option('Pro'))
    expect(input()).toHaveValue('Pro')
  })

  it('has no axe violations (open, with supporting text and a selection)', async () => {
    const user = userEvent.setup()
    const { container } = render(<Autocomplete label="Plan" options={plans} defaultValue="pro" />)
    input().focus()
    await user.keyboard('{ArrowDown}')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Autocomplete openOnFocus (B52)', () => {
  it('does not open on focus by default', async () => {
    const user = userEvent.setup()
    render(<Fruit />)
    await user.tab()
    expect(input()).toHaveFocus()
    expect(input()).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on focus with no active option, showing every option for a picked value', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit openOnFocus defaultValue="Banana" onOpenChange={onOpenChange} />)
    await user.tab()
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    expect(options()).toHaveLength(fruits.length)
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    // Escape closes; it stays closed while focus stays.
    await user.keyboard('{Escape}')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(input()).toHaveFocus()
  })

  it('opens once when a click brings focus', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit openOnFocus onOpenChange={onOpenChange} />)
    await user.click(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(onOpenChange).toHaveBeenCalledTimes(1)
  })

  it('opens once when the toggle button brings focus', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit openOnFocus onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: 'Toggle dropdown menu', hidden: true }))
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(onOpenChange).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations (opened by focus)', async () => {
    const user = userEvent.setup()
    const { container } = render(<Fruit openOnFocus />)
    await user.tab()
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Autocomplete labelPlacement / shrinkLabel (B52, B37 parity)', () => {
  it("labelPlacement='above' puts the label above the container and still labels the input", async () => {
    const user = userEvent.setup()
    const { container } = render(<Fruit labelPlacement="above" variant="outlined" required />)
    const root = container.firstElementChild as HTMLElement
    const label = root.firstElementChild as HTMLElement
    expect(label.tagName).toBe('LABEL')
    expect(label.className).toMatch(/aboveLabel/)
    expect(root.className).toMatch(/noLabel/)
    expect(container.querySelector('[class*="outlineLabel"]')).toBeNull()
    expect(input()).toHaveAccessibleName('Fruit')
    await user.click(label)
    expect(input()).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shrinkLabel keeps the label minimized', async () => {
    const { container } = render(<Fruit shrinkLabel placeholder="Type a fruit" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toMatch(/shrinkLabel/)
    expect(input()).toHaveAttribute('placeholder', 'Type a fruit')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shrinkLabel has no effect with labelPlacement="above"', () => {
    const { container } = render(<Fruit shrinkLabel labelPlacement="above" />)
    expect((container.firstElementChild as HTMLElement).className).not.toMatch(/shrinkLabel/)
  })
})
