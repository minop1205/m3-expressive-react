import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Chip } from './Chip'
import { ChipSet } from './ChipSet'
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
            onRemove={(event) => {
              setChips((prev) => prev.filter((c) => c !== label))
              onRemoveProp?.(event)
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

/** Deterministic 24dp avatar image (no network, no text glyphs). */
const avatarSrc = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="hsl(${hue} 55% 55%)"/><circle cx="12" cy="9.5" r="4.5" fill="hsl(${hue} 60% 88%)"/><ellipse cx="12" cy="22" rx="8" ry="6" fill="hsl(${hue} 60% 88%)"/></svg>`,
  )}`

/** Input chips opt into the filter selection API (`selected` / `defaultSelected` / `onChange`). */
export const InputSelected: Story = {
  render: ({ onChange: onChangeProp, onRemove: onRemoveProp }) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip variant="input" label="Unselected" defaultSelected={false} onChange={onChangeProp} />
      <Chip variant="input" label="Selected" defaultSelected onChange={onChangeProp} />
      <Chip
        variant="input"
        label="Selected"
        icon={<CalendarIcon />}
        defaultSelected
        removable
        onChange={onChangeProp}
        onRemove={onRemoveProp}
      />
      <Chip variant="input" label="Disabled" selected disabled removable />
    </div>
  ),
}

/** Input chip avatar: 24dp circle, 4dp start padding; 0.38 opacity when disabled. */
export const InputAvatar: Story = {
  render: ({ onRemove: onRemoveProp }) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip
        variant="input"
        label="Ada Lovelace"
        avatar={<img src={avatarSrc(200)} alt="" />}
        removable
        onRemove={onRemoveProp}
      />
      <Chip
        variant="input"
        label="Alan Turing"
        avatar={<img src={avatarSrc(20)} alt="" />}
        selected
        removable
        onRemove={onRemoveProp}
      />
      <Chip
        variant="input"
        label="Grace Hopper"
        avatar={<img src={avatarSrc(120)} alt="" />}
        disabled
        removable
      />
    </div>
  ),
}

/** Filter / suggestion chips with leading icons, removal and elevation. */
export const FilterAndSuggestionOptions: Story = {
  render: ({ onRemove: onRemoveProp }) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip variant="filter" label="Removable" defaultSelected removable onRemove={onRemoveProp} />
      <Chip variant="filter" label="With icon" icon={<CalendarIcon />} />
      <Chip variant="filter" label="Elevated" elevated />
      <Chip variant="filter" label="Elevated" elevated defaultSelected />
      <Chip variant="suggestion" label="Elevated" elevated />
    </div>
  ),
}

/** Labels truncate with an ellipsis when the chip is wider than its container. */
export const Truncated: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 120 }}>
      <Chip variant="assist" label="A very long assist chip label" />
      <Chip variant="input" label="A very long input chip label" removable />
    </div>
  ),
}

export const Dragged: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', padding: 16 }}>
      <Chip variant="assist" label="Assist" dragged />
      <Chip variant="filter" label="Filter" selected dragged />
      <Chip variant="input" label="Input" removable dragged />
    </div>
  ),
}

/**
 * `ChipSet`: one Tab stop for the whole set; ←/→ move between chips (and into
 * a chip's remove action), Home/End jump; Backspace/Delete removes the focused
 * input chip and focus moves to its neighbour.
 */
export const ChipSetKeyboard: Story = {
  render: ({ onChange: onChangeProp, onRemove: onRemoveProp }) => {
    const [people, setPeople] = useState(['Ada', 'Alan', 'Grace', 'Linus'])
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
        <ChipSet aria-label="Dietary filters">
          {['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'].map((label, i) => (
            <Chip
              key={label}
              variant="filter"
              label={label}
              defaultSelected={i === 1}
              disabled={i === 2}
              onChange={onChangeProp}
            />
          ))}
        </ChipSet>
        <ChipSet aria-label="Recipients">
          {people.map((name, i) => (
            <Chip
              key={name}
              variant="input"
              label={name}
              avatar={<img src={avatarSrc(i * 70)} alt="" />}
              removable
              onRemove={(event) => {
                setPeople((prev) => prev.filter((p) => p !== name))
                onRemoveProp?.(event)
              }}
            />
          ))}
        </ChipSet>
      </div>
    )
  },
}
