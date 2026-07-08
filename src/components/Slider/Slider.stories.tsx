import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Slider, type SliderValue, type SliderSize } from './Slider'
import VolumeIcon from '@material-symbols/svg-400/outlined/volume_up.svg?react'

const meta = {
  title: 'Components/Slider',
  component: Slider,
  parameters: { layout: 'padded' },
  args: { defaultValue: 40, onChange: fn() },
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 's', 'm', 'l', 'xl'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    centered: { control: 'boolean' },
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

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 28, width: 320 }}>
      {(['xs', 's', 'm', 'l', 'xl'] as SliderSize[]).map((size) => (
        <Slider key={size} {...args} size={size} defaultValue={60} aria-label={size} />
      ))}
    </div>
  ),
}

export const Range: Story = {
  render: (args) => {
    const [value, setValue] = useState<SliderValue>([20, 70])
    return (
      <div style={{ width: 320 }}>
        <Slider {...args} value={value} onChange={setValue} showValueLabel aria-label="Price range" />
        <p>{Array.isArray(value) ? `${value[0]} – ${value[1]}` : value}</p>
      </div>
    )
  },
}

export const Centered: Story = {
  args: { centered: true, defaultValue: 70, showValueLabel: true },
}

export const Stepped: Story = {
  args: { step: 10, showTicks: true, showValueLabel: true, defaultValue: 50 },
}

export const WithInsetIcon: Story = {
  args: {
    size: 'l',
    defaultValue: 60,
    insetIcon: <VolumeIcon />,
  },
}

export const Vertical: Story = {
  render: (args) => (
    <div style={{ height: 240 }}>
      <Slider {...args} orientation="vertical" defaultValue={60} aria-label="Vertical" />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 30 },
}
