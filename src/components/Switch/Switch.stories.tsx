import React, { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Close from '@material-symbols/svg-400/outlined/close.svg?react'
import { Switch } from './Switch'

const meta = {
  title: 'Components/Switch',
  component: Switch,
  parameters: { layout: 'centered' },
  args: {
    'aria-label': 'Toggle',
    onChange: fn(),
  },
  argTypes: {
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
    icons: { control: 'boolean' },
    onChange: { action: 'onChange' },
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [selected, setSelected] = useState(false)
    const handleChange = useCallback(
      (next: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(next)
        onChangeProp?.(next, event)
      },
      [onChangeProp],
    )
    return <Switch {...args} selected={selected} onChange={handleChange} />
  },
}

export const Unselected: Story = {
  args: { selected: false },
}

export const Selected: Story = {
  args: { selected: true },
}

export const WithIcons: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [selected, setSelected] = useState(false)
    const handleChange = useCallback(
      (next: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(next)
        onChangeProp?.(next, event)
      },
      [onChangeProp],
    )
    return (
      <Switch
        {...args}
        selected={selected}
        onChange={handleChange}
        icons
        unselectedIcon={<Close />}
      />
    )
  },
}

export const WithIconsBothStates: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [selected, setSelected] = useState(true)
    const handleChange = useCallback(
      (next: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(next)
        onChangeProp?.(next, event)
      },
      [onChangeProp],
    )
    return (
      <Switch
        {...args}
        selected={selected}
        onChange={handleChange}
        icons
        unselectedIcon={<Close />}
      />
    )
  },
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Switch {...args} disabled aria-label="Off disabled" />
      <Switch {...args} disabled selected aria-label="On disabled" />
    </div>
  ),
}

export const WithLabel: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [selected, setSelected] = useState(false)
    const handleChange = useCallback(
      (next: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(next)
        onChangeProp?.(next, event)
      },
      [onChangeProp],
    )
    return (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <Switch {...args} selected={selected} onChange={handleChange} />
        <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 16 }}>
          {selected ? 'On' : 'Off'}
        </span>
      </label>
    )
  },
}
