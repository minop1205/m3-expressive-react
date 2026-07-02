import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { SegmentedButtons } from './SegmentedButton'

const meta = {
  title: 'Components/SegmentedButton',
  component: SegmentedButtons,
  parameters: { layout: 'centered' },
  args: {
    options: [
      { value: 'd', label: 'Day' },
      { value: 'w', label: 'Week' },
      { value: 'm', label: 'Month' },
    ],
    value: 'w',
    onChange: () => {},
  },
} satisfies Meta<typeof SegmentedButtons>

export default meta
type Story = StoryObj<typeof meta>

const days = [
  { value: 'd', label: 'Day' },
  { value: 'w', label: 'Week' },
  { value: 'm', label: 'Month' },
]

export const SingleSelect: Story = {
  render: () => {
    const [value, setValue] = useState('w')
    return (
      <SegmentedButtons
        options={days}
        value={value}
        onChange={(v) => setValue(v as string)}
      />
    )
  },
}

export const MultiSelect: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(['b', 'i'])
    return (
      <SegmentedButtons
        multiSelect
        options={[
          { value: 'b', label: 'Bold' },
          { value: 'i', label: 'Italic' },
          { value: 'u', label: 'Underline' },
        ]}
        value={value}
        onChange={(v) => setValue(v as string[])}
      />
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <SegmentedButtons
      disabled
      options={days}
      value="w"
      onChange={() => {}}
    />
  ),
}
