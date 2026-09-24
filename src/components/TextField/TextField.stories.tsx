import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { TextField } from './TextField'
import SearchIcon from '@material-symbols/svg-400/outlined/search.svg?react'
import ClearIcon from '@material-symbols/svg-400/outlined/close.svg?react'
import VisibilityIcon from '@material-symbols/svg-400/outlined/visibility.svg?react'

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
    leadingIcon: <SearchIcon />,
    trailingIcon: <ClearIcon />,
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
            {<VisibilityIcon />}
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
      <TextField {...args} variant="filled" label="Filled with icons" leadingIcon={<SearchIcon />} trailingIcon={<ClearIcon />} />
      <TextField {...args} variant="outlined" label="Outlined with icons" leadingIcon={<SearchIcon />} trailingIcon={<ClearIcon />} />
      <TextField {...args} variant="filled" label="Filled error" error errorText="Error" />
      <TextField {...args} variant="outlined" label="Outlined error" error errorText="Error" />
      <TextField {...args} variant="filled" label="Filled disabled" disabled />
      <TextField {...args} variant="outlined" label="Outlined disabled" disabled />
    </div>
  ),
  args: {},
}
