import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Slider } from './Slider'

const meta = {
  title: 'Components/Slider',
  component: Slider,
  parameters: { layout: 'padded' },
  args: { defaultValue: 40, onChange: fn() },
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    showTicks: { control: 'boolean' },
    showValueLabel: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <Slider {...args} aria-label="Volume" />
    </div>
  ),
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Continuous: Story = {}

export const WithValueLabel: Story = {
  args: { showValueLabel: true, defaultValue: 60 },
}

export const Stepped: Story = {
  args: { step: 10, showTicks: true, showValueLabel: true, defaultValue: 50 },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 30 },
}

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState(25)
    return (
      <div style={{ width: 320 }}>
        <Slider
          {...args}
          value={value}
          onChange={(v) => setValue(v)}
          showValueLabel
          aria-label="Controlled"
        />
        <p>Value: {value}</p>
      </div>
    )
  },
}
