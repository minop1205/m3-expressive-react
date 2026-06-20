import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { TextField } from './TextField'

const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
)

const ClearIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

const VisibilityIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
  </svg>
)

const meta = {
  title: 'Components/TextField',
  component: TextField,
  parameters: { layout: 'centered' },
  args: {
    label: 'Label',
    onChange: fn(),
    onFocus: fn(),
    onBlur: fn(),
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['filled', 'outlined'],
    },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    multiline: { control: 'boolean' },
    onChange: { action: 'onChange' },
    onFocus: { action: 'onFocus' },
    onBlur: { action: 'onBlur' },
  },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = {
  args: {
    variant: 'filled',
    label: 'Label',
  },
}

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    label: 'Label',
  },
}

export const WithSupportingText: Story = {
  args: {
    variant: 'filled',
    label: 'Label',
    supportingText: 'Supporting text',
  },
}

export const ErrorState: Story = {
  args: {
    variant: 'filled',
    label: 'Label',
    error: true,
    errorText: 'Error message',
    value: 'Invalid input',
  },
}

export const WithIcons: Story = {
  args: {
    variant: 'filled',
    label: 'Search',
    leadingIcon: SearchIcon,
    trailingIcon: ClearIcon,
  },
}

export const WithPrefixSuffix: Story = {
  args: {
    variant: 'filled',
    label: 'Amount',
    prefixText: '$',
    suffixText: '.00',
  },
}

export const CharacterCounter: Story = {
  render: (args) => {
    const [value, setValue] = useState('')
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
        args.onChange?.(e)
      },
      [args],
    )
    return (
      <TextField
        {...args}
        value={value}
        onChange={handleChange}
      />
    )
  },
  args: {
    variant: 'filled',
    label: 'Username',
    maxLength: 20,
    supportingText: 'Max 20 characters',
  },
}

export const Disabled: Story = {
  args: {
    variant: 'filled',
    label: 'Label',
    disabled: true,
    value: 'Disabled value',
  },
}

export const Multiline: Story = {
  args: {
    variant: 'filled',
    label: 'Message',
    multiline: true,
    rows: 3,
  },
}

export const Password: Story = {
  render: (args) => {
    const [visible, setVisible] = useState(false)
    return (
      <TextField
        {...args}
        type={visible ? 'text' : 'password'}
        trailingIcon={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'inherit',
              display: 'flex',
            }}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {VisibilityIcon}
          </button>
        }
      />
    )
  },
  args: {
    variant: 'outlined',
    label: 'Password',
  },
}

export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TextField {...args} variant="filled" label="Filled" />
      <TextField {...args} variant="outlined" label="Outlined" />
      <TextField {...args} variant="filled" label="Filled with icons" leadingIcon={SearchIcon} trailingIcon={ClearIcon} />
      <TextField {...args} variant="outlined" label="Outlined with icons" leadingIcon={SearchIcon} trailingIcon={ClearIcon} />
      <TextField {...args} variant="filled" label="Filled error" error errorText="Error" />
      <TextField {...args} variant="outlined" label="Outlined error" error errorText="Error" />
      <TextField {...args} variant="filled" label="Filled disabled" disabled />
      <TextField {...args} variant="outlined" label="Outlined disabled" disabled />
    </div>
  ),
  args: {},
}
