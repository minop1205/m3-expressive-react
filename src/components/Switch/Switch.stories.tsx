import React, { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Switch } from './Switch'

const CloseIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

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
        unselectedIcon={CloseIcon}
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
        unselectedIcon={CloseIcon}
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
