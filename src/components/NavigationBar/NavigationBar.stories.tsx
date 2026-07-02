import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { NavigationBar, NavigationBarItem } from './NavigationBar'

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)
const Home = icon('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z')
const Search = icon('M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14')
const Bell = icon('M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1z')

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
        <NavigationBarItem value="home" icon={Home} label="Home" />
        <NavigationBarItem value="search" icon={Search} label="Search" />
        <NavigationBarItem value="alerts" icon={Bell} label="Alerts" badge="3" />
      </NavigationBar>
    )
  },
}
