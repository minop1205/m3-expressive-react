import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Dialog } from './Dialog'

describe('Dialog', () => {
  it('renders a labelled modal dialog when open', () => {
    render(<Dialog open title="Reset?">Body</Dialog>)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Reset?')
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('renders actions', () => {
    render(<Dialog open title="T" actions={<button>OK</button>} />)
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Dialog open onClose={onClose} title="T">Body</Dialog>)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Dialog ref={ref} open title="T">x</Dialog>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <Dialog open title="Accessible" actions={<button>Close</button>}>
        Supporting text
      </Dialog>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
