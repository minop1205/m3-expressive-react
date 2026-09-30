import { cloneElement, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { NavigationBar, NavigationBarItem, type NavigationItemLayout } from './NavigationBar'
import Home from '@material-symbols/svg-400/outlined/home.svg?react'
import HomeFill from '@material-symbols/svg-400/outlined/home-fill.svg?react'
import Search from '@material-symbols/svg-400/outlined/search.svg?react'
import SearchFill from '@material-symbols/svg-400/outlined/search-fill.svg?react'
import Bell from '@material-symbols/svg-400/outlined/notifications.svg?react'
import BellFill from '@material-symbols/svg-400/outlined/notifications-fill.svg?react'
import Mail from '@material-symbols/svg-400/outlined/mail.svg?react'
import MailFill from '@material-symbols/svg-400/outlined/mail-fill.svg?react'
import Person from '@material-symbols/svg-400/outlined/person.svg?react'
import PersonFill from '@material-symbols/svg-400/outlined/person-fill.svg?react'

const meta = {
  title: 'Components/NavigationBar',
  component: NavigationBar,
  parameters: { layout: 'fullscreen' },
  args: { value: 'home', onChange: () => {} },
} satisfies Meta<typeof NavigationBar>

export default meta
type Story = StoryObj<typeof meta>

/** Filled icon for the selected destination, outlined for the rest (m3). */
function Bar({
  itemLayout,
  count = 3,
  disabled,
  initial = 'home',
}: {
  itemLayout?: NavigationItemLayout
  count?: 3 | 4 | 5
  disabled?: string
  initial?: string
}) {
  const [value, setValue] = useState(initial)
  const items = [
    <NavigationBarItem key="home" value="home" icon={<Home />} selectedIcon={<HomeFill />} label="Home" />,
    <NavigationBarItem key="search" value="search" icon={<Search />} selectedIcon={<SearchFill />} label="Search" />,
    <NavigationBarItem key="alerts" value="alerts" icon={<Bell />} selectedIcon={<BellFill />} label="Alerts" badge="3" />,
    <NavigationBarItem key="mail" value="mail" icon={<Mail />} selectedIcon={<MailFill />} label="Mail" badge />,
    <NavigationBarItem key="profile" value="profile" icon={<Person />} selectedIcon={<PersonFill />} label="Profile" />,
  ]
    .slice(0, count)
    .map((item) => (item.key === disabled ? cloneElement(item, { disabled: true }) : item))
  return (
    <NavigationBar aria-label="Main" value={value} onChange={(_event, v) => setValue(v)} itemLayout={itemLayout}>
      {items}
    </NavigationBar>
  )
}

export const Default: Story = {
  render: () => <Bar />,
}

/** Five destinations, including a counting badge and a small (dot) badge. */
export const FiveItems: Story = {
  render: () => <Bar count={5} />,
}

/**
 * Horizontal items (icon beside label) — for medium widths. Items are centered
 * with the extra width at both ends of the bar.
 */
export const Horizontal: Story = {
  render: () => <Bar itemLayout="horizontal" count={4} />,
}

/** A disabled destination. */
export const DisabledItem: Story = {
  render: () => <Bar count={4} disabled="search" />,
}

/**
 * Long labels wrap and the bar grows vertically (m3 a11y: the full label stays
 * visible at larger text sizes).
 */
export const WrappingLabels: Story = {
  render: () => {
    const [value, setValue] = useState('library')
    return (
      <div style={{ width: 360 }}>
        <NavigationBar aria-label="Main" value={value} onChange={(_event, v) => setValue(v)}>
          <NavigationBarItem value="library" icon={<Home />} selectedIcon={<HomeFill />} label="Library" />
          <NavigationBarItem value="recent" icon={<Search />} selectedIcon={<SearchFill />} label="Recently played" />
          <NavigationBarItem value="notifications" icon={<Bell />} selectedIcon={<BellFill />} label="Notification settings" />
          <NavigationBarItem value="profile" icon={<Person />} selectedIcon={<PersonFill />} label="Profile" />
        </NavigationBar>
      </div>
    )
  },
}
