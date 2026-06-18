import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Radio } from './Radio'

const meta = {
  title: 'Components/Radio',
  component: Radio,
  parameters: { layout: 'centered' },
  args: {
    'aria-label': 'Option',
    name: 'demo',
    onChange: fn(),
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onChange: { action: 'onChange' },
  },
} satisfies Meta<typeof Radio>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [selected, setSelected] = useState('')
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(event.target.value)
        onChangeProp?.(event)
      },
      [onChangeProp],
    )
    return (
      <div style={{ display: 'flex', gap: 16 }}>
        {['A', 'B', 'C'].map((v) => (
          <label
            key={v}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <Radio
              {...args}
              name="playground"
              value={v}
              checked={selected === v}
              onChange={handleChange}
              aria-label={`Option ${v}`}
            />
            <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 16 }}>{v}</span>
          </label>
        ))}
      </div>
    )
  },
}

export const Checked: Story = {
  args: { checked: true },
}

export const Unchecked: Story = {
  args: { checked: false },
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Radio {...args} disabled aria-label="Disabled unchecked" />
      <Radio {...args} disabled checked aria-label="Disabled checked" onChange={() => {}} />
    </div>
  ),
}

export const RadioGroup: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [selected, setSelected] = useState('option1')
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(event.target.value)
        onChangeProp?.(event)
      },
      [onChangeProp],
    )
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {options.map(({ value, label }) => (
          <label
            key={value}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <Radio
              {...args}
              name="radio-group"
              value={value}
              checked={selected === value}
              onChange={handleChange}
              aria-label={label}
            />
            <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 16 }}>{label}</span>
          </label>
        ))}
      </div>
    )
  },
}
