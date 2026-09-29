import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Chip } from './Chip'
import CalendarIcon from '@material-symbols/svg-400/outlined/calendar_today.svg?react'

const meta = {
  title: 'Components/Chip',
  component: Chip,
  parameters: { layout: 'centered' },
  args: {
    label: 'Chip',
    variant: 'assist',
    onClick: fn(),
    onChange: fn(),
    onRemove: fn(),
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['assist', 'filter', 'input', 'suggestion'],
    },
    elevated: { control: 'boolean' },
    selected: { control: 'boolean' },
    removable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    icon: { control: false },
    onClick: { action: 'onClick' },
    onChange: { action: 'onChange' },
    onRemove: { action: 'onRemove' },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Assist: Story = {
  args: { variant: 'assist', label: 'Assist chip' },
}

export const AssistWithIcon: Story = {
  args: { variant: 'assist', label: 'Add to calendar', icon: <CalendarIcon /> },
}

export const AssistElevated: Story = {
  args: { variant: 'assist', label: 'Elevated chip', elevated: true },
}

export const Filter: Story = {
  render: ({ onClick: onClickProp, onChange: onChangeProp, ...args }) => {
    const [selected, setSelected] = useState(false)
    const handleChange = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>, next: boolean) => {
        setSelected(next)
        onChangeProp?.(event, next)
      },
      [onChangeProp],
    )
    return (
      <Chip
        {...args}
        variant="filter"
        label="Filter chip"
        selected={selected}
        onChange={handleChange}
        onClick={onClickProp}
      />
    )
  },
}

export const FilterGroup: Story = {
  render: ({ onClick: onClickProp, onChange: onChangeProp }) => {
    const labels = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free']
    const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set())
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {labels.map((label) => (
          <Chip
            key={label}
            variant="filter"
            label={label}
            selected={selectedSet.has(label)}
            onChange={(event, next) => {
              setSelectedSet((prev) => {
                const s = new Set(prev)
                next ? s.add(label) : s.delete(label)
                return s
              })
              onChangeProp?.(event, next)
            }}
            onClick={onClickProp}
          />
        ))}
      </div>
    )
  },
}

export const Input: Story = {
  render: ({ onClick: onClickProp, onRemove: onRemoveProp }) => {
    const initial = ['Design', 'Engineering', 'Marketing']
    const [chips, setChips] = useState(initial)
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {chips.map((label) => (
          <Chip
            key={label}
            variant="input"
            label={label}
            removable
            onClick={onClickProp}
            onRemove={() => {
              setChips((prev) => prev.filter((c) => c !== label))
              onRemoveProp?.()
            }}
          />
        ))}
      </div>
    )
  },
}

export const Suggestion: Story = {
  args: { variant: 'suggestion', label: 'Suggestion chip' },
}

export const AllVariants: Story = {
  render: ({ onClick: onClickProp, onChange: onChangeProp, onRemove: onRemoveProp }) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip variant="assist" label="Assist" onClick={onClickProp} />
      <Chip variant="filter" label="Filter" onClick={onClickProp} onChange={onChangeProp} />
      <Chip variant="input" label="Input" removable onClick={onClickProp} onRemove={onRemoveProp} />
      <Chip variant="suggestion" label="Suggestion" onClick={onClickProp} />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip variant="assist" label="Assist" disabled />
      <Chip variant="filter" label="Filter" disabled selected />
      <Chip variant="input" label="Input" disabled removable />
      <Chip variant="suggestion" label="Suggestion" disabled />
    </div>
  ),
}
