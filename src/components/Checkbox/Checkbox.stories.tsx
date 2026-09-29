import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  args: {
    'aria-label': 'Toggle',
    onChange: fn(),
  },
  argTypes: {
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onChange: { action: 'onChange' },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [checked, setChecked] = useState(false)
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>, next: boolean) => {
        setChecked(next)
        onChangeProp?.(event, next)
      },
      [onChangeProp],
    )
    return <Checkbox {...args} checked={checked} onChange={handleChange} />
  },
}

export const Checked: Story = {
  args: { checked: true },
}

export const Unchecked: Story = {
  args: { checked: false },
}

export const Indeterminate: Story = {
  args: { indeterminate: true },
}

export const Error: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Checkbox {...args} error aria-label="Error unchecked" />
      <Checkbox {...args} error checked aria-label="Error checked" />
      <Checkbox {...args} error indeterminate aria-label="Error indeterminate" />
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Checkbox {...args} disabled aria-label="Disabled unchecked" />
      <Checkbox {...args} disabled checked aria-label="Disabled checked" />
      <Checkbox {...args} disabled indeterminate aria-label="Disabled indeterminate" />
    </div>
  ),
}

export const WithLabel: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [checked, setChecked] = useState(false)
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>, next: boolean) => {
        setChecked(next)
        onChangeProp?.(event, next)
      },
      [onChangeProp],
    )
    return (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <Checkbox {...args} checked={checked} onChange={handleChange} />
        <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 16 }}>
          Accept terms and conditions
        </span>
      </label>
    )
  },
}
