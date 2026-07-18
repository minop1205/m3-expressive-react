import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Radio } from './Radio'
import { RadioGroup } from './RadioGroup'

function Group(props: Parameters<typeof RadioGroup>[0]) {
  return (
    <RadioGroup aria-label="Options" {...props}>
      <Radio value="a" aria-label="A" />
      <Radio value="b" aria-label="B" />
    </RadioGroup>
  )
}

describe('RadioGroup', () => {
  it('renders a labelled radiogroup and distributes a shared name', () => {
    render(<Group />)
    const group = screen.getByRole('radiogroup', { name: 'Options' })
    expect(group).toBeInTheDocument()
    const [a, b] = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(a.name).toBeTruthy()
    expect(a.name).toBe(b.name)
  })

  it('selects via defaultValue and updates uncontrolled', async () => {
    const user = userEvent.setup()
    render(<Group defaultValue="a" />)
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'B' }))
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked()
  })

  it('fires onChange with (event, value) and respects controlled value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Group value="a" onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'B' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const [event, value] = onChange.mock.calls[0]
    expect(value).toBe('b')
    expect(event.target).toBeInstanceOf(HTMLInputElement)
    // Controlled: selection must not move without a value update.
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'B' })).not.toBeChecked()
  })

  it('disables every radio when the group is disabled', () => {
    render(<Group disabled />)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })

  it('has no axe violations', async () => {
    const { container } = render(<Group defaultValue="a" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
