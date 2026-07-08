import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { NavigationBar, NavigationBarItem } from './NavigationBar'
import Home from '@material-symbols/svg-400/outlined/home.svg?react'
import Search from '@material-symbols/svg-400/outlined/search.svg?react'
import Bell from '@material-symbols/svg-400/outlined/notifications.svg?react'

const meta = {
  title: 'Components/NavigationBar',
  component: NavigationBar,
  parameters: { layout: 'fullscreen' },
  args: { value: 'home', onChange: () => {} },
} satisfies Meta<typeof NavigationBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('home')
    return (
      <NavigationBar value={value} onChange={setValue}>
        <NavigationBarItem value="home" icon={<Home />} label="Home" />
        <NavigationBarItem value="search" icon={<Search />} label="Search" />
        <NavigationBarItem value="alerts" icon={<Bell />} label="Alerts" badge="3" />
      </NavigationBar>
    )
  },
}
