import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ScrollField } from './ScrollField'

const meta = {
  title: 'Components/ScrollField',
  component: ScrollField,
  parameters: { layout: 'centered' },
  args: { max: 59, 'aria-label': 'Minute' },
} satisfies Meta<typeof ScrollField>

export default meta
type Story = StoryObj<typeof meta>

/** 200px tall (Compose ScrollFieldHeight): wheel, drag, or ArrowUp / ArrowDown. */
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(30)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <ScrollField {...args} value={value} onChange={(_, v) => setValue(v)} />
        <span>{value}</span>
      </div>
    )
  },
}

/** A custom range with unit-bearing `aria-valuetext` and a wider field. */
export const CustomRange: Story = {
  args: { min: 2000, max: 2030, 'aria-label': 'Year' },
  render: (args) => (
    <ScrollField
      {...args}
      defaultValue={2026}
      formatValue={String}
      getValueText={(v) => `Year ${v}`}
      style={{ width: 160 }}
    />
  ),
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 15 },
}
