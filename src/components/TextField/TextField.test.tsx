import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import { createRef, useState } from 'react'
import { IconButton } from '../IconButton'
import { TextField } from './TextField'
import styles from './TextField.module.css'

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

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(<TextField label="Test" ref={ref} />)
    expect(ref.current).toBe(container.firstElementChild)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('forwards inputRef to the native input', () => {
    const inputRef = createRef<HTMLInputElement | HTMLTextAreaElement>()
    render(<TextField label="Test" inputRef={inputRef} />)
    expect(inputRef.current).toBe(screen.getByRole('textbox'))
  })

  it('forwards inputRef to the textarea when multiline', () => {
    const inputRef = createRef<HTMLInputElement | HTMLTextAreaElement>()
    render(<TextField label="Test" multiline inputRef={inputRef} />)
    expect(inputRef.current).toBe(screen.getByRole('textbox'))
    expect(inputRef.current?.tagName).toBe('TEXTAREA')
  })

  it('routes inputProps attributes (pattern, min/max/step, onKeyDown) to the native input', () => {
    const onKeyDown = vi.fn()
    render(
      <TextField
        label="Code"
        inputProps={{ pattern: '[0-9]*', min: 0, max: 10, step: 2, onKeyDown }}
      />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('pattern', '[0-9]*')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '10')
    expect(input).toHaveAttribute('step', '2')
    fireEvent.keyDown(input, { key: 'a' })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('does not let inputProps clobber the controlled value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TextField
        label="Test"
        value="controlled"
        onChange={onChange}
        inputProps={{ value: 'clobbered', onChange: () => {} } as never}
      />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('controlled')
    await user.type(input, 'x')
    // The component's own onChange wiring still drives the controlled value.
    expect(onChange).toHaveBeenCalled()
    expect(input).toHaveValue('controlled')
  })

  it('lets inputProps set required / readOnly / disabled / type when the props are omitted', () => {
    render(
      <TextField
        label="Code"
        inputProps={{ required: true, readOnly: true, disabled: true, type: 'email' }}
      />,
    )
    const input = screen.getByLabelText(/^Code/)
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('readonly')
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('type', 'email')
  })

  it('lets explicit top-level props win over inputProps', () => {
    render(
      <TextField
        label="Code"
        required={false}
        readOnly={false}
        disabled={false}
        type="text"
        inputProps={{ required: true, readOnly: true, disabled: true, type: 'email' }}
      />,
    )
    const input = screen.getByLabelText('Code')
    expect(input).not.toBeRequired()
    expect(input).not.toHaveAttribute('readonly')
    expect(input).toBeEnabled()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('spreads inputProps on the textarea when multiline', () => {
    render(<TextField label="Notes" multiline inputProps={{ maxLength: 5 }} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '5')
  })

  it('spreads unknown rest props on the root element', () => {
    const { container } = render(
      <TextField label="Test" data-testid="root-landing" />,
    )
    expect(container.firstElementChild).toHaveAttribute(
      'data-testid',
      'root-landing',
    )
    expect(screen.getByRole('textbox')).not.toHaveAttribute('data-testid')
  })

  it('routes input concerns (placeholder, name, type) to the native input', () => {
    render(
      <TextField label="Test" placeholder="Type here" name="field" type="email" />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder', 'Type here')
    expect(input).toHaveAttribute('name', 'field')
    expect(input).toHaveAttribute('type', 'email')
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

  it('describes the input with its prefix and suffix, then the supporting text', () => {
    render(
      <TextField
        label="Price"
        prefixText="$"
        suffixText="USD"
        supportingText="Per item"
        value="5"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('$ USD Per item')
  })

  it('reads the counter as a character count, not the visible "n / max"', () => {
    render(<TextField label="Bio" maxLength={100} value="abc" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      'Character count: 3 of 100',
    )
    expect(screen.getByText('3 / 100')).toHaveAttribute('aria-hidden', 'true')
  })

  it('accepts a custom counter label', () => {
    render(
      <TextField
        label="Bio"
        maxLength={10}
        value="ab"
        onChange={() => {}}
        getCounterLabel={(n, max) => `${n}/${max} 文字`}
      />,
    )
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('2/10 文字')
  })

  it('keeps the counter out of the error alert', () => {
    render(
      <TextField
        label="Bio"
        error
        errorText="Too long"
        maxLength={5}
        value="abcdef"
        onChange={() => {}}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/^Too long$/)
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      'Too long Character count: 6 of 5',
    )
  })

  it('clicking the container focuses the input', async () => {
    const user = userEvent.setup()
    const { container } = render(<TextField label="Name" />)
    const field = container.firstElementChild as HTMLElement
    await user.click(field)
    expect(screen.getByRole('textbox')).toHaveFocus()
  })

  it('leaves clicks on an interactive endIcon to that control (#414)', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <TextField
        label="Password"
        endIcon={
          <button type="button" onClick={onToggle}>
            Show
          </button>
        }
      />,
    )
    const toggle = screen.getByRole('button', { name: 'Show' })
    await user.click(toggle)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(toggle).toHaveFocus()
  })

  it('keeps focus on an interactive endIcon activated with Enter (#414)', async () => {
    const user = userEvent.setup()
    render(
      <TextField label="Search" endIcon={<button type="button">Clear</button>} />,
    )
    const clear = screen.getByRole('button', { name: 'Clear' })
    clear.focus()
    await user.keyboard('{Enter}')
    expect(clear).toHaveFocus()
  })

  it('still focuses the input when a decorative icon is clicked', async () => {
    const user = userEvent.setup()
    render(<TextField label="Search" startIcon={<svg data-testid="icon" />} />)
    await user.click(screen.getByTestId('icon'))
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

describe('TextField native form integration (#432)', () => {
  const root = (container: HTMLElement) => container.querySelector(`.${styles.textField}`)!

  it('restores an uncontrolled value on form.reset(); label, counter and populated follow', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <form>
        <TextField label="Name" name="n" defaultValue="a" maxLength={10} />
      </form>,
    )
    const form = container.querySelector('form')!
    const input = screen.getByRole('textbox') as HTMLInputElement

    await user.type(input, 'bc')
    expect(input).toHaveValue('abc')
    expect(screen.getByText('3 / 10')).toBeInTheDocument()

    act(() => form.reset())
    expect(input).toHaveValue('a')
    expect(new FormData(form).get('n')).toBe('a')
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
    expect(root(container)).toHaveClass(styles.populated)
  })

  it('clears populated on reset to an empty default and keeps onChange firing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(
      <form>
        <TextField label="Name" maxLength={10} onChange={onChange} />
      </form>,
    )
    const form = container.querySelector('form')!
    const input = screen.getByRole('textbox')

    await user.type(input, 'x')
    expect(root(container)).toHaveClass(styles.populated)

    act(() => form.reset())
    expect(input).toHaveValue('')
    expect(root(container)).not.toHaveClass(styles.populated)
    expect(screen.getByText('0 / 10')).toBeInTheDocument()

    // The same value as before the reset must still register as a change.
    onChange.mockClear()
    await user.type(input, 'x')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
  })

  it('follows the form attribute for reset', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <>
        <form id="f" />
        <TextField label="Name" inputProps={{ form: 'f' }} />
      </>,
    )
    const form = container.querySelector('form')!
    const input = screen.getByRole('textbox')
    await user.type(input, 'abc')
    act(() => form.reset())
    expect(input).toHaveValue('')
    expect(root(container)).not.toHaveClass(styles.populated)
  })

  it('keeps the required asterisk out of the accessible name (visual unchanged)', () => {
    const { rerender } = render(<TextField label="Email" required />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toBeRequired()
    const label = document.querySelector('label')!
    expect(label).toHaveTextContent('Email*')
    expect(label.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^\*$/)

    rerender(<TextField label="Email" required variant="outlined" />)
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument()
    expect(document.querySelector(`.${styles.outlineLabel}`)).toHaveTextContent('Email*')
  })

  it('treats partial number input (validity.badInput) as populated', () => {
    const { container } = render(<TextField label="Amount" type="number" />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(root(container)).not.toHaveClass(styles.populated)

    // "-" / "1e": the browser reports value === '' but flags badInput.
    Object.defineProperty(input, 'validity', {
      configurable: true,
      value: { ...input.validity, badInput: true },
    })
    fireEvent.input(input)
    expect(root(container)).toHaveClass(styles.populated)

    Object.defineProperty(input, 'validity', {
      configurable: true,
      value: { ...input.validity, badInput: false },
    })
    fireEvent.input(input)
    expect(root(container)).not.toHaveClass(styles.populated)
  })

  it('treats browser autofill as populated (animationstart detection)', () => {
    const { container } = render(<TextField label="Email" />)
    const input = screen.getByRole('textbox')
    expect(root(container)).not.toHaveClass(styles.populated)

    // jsdom has no AnimationEvent / CSS animations: dispatch what the
    // browser fires when `:-webkit-autofill` starts / stops matching.
    const animationStart = (animationName: string) => {
      const event = new Event('animationstart', { bubbles: true })
      Object.defineProperty(event, 'animationName', { value: animationName })
      fireEvent(input, event)
    }
    animationStart(styles.autofillStart)
    expect(root(container)).toHaveClass(styles.populated)

    animationStart(styles.autofillCancel)
    expect(root(container)).not.toHaveClass(styles.populated)
  })

  it('merges inputProps aria-describedby with the field ids', () => {
    render(
      <>
        <span id="extra">Extra hint</span>
        <TextField
          label="Name"
          supportingText="Help"
          inputProps={{ 'aria-describedby': 'extra' }}
        />
      </>,
    )
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Help Extra hint')
  })

  it('keeps inputProps aria-describedby when the field has no ids of its own', () => {
    render(
      <>
        <span id="extra">Extra hint</span>
        <TextField label="Name" inputProps={{ 'aria-describedby': 'extra' }} />
      </>,
    )
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'extra')
  })
})

describe('TextField label placement (B37, #439)', () => {
  const root = (container: HTMLElement) => container.querySelector(`.${styles.textField}`)!

  it("labelPlacement='above' renders the label outside the container", () => {
    const { container } = render(<TextField label="Email" labelPlacement="above" required />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    const label = container.querySelector(`.${styles.aboveLabel}`)!
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', input.id)
    expect(label).toHaveTextContent('Email*')
    // Before the container, not inside it; no floating label.
    expect(label.nextElementSibling).toHaveClass(styles.field)
    expect(container.querySelector(`.${styles.field} label`)).toBeNull()
    expect(container.querySelectorAll('label')).toHaveLength(1)
    // The container lays out like a label-less field.
    expect(root(container)).toHaveClass(styles.noLabel)
  })

  it("labelPlacement='above' draws no outlined notch", () => {
    const { container } = render(
      <TextField variant="outlined" label="Email" labelPlacement="above" />,
    )
    expect(container.querySelector(`.${styles.outlineLabel}`)).toBeNull()
    expect(root(container)).toHaveClass(styles.noLabel)
  })

  it("labelPlacement='above' clicks on the label focus the input", async () => {
    const user = userEvent.setup()
    render(<TextField label="Email" labelPlacement="above" />)
    await user.click(screen.getByText('Email'))
    expect(screen.getByRole('textbox')).toHaveFocus()
  })

  it("labelPlacement='above' without a label renders nothing extra", () => {
    const { container } = render(<TextField labelPlacement="above" aria-label="x" />)
    expect(container.querySelector('label')).toBeNull()
  })

  it('shrinkLabel keeps the floating label minimized (both variants)', () => {
    const { container, rerender } = render(<TextField label="Amount" shrinkLabel />)
    expect(root(container)).toHaveClass(styles.shrinkLabel)
    expect(root(container)).not.toHaveClass(styles.noLabel)
    expect(container.querySelector(`.${styles.field} .${styles.label}`)).toHaveTextContent('Amount')

    rerender(<TextField variant="outlined" label="Amount" shrinkLabel />)
    expect(root(container)).toHaveClass(styles.shrinkLabel)
    expect(container.querySelector(`.${styles.outlineLabel}`)).toHaveTextContent('Amount')
  })

  it('shrinkLabel has no effect without a label or with the label above', () => {
    const { container, rerender } = render(<TextField shrinkLabel aria-label="x" />)
    expect(root(container)).not.toHaveClass(styles.shrinkLabel)
    rerender(<TextField label="Amount" labelPlacement="above" shrinkLabel />)
    expect(root(container)).not.toHaveClass(styles.shrinkLabel)
  })

  it('defaults to the floating placement (no new classes)', () => {
    const { container } = render(<TextField label="Name" />)
    expect(root(container)).not.toHaveClass(styles.shrinkLabel)
    expect(container.querySelector(`.${styles.aboveLabel}`)).toBeNull()
  })

  it('has no axe violations with the label above or shrunk', async () => {
    const { container } = render(
      <>
        <TextField label="Above filled" labelPlacement="above" supportingText="Help" />
        <TextField variant="outlined" label="Above outlined" labelPlacement="above" error errorText="Error" />
        <TextField label="Shrunk filled" shrinkLabel placeholder="Placeholder" />
        <TextField variant="outlined" label="Shrunk outlined" shrinkLabel prefixText="$" />
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('TextField tonal style (B44, #444)', () => {
  const root = (container: HTMLElement) => container.firstElementChild as HTMLElement

  it('adds the tonal class only when requested', () => {
    const { container, rerender } = render(<TextField label="Name" />)
    expect(root(container)).not.toHaveClass(styles.tonal)
    rerender(<TextField label="Name" tonal />)
    expect(root(container)).toHaveClass(styles.tonal, styles.filled)
  })

  it('keeps the outlined tonal label inside the container (no notch label)', () => {
    const { container } = render(<TextField variant="outlined" label="Name" tonal />)
    expect(container.querySelector(`.${styles.outlineLabel}`)).toBeNull()
    expect(container.querySelector(`.${styles.label}`)).toHaveTextContent('Name')
  })

  it('has no axe violations in every tonal state', async () => {
    const { container } = render(
      <>
        <TextField tonal label="Filled" supportingText="Help" />
        <TextField tonal label="Error" error errorText="Error" defaultValue="x" />
        <TextField tonal variant="outlined" label="Outlined" startIcon={<span />} />
        <TextField tonal variant="outlined" label="Disabled" disabled defaultValue="x" />
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('TextField secure field recipe (B44, #444)', () => {
  function PasswordField() {
    const [visible, setVisible] = useState(false)
    return (
      <TextField
        id="pw"
        label="Password"
        type={visible ? 'text' : 'password'}
        endIcon={
          <IconButton
            variant="standard"
            toggle
            selected={visible}
            onChange={(_event, next) => setVisible(next)}
            icon={<span />}
            aria-label="Show password"
            aria-controls="pw"
          />
        }
      />
    )
  }

  it('toggles the input type with aria-pressed and leaves focus on the toggle', async () => {
    const user = userEvent.setup()
    render(<PasswordField />)
    const input = screen.getByLabelText('Password')
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(input).toHaveAttribute('type', 'password')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(input).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveFocus()
  })

  it('has no axe violations', async () => {
    const { container } = render(<PasswordField />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
