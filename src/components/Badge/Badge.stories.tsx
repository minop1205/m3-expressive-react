import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const MailIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
)

const NotificationsIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
  </svg>
)

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'large'],
    },
    value: { control: 'number' },
    max: { control: 'number' },
    visible: { control: 'boolean' },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const SmallDot: Story = {
  args: {
    size: 'small',
    children: MailIcon,
  },
}

export const SingleDigit: Story = {
  args: {
    value: 3,
    children: MailIcon,
  },
}

export const MultiDigit: Story = {
  args: {
    value: 42,
    children: NotificationsIcon,
  },
}

export const MaxExceeded: Story = {
  args: {
    value: 1200,
    max: 999,
    children: NotificationsIcon,
  },
}

export const CustomMax: Story = {
  args: {
    value: 100,
    max: 99,
    children: MailIcon,
  },
}

export const ZeroValue: Story = {
  args: {
    value: 0,
    children: MailIcon,
  },
}

export const NoBadge: Story = {
  args: {
    children: MailIcon,
  },
}

export const ToggleVisibility: Story = {
  render: () => {
    const [visible, setVisible] = useState(true)
    const toggle = useCallback(() => setVisible((v) => !v), [])
    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Badge value={5} visible={visible}>{NotificationsIcon}</Badge>
        <button type="button" onClick={toggle}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    )
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
      <Badge size="small">{MailIcon}</Badge>
      <Badge value={1}>{MailIcon}</Badge>
      <Badge value={24}>{NotificationsIcon}</Badge>
      <Badge value={1000} max={999}>{NotificationsIcon}</Badge>
    </div>
  ),
}
