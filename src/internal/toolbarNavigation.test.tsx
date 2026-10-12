import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Toolbar } from '../components/Toolbar'
import { SearchBar } from '../components/SearchBar'
import { getToolbarItems } from './toolbarNavigation'

function Bar() {
  return (
    <Toolbar aria-label="Tools">
      <button type="button">B1</button>
      <SearchBar aria-label="Search" defaultOpen>
        <button type="button">R1</button>
        <button type="button">R2</button>
      </SearchBar>
      <button type="button">B2</button>
    </Toolbar>
  )
}

describe('toolbarNavigation', () => {
  it('moves between the toolbar items with the arrow keys, Home and End', async () => {
    const user = userEvent.setup()
    render(
      <Toolbar aria-label="Tools">
        <button type="button">A</button>
        <button type="button" disabled>
          X
        </button>
        <button type="button">B</button>
        <button type="button">C</button>
      </Toolbar>,
    )
    screen.getByRole('button', { name: 'A' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus()
  })

  it('does not treat the results of a nested combobox view as toolbar items (#430)', () => {
    render(<Bar />)
    const toolbar = screen.getByRole('toolbar')
    const names = getToolbarItems(toolbar).map((el) => el.textContent || el.getAttribute('role'))
    expect(names).toEqual(['B1', 'combobox', 'B2'])
  })

  it('leaves the keys of a nested combobox view alone (#430)', async () => {
    const user = userEvent.setup()
    render(<Bar />)
    const r2 = screen.getByRole('button', { name: 'R2' })
    r2.focus()
    await user.keyboard('{ArrowRight}')
    expect(r2).toHaveFocus()
    await user.keyboard('{End}')
    // End inside the view is the view's own key (last result), never the
    // toolbar's last button.
    expect(screen.getByRole('button', { name: 'B2' })).not.toHaveFocus()
  })
})
