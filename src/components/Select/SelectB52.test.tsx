import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Option, Select, type SelectProps } from './Select'

// Ruling B52 (#518): the m3 select menu look, Option supportingText,
// openOnFocus, labelPlacement / shrinkLabel.

function Fruit(props: Partial<SelectProps>) {
  return (
    <Select label="Fruit" {...props}>
      <Option value="apple">Apple</Option>
      <Option value="banana">Banana</Option>
      <Option value="cherry" disabled>
        Cherry
      </Option>
      <Option value="grape">Grape</Option>
    </Select>
  )
}

function Plans(props: Partial<SelectProps>) {
  return (
    <Select label="Plan" {...props}>
      <Option value="free" supportingText="Zero cost, for one user">
        Free
      </Option>
      <Option value="pro" supportingText="Unlimited projects and seats">
        Pro
      </Option>
    </Select>
  )
}

const combobox = () => screen.getByRole('combobox')
const option = (name: string) => screen.getByRole('option', { name, hidden: true })
const activeOption = () => {
  const id = combobox().getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}
const Icon = () => <svg data-testid="start-icon" />

describe('Select listbox look (B52)', () => {
  it('marks the selected option without a check mark, keeping its start icon', () => {
    render(
      <Select label="Mode" defaultValue="car" defaultOpen>
        <Option value="car" startIcon={<Icon />}>
          Car
        </Option>
        <Option value="walk">Walk</Option>
      </Select>,
    )
    expect(option('Car')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('start-icon')).toBeInTheDocument()
    expect(option('Car').querySelectorAll('svg')).toHaveLength(1)
    // No icon slot for an option without a start icon, selected or not.
    expect(option('Walk').querySelector('svg')).toBeNull()
  })
})

describe('Select Option supportingText (B52)', () => {
  it('names the option by its label and describes it by the supporting text', () => {
    render(<Plans defaultOpen />)
    const free = option('Free')
    expect(free).toHaveAccessibleName('Free')
    expect(free).toHaveAccessibleDescription('Zero cost, for one user')
  })

  it('shows only the label in the field once selected', async () => {
    const user = userEvent.setup()
    render(<Plans />)
    await user.click(combobox())
    await user.click(option('Pro'))
    expect(combobox()).toHaveTextContent(/^Pro$/)
  })

  it('typeahead matches the label, not the supporting text', async () => {
    const user = userEvent.setup()
    render(
      <Select label="Plan">
        <Option value="pro" supportingText="Max seats">
          Pro
        </Option>
        <Option value="promax">Promax</Option>
      </Select>,
    )
    combobox().focus()
    // "Pro" + "Max seats" would read "promax seats" — but only labels count.
    await user.keyboard('prom')
    expect(activeOption()).toBe(option('Promax'))
  })

  it('has no axe violations (open, with supporting text and a selection)', async () => {
    const user = userEvent.setup()
    const { container } = render(<Plans defaultValue="pro" />)
    combobox().focus()
    await user.keyboard('{ArrowDown}')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Select openOnFocus (B52)', () => {
  it('does not open on focus by default', async () => {
    const user = userEvent.setup()
    render(<Fruit />)
    await user.tab()
    expect(combobox()).toHaveFocus()
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on keyboard focus on the selected option', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit openOnFocus defaultValue="banana" onOpenChange={onOpenChange} />)
    await user.tab()
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    expect(activeOption()).toBe(option('Banana'))
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    // Closing keeps focus; it does not reopen until focus re-enters.
    await user.keyboard('{Escape}')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(combobox()).toHaveFocus()
  })

  it('opens once when a click brings focus', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<Fruit openOnFocus onOpenChange={onOpenChange} />)
    await user.click(combobox())
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
  })

  it('stays closed when disabled', () => {
    render(<Fruit openOnFocus disabled />)
    combobox().focus()
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no axe violations (opened by focus)', async () => {
    const user = userEvent.setup()
    const { container } = render(<Fruit openOnFocus />)
    await user.tab()
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Select labelPlacement / shrinkLabel (B52, B37 parity)', () => {
  it("labelPlacement='above' puts the label above the container and still names the combobox", async () => {
    const user = userEvent.setup()
    const { container } = render(<Fruit labelPlacement="above" variant="outlined" required />)
    const root = container.firstElementChild as HTMLElement
    const label = root.firstElementChild as HTMLElement
    expect(label.className).toMatch(/aboveLabel/)
    expect(label).toHaveTextContent('Fruit*')
    expect(root.className).toMatch(/noLabel/)
    expect(container.querySelector('[class*="outlineLabel"]')).toBeNull()
    expect(combobox()).toHaveAccessibleName('Fruit')
    await user.click(label)
    expect(combobox()).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shrinkLabel keeps the label minimized and shows the placeholder', async () => {
    const { container } = render(<Fruit shrinkLabel placeholder="Pick a fruit" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toMatch(/shrinkLabel/)
    expect(screen.getByText('Pick a fruit')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shrinkLabel has no effect with labelPlacement="above" or without a label', () => {
    const { container, unmount } = render(<Fruit shrinkLabel labelPlacement="above" />)
    expect((container.firstElementChild as HTMLElement).className).not.toMatch(/shrinkLabel/)
    unmount()
    const view = render(<Fruit shrinkLabel label={undefined} aria-label="Fruit" />)
    expect((view.container.firstElementChild as HTMLElement).className).not.toMatch(/shrinkLabel/)
  })
})
