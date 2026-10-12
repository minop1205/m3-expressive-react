import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { TextField } from './TextField'
import SearchIcon from '@material-symbols/svg-400/outlined/search.svg?react'
import ClearIcon from '@material-symbols/svg-400/outlined/close.svg?react'
import VisibilityIcon from '@material-symbols/svg-400/outlined/visibility.svg?react'
import VisibilityOffIcon from '@material-symbols/svg-400/outlined/visibility_off.svg?react'
import { IconButton } from '../IconButton'

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
    labelPlacement: {
      control: 'inline-radio',
      options: ['floating', 'above'],
    },
    shrinkLabel: { control: 'boolean' },
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
    startIcon: <SearchIcon />,
    endIcon: <ClearIcon />,
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
        endIcon={
          <IconButton
            variant="standard"
            icon={visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
          />
        }
      />
    )
  },
  args: {
    variant: 'outlined',
    label: 'Password',
  },
}

/** `labelPlacement="above"` (Compose `TextFieldLabelPosition.Above`): the
 * label sits minimized above the container, which lays out like a
 * label-less field — no outlined notch, placeholder always visible. */
export const LabelAbove: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TextField {...args} variant="filled" label="Filled" placeholder="Placeholder" />
      <TextField {...args} variant="outlined" label="Outlined" placeholder="Placeholder" />
      <TextField {...args} variant="filled" label="With icons" required startIcon={<SearchIcon />} endIcon={<ClearIcon />} defaultValue="Value" />
      <TextField {...args} variant="outlined" label="With icons" required startIcon={<SearchIcon />} endIcon={<ClearIcon />} defaultValue="Value" supportingText="Supporting text" />
      <TextField {...args} variant="outlined" label="Error" error errorText="Error message" defaultValue="Invalid" />
      <TextField {...args} variant="outlined" label="Disabled" disabled defaultValue="Disabled value" />
    </div>
  ),
  args: { labelPlacement: 'above' },
}

/** `shrinkLabel` (Compose `Inside` / `Cutout(isAlwaysMinimized = true)`):
 * the floating label stays minimized while empty, so the placeholder and
 * prefix / suffix show alongside it. */
export const ShrinkLabel: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TextField {...args} variant="filled" label="Filled" placeholder="Placeholder" />
      <TextField {...args} variant="outlined" label="Outlined" placeholder="Placeholder" />
      <TextField {...args} variant="filled" label="Amount" prefixText="$" suffixText=".00" />
      <TextField {...args} variant="outlined" label="With icon" startIcon={<SearchIcon />} placeholder="Search" />
    </div>
  ),
  args: { shrinkLabel: true },
}

export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TextField {...args} variant="filled" label="Filled" />
      <TextField {...args} variant="outlined" label="Outlined" />
      <TextField {...args} variant="filled" label="Filled with icons" startIcon={<SearchIcon />} endIcon={<ClearIcon />} />
      <TextField {...args} variant="outlined" label="Outlined with icons" startIcon={<SearchIcon />} endIcon={<ClearIcon />} />
      <TextField {...args} variant="filled" label="Filled error" error errorText="Error" />
      <TextField {...args} variant="outlined" label="Outlined error" error errorText="Error" />
      <TextField {...args} variant="filled" label="Filled disabled" disabled />
      <TextField {...args} variant="outlined" label="Outlined disabled" disabled />
    </div>
  ),
  args: {},
}
