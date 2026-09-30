import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Chip } from './Chip'
import styles from './Chip.module.css'

describe('Chip', () => {
  it('renders with a label', () => {
    render(<Chip label="Tag" />)
    expect(screen.getByText('Tag')).toBeInTheDocument()
  })

  it('renders a button role element', () => {
    render(<Chip label="Tag" />)
    expect(screen.getByRole('button', { name: 'Tag' })).toBeInTheDocument()
  })

  it('fires onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip label="Tag" onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onClick = vi.fn()
    render(<Chip label="Tag" disabled onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders leading icon', () => {
    const { container } = render(
      <Chip label="Tag" icon={<svg data-testid="icon" />} />,
    )
    expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument()
  })

  it('forwards a ref to the root element', () => {
    const ref = { current: null as HTMLSpanElement | null }
    const { container } = render(<Chip ref={ref} label="Tag" />)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
    expect(ref.current).toBe(container.firstElementChild)
    expect(ref.current).not.toBeInstanceOf(HTMLButtonElement)
  })

  describe('filter variant', () => {
    it('shows aria-pressed', () => {
      render(<Chip variant="filter" label="Tag" />)
      expect(screen.getByRole('button', { name: 'Tag' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    it('fires onChange with (event, selected) on click', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <Chip variant="filter" label="Tag" onChange={onChange} />,
      )
      await user.click(screen.getByRole('button', { name: 'Tag' }))
      expect(onChange).toHaveBeenCalledWith(expect.any(Object), true)
    })

    it('shows checkmark when selected', () => {
      const { container } = render(
        <Chip variant="filter" label="Tag" selected />,
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('input variant (removable)', () => {
    it('renders a remove button', () => {
      render(<Chip variant="input" label="Tag" removable />)
      expect(screen.getByRole('button', { name: 'Remove Tag' })).toBeInTheDocument()
    })

    it('fires onRemove when remove button is clicked', async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn()
      render(<Chip variant="input" label="Tag" removable onRemove={onRemove} />)
      await user.click(screen.getByRole('button', { name: 'Remove Tag' }))
      expect(onRemove).toHaveBeenCalledOnce()
    })

    it('does not fire onClick when remove button is clicked', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const onRemove = vi.fn()
      render(
        <Chip variant="input" label="Tag" removable onClick={onClick} onRemove={onRemove} />,
      )
      await user.click(screen.getByRole('button', { name: 'Remove Tag' }))
      expect(onRemove).toHaveBeenCalledOnce()
      expect(onClick).not.toHaveBeenCalled()
    })

    it('remove button is not in tab order', () => {
      render(<Chip variant="input" label="Tag" removable />)
      expect(screen.getByRole('button', { name: 'Remove Tag' })).toHaveAttribute(
        'tabindex',
        '-1',
      )
    })

    it('arrow right moves focus from primary to trailing', async () => {
      const user = userEvent.setup()
      render(<Chip variant="input" label="Tag" removable />)
      const primary = screen.getByRole('button', { name: 'Tag' })
      const trailing = screen.getByRole('button', { name: 'Remove Tag' })

      primary.focus()
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(trailing)
    })

    it('arrow left moves focus from trailing to primary', async () => {
      const user = userEvent.setup()
      render(<Chip variant="input" label="Tag" removable />)
      const primary = screen.getByRole('button', { name: 'Tag' })
      const trailing = screen.getByRole('button', { name: 'Remove Tag' })

      trailing.focus()
      await user.keyboard('{ArrowLeft}')
      expect(document.activeElement).toBe(primary)
    })
  })

  it('applies the dragged state', () => {
    const { container } = render(<Chip label="Tag" dragged />)
    expect(container.querySelector('[class*="dragged"]')).toBeInTheDocument()
  })

  it('has no axe violations (assist)', async () => {
    const { container } = render(<Chip label="Tag" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (filter selected)', async () => {
    const { container } = render(
      <Chip variant="filter" label="Tag" selected />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (input removable)', async () => {
    const { container } = render(
      <Chip variant="input" label="Tag" removable />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Chip input selection (#184)', () => {
  it('stays non-selectable without selection props (v1.0 behavior)', async () => {
    const user = userEvent.setup()
    render(<Chip variant="input" label="Tag" />)
    const chip = screen.getByRole('button', { name: 'Tag' })
    expect(chip).not.toHaveAttribute('aria-pressed')
    await user.click(chip)
    expect(chip).not.toHaveAttribute('aria-pressed')
  })

  it('honors a controlled selected prop', () => {
    const { container } = render(<Chip variant="input" label="Tag" selected />)
    expect(screen.getByRole('button', { name: 'Tag' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.firstElementChild).toHaveClass(styles.selected)
  })

  it('toggles uncontrolled from defaultSelected and fires onChange(event, selected)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Chip variant="input" label="Tag" defaultSelected onChange={onChange} />)
    const chip = screen.getByRole('button', { name: 'Tag' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), false)
  })

  it('becomes selectable with onChange alone', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Chip variant="input" label="Tag" onChange={onChange} />)
    const chip = screen.getByRole('button', { name: 'Tag' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip)
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), true)
  })

  it('never shows the filter checkmark', () => {
    const { container } = render(<Chip variant="input" label="Tag" selected />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('has no axe violations (input selected + removable)', async () => {
    const { container } = render(<Chip variant="input" label="Tag" selected removable />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Chip avatar (#185)', () => {
  it('renders the avatar for input chips, taking precedence over icon', () => {
    const { container } = render(
      <Chip
        variant="input"
        label="Ada"
        icon={<svg data-testid="icon" />}
        avatar={<img data-testid="avatar" alt="" src="data:," />}
      />,
    )
    expect(container.querySelector('[data-testid="avatar"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="icon"]')).toBeNull()
    expect(container.firstElementChild).toHaveClass(styles.hasAvatar)
    expect(container.querySelector(`.${styles.avatar}`)).toHaveAttribute('aria-hidden', 'true')
  })

  it('ignores avatar on other variants', () => {
    const { container } = render(
      <Chip variant="assist" label="Ada" avatar={<img data-testid="avatar" alt="" src="data:," />} />,
    )
    expect(container.querySelector('[data-testid="avatar"]')).toBeNull()
  })

  it('has no axe violations (avatar, disabled)', async () => {
    const { container } = render(
      <Chip variant="input" label="Ada" avatar={<img alt="" src="data:," />} removable disabled />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Chip removal keyboard + focus (#186)', () => {
  it.each(['{Backspace}', '{Delete}'])('%s on the focused chip calls onRemove(event)', async (key) => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<Chip variant="input" label="Tag" removable onRemove={onRemove} />)
    screen.getByRole('button', { name: 'Tag' }).focus()
    await user.keyboard(key)
    expect(onRemove).toHaveBeenCalledOnce()
    expect(onRemove.mock.calls[0][0]).toHaveProperty('type', 'keydown')
  })

  it('Delete on the focused remove button calls onRemove', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<Chip variant="input" label="Tag" removable onRemove={onRemove} />)
    screen.getByRole('button', { name: 'Remove Tag' }).focus()
    await user.keyboard('{Delete}')
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('ignores Backspace on chips without a remove action', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<Chip variant="input" label="Tag" onRemove={onRemove} />)
    screen.getByRole('button', { name: 'Tag' }).focus()
    await user.keyboard('{Backspace}')
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('passes the click event to onRemove', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<Chip variant="input" label="Tag" removable onRemove={onRemove} />)
    await user.click(screen.getByRole('button', { name: 'Remove Tag' }))
    expect(onRemove.mock.calls[0][0]).toHaveProperty('type', 'click')
  })

  it('uses getRemoveLabel for the remove button name', () => {
    render(
      <Chip variant="input" label="Tag" removable getRemoveLabel={(l) => `${l} を削除`} />,
    )
    expect(screen.getByRole('button', { name: 'Tag を削除' })).toBeInTheDocument()
  })

  function RemovableList({ initial }: { initial: string[] }) {
    const [items, setItems] = useState(initial)
    return (
      <div>
        {items.map((label) => (
          <Chip
            key={label}
            variant="input"
            label={label}
            removable
            onRemove={() => setItems((prev) => prev.filter((l) => l !== label))}
          />
        ))}
      </div>
    )
  }

  it('moves focus to the next chip after keyboard removal', async () => {
    const user = userEvent.setup()
    render(<RemovableList initial={['A', 'B', 'C']} />)
    screen.getByRole('button', { name: 'B' }).focus()
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: 'B' })).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'C' })).toHaveFocus())
  })

  it('moves focus to the previous chip when the last one is removed via its button', async () => {
    const user = userEvent.setup()
    render(<RemovableList initial={['A', 'B', 'C']} />)
    await user.click(screen.getByRole('button', { name: 'Remove C' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'B' })).toHaveFocus())
  })

  it('does not move focus when the parent keeps the chip', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Chip variant="input" label="A" removable />
        <Chip variant="input" label="B" removable />
      </div>,
    )
    const a = screen.getByRole('button', { name: 'A' })
    a.focus()
    await user.keyboard('{Delete}')
    await new Promise((r) => setTimeout(r, 10))
    expect(a).toHaveFocus()
  })
})

describe('Chip checkmark slot (#188)', () => {
  it('keeps the checkmark slot mounted and toggles its visibility', async () => {
    const user = userEvent.setup()
    const { container } = render(<Chip variant="filter" label="Tag" />)
    const slot = container.querySelector(`.${styles.checkSlot}`)
    expect(slot).toBeInTheDocument()
    expect(slot).not.toHaveAttribute('data-visible')
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    expect(slot).toHaveAttribute('data-visible')
  })

  it('has no checkmark slot when showSelectedIcon is false', () => {
    const { container } = render(<Chip variant="filter" label="Tag" showSelectedIcon={false} selected />)
    expect(container.querySelector(`.${styles.checkSlot}`)).toBeNull()
  })
})

describe('Chip uncontrolled selection', () => {
  it('toggles from defaultSelected without a selected prop', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Chip variant="filter" label="Tag" defaultSelected onChange={onChange} />)
    const chip = screen.getByRole('button', { name: /Tag/ })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), false)
  })
})
