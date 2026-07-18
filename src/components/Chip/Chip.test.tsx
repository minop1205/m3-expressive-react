import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Chip } from './Chip'

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

  it('forwards a ref', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Chip ref={ref} label="Tag" />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  describe('filter variant', () => {
    it('shows aria-pressed', () => {
      render(<Chip variant="filter" label="Tag" />)
      expect(screen.getByRole('button', { name: 'Tag' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    it('fires onSelectionChange on click', async () => {
      const user = userEvent.setup()
      const onSelectionChange = vi.fn()
      render(
        <Chip variant="filter" label="Tag" onSelectionChange={onSelectionChange} />,
      )
      await user.click(screen.getByRole('button', { name: 'Tag' }))
      expect(onSelectionChange).toHaveBeenCalledWith(true)
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

describe('Chip uncontrolled selection', () => {
  it('toggles from defaultSelected without a selected prop', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    render(<Chip variant="filter" label="Tag" defaultSelected onSelectionChange={onSelectionChange} />)
    const chip = screen.getByRole('button', { name: /Tag/ })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect(onSelectionChange).toHaveBeenCalledWith(false)
  })
})
