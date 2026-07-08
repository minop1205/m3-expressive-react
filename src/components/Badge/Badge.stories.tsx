import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Mail from '@material-symbols/svg-400/outlined/mail.svg?react'
import Notifications from '@material-symbols/svg-400/outlined/notifications.svg?react'
import { Badge } from './Badge'

const MailIcon = <Mail />
const NotificationsIcon = <Notifications />

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
