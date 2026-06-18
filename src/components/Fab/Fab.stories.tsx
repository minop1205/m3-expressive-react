import type { Meta, StoryObj } from '@storybook/react'
import { Fab } from './Fab'

const EditIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
)

const AddIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
  </svg>
)

const NavigationIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
  </svg>
)

const meta = {
  title: 'Components/FAB',
  component: Fab,
  parameters: { layout: 'centered' },
  args: {
    icon: EditIcon,
    'aria-label': 'Edit',
    color: 'primary-container',
    size: 'regular',
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: [
        'primary-container',
        'secondary-container',
        'tertiary-container',
        'primary',
        'secondary',
        'tertiary',
      ],
    },
    size: { control: 'inline-radio', options: ['regular', 'medium', 'large'] },
    disabled: { control: 'boolean' },
    icon: { control: false },
  },
} satisfies Meta<typeof Fab>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Fab {...args} size="regular" aria-label="Regular" />
      <Fab {...args} size="medium" aria-label="Medium" />
      <Fab {...args} size="large" aria-label="Large" />
    </div>
  ),
}

export const Colors: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Fab {...args} color="primary-container" aria-label="Primary container" />
      <Fab {...args} color="secondary-container" aria-label="Secondary container" />
      <Fab {...args} color="tertiary-container" aria-label="Tertiary container" />
      <Fab {...args} color="primary" aria-label="Primary" />
      <Fab {...args} color="secondary" aria-label="Secondary" />
      <Fab {...args} color="tertiary" aria-label="Tertiary" />
    </div>
  ),
}

export const Extended: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <Fab {...args} icon={AddIcon} label="Create" />
      <Fab {...args} icon={NavigationIcon} label="Navigate" color="secondary-container" />
      <Fab {...args} icon={EditIcon} label="Compose" color="tertiary-container" />
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Fab {...args} size="regular" aria-label="Regular" />
      <Fab {...args} size="medium" aria-label="Medium" />
      <Fab {...args} label="Create" icon={AddIcon} />
    </div>
  ),
  args: { disabled: true },
}
