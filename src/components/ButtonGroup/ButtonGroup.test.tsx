import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { Button } from '../Button'
import { ButtonGroup } from './ButtonGroup'

describe('ButtonGroup', () => {
  it('renders its buttons inside a group', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    )
    const group = screen.getByRole('group')
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument()
  })

  it('defaults to the standard variant / sm size', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
      </ButtonGroup>,
    )
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('data-variant', 'standard')
    expect(group).toHaveAttribute('data-size', 'sm')
  })

  it('supports the connected variant', () => {
    render(
      <ButtonGroup variant="connected">
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    )
    expect(screen.getByRole('group')).toHaveAttribute('data-variant', 'connected')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ButtonGroup ref={ref}>
        <Button>One</Button>
      </ButtonGroup>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Text style">
        <Button variant="outlined">Bold</Button>
        <Button variant="outlined">Italic</Button>
        <Button variant="outlined">Underline</Button>
      </ButtonGroup>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
