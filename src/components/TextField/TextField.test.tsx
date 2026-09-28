import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { TextField } from './TextField'

describe('TextField', () => {
  it('renders an input element', () => {
    render(<TextField label="Name" />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders the label', () => {
    render(<TextField label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('associates label with input via htmlFor', () => {
    render(<TextField label="Username" />)
    const input = screen.getByRole('textbox')
    const label = screen.getByText('Username')
    expect(label).toHaveAttribute('for', input.id)
  })

  it('forwards ref to input element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<TextField label="Test" ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('textbox'))
  })

  it('supports controlled value', () => {
    const onChange = vi.fn()
    render(<TextField label="Name" value="hello" onChange={onChange} />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('supports uncontrolled value', async () => {
    const user = userEvent.setup()
    render(<TextField label="Name" />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'world')
    expect(input).toHaveValue('world')
  })

  it('fires onChange on input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TextField label="Name" onChange={onChange} />)
    await user.type(screen.getByRole('textbox'), 'a')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('renders supporting text', () => {
    render(<TextField label="Name" supportingText="Enter your full name" />)
    expect(screen.getByText('Enter your full name')).toBeInTheDocument()
  })

  it('renders error text when error is true', () => {
    render(
      <TextField
        label="Email"
        error
        errorText="Invalid email"
        supportingText="Help text"
      />,
    )
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.queryByText('Help text')).not.toBeInTheDocument()
  })

  it('error text has role=alert', () => {
    render(<TextField label="Email" error errorText="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('renders character counter with maxLength', () => {
    render(<TextField label="Bio" maxLength={100} value="" onChange={() => {}} />)
    expect(screen.getByText('0 / 100')).toBeInTheDocument()
  })

  it('renders prefix text', () => {
    render(<TextField label="Price" prefixText="$" value="5" onChange={() => {}} />)
    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('renders suffix text', () => {
    render(<TextField label="Weight" suffixText="kg" value="5" onChange={() => {}} />)
    expect(screen.getByText('kg')).toBeInTheDocument()
  })

  it('renders leading icon', () => {
    render(
      <TextField
        label="Search"
        startIcon={<svg data-testid="lead-icon" />}
      />,
    )
    expect(screen.getByTestId('lead-icon')).toBeInTheDocument()
  })

  it('renders trailing icon', () => {
    render(
      <TextField
        label="Password"
        endIcon={<svg data-testid="trail-icon" />}
      />,
    )
    expect(screen.getByTestId('trail-icon')).toBeInTheDocument()
  })

  it('disables the input when disabled', () => {
    render(<TextField label="Name" disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders textarea when multiline', () => {
    render(<TextField label="Message" multiline />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('sets aria-invalid when error', () => {
    render(<TextField label="Name" error />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sets aria-describedby linking to supporting text', () => {
    render(<TextField label="Name" supportingText="Help" />)
    const input = screen.getByRole('textbox')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)).toHaveTextContent('Help')
  })

  it('clicking the container focuses the input', async () => {
    const user = userEvent.setup()
    const { container } = render(<TextField label="Name" />)
    const field = container.firstElementChild as HTMLElement
    await user.click(field)
    expect(screen.getByRole('textbox')).toHaveFocus()
  })

  it('has no axe violations (filled)', async () => {
    const { container } = render(<TextField label="Name" variant="filled" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe violations (outlined)', async () => {
    const { container } = render(<TextField label="Name" variant="outlined" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe violations (error state)', async () => {
    const { container } = render(
      <TextField label="Email" error errorText="Invalid" />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
