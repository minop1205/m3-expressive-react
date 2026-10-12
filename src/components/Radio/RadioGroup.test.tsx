import { act, render, screen } from '@testing-library/react'
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

  it('moves selection with arrow keys inside the group (native roving)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Group defaultValue="a" onChange={onChange} />)
    const a = screen.getByRole('radio', { name: 'A' })
    const b = screen.getByRole('radio', { name: 'B' })
    a.focus()

    await user.keyboard('{ArrowDown}')
    expect(b).toBeChecked()
    expect(b).toHaveFocus()
    expect(a).not.toBeChecked()
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'b')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Group defaultValue="a" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('RadioGroup form reset (#432)', () => {
  it('restores the uncontrolled default on form.reset() and keeps onChange firing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const tree = (label = 'Fruit') => (
      <form>
        <RadioGroup aria-label={label} name="fruit" defaultValue="a" onChange={onChange}>
          <Radio value="a" aria-label="A" />
          <Radio value="b" aria-label="B" />
        </RadioGroup>
      </form>
    )
    const { container, rerender } = render(tree())
    const form = container.querySelector('form')!
    const a = screen.getByRole('radio', { name: 'A' })
    const b = screen.getByRole('radio', { name: 'B' })

    await user.click(b)
    expect(b).toBeChecked()
    act(() => form.reset())
    expect(a).toBeChecked()
    expect(b).not.toBeChecked()
    expect(new FormData(form).get('fruit')).toBe('a')

    // The group state followed the reset: a re-render keeps "a" selected.
    rerender(tree('Fruits'))
    expect(a).toBeChecked()
    expect(b).not.toBeChecked()

    onChange.mockClear()
    await user.click(b)
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'b')
    expect(b).toBeChecked()
  })
})

describe('RadioGroup keyboard (#425)', () => {
  function Three(props: Parameters<typeof RadioGroup>[0] & { disableB?: boolean }) {
    const { disableB, ...rest } = props
    return (
      <RadioGroup aria-label="Options" {...rest}>
        <Radio value="a" aria-label="A" />
        <Radio value="b" aria-label="B" disabled={disableB} />
        <Radio value="c" aria-label="C" />
      </RadioGroup>
    )
  }

  it('wraps from the last radio to the first (ArrowDown) and back (ArrowUp)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Three defaultValue="c" onChange={onChange} />)
    const a = screen.getByRole('radio', { name: 'A' })
    const c = screen.getByRole('radio', { name: 'C' })
    c.focus()

    await user.keyboard('{ArrowDown}')
    expect(a).toBeChecked()
    expect(a).toHaveFocus()
    expect(c).not.toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'a')

    await user.keyboard('{ArrowUp}')
    expect(c).toBeChecked()
    expect(c).toHaveFocus()
    expect(a).not.toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'c')
  })

  it('wraps with ArrowLeft / ArrowRight as well', async () => {
    const user = userEvent.setup()
    render(<Three defaultValue="a" />)
    const a = screen.getByRole('radio', { name: 'A' })
    const c = screen.getByRole('radio', { name: 'C' })
    a.focus()

    await user.keyboard('{ArrowLeft}')
    expect(c).toBeChecked()
    expect(c).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(a).toBeChecked()
    expect(a).toHaveFocus()
  })

  it('skips a disabled radio in both directions', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Three defaultValue="a" onChange={onChange} disableB />)
    const a = screen.getByRole('radio', { name: 'A' })
    const b = screen.getByRole('radio', { name: 'B' })
    const c = screen.getByRole('radio', { name: 'C' })
    a.focus()

    await user.keyboard('{ArrowDown}')
    expect(c).toBeChecked()
    expect(c).toHaveFocus()
    expect(b).not.toBeChecked()

    await user.keyboard('{ArrowUp}')
    expect(a).toBeChecked()
    expect(a).toHaveFocus()
    expect(b).not.toBeChecked()
    expect(onChange).not.toHaveBeenCalledWith(expect.anything(), 'b')
  })

  it('is a single tab stop: Tab enters on the checked radio and leaves the group', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Before</button>
        <Three defaultValue="b" />
        <button type="button">After</button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Before' }))
    await user.tab()
    expect(screen.getByRole('radio', { name: 'B' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('skips the whole group on Tab when the group is disabled', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Before</button>
        <Three defaultValue="a" disabled />
        <button type="button">After</button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Before' }))
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })
})
