import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Home from '@material-symbols/svg-400/outlined/home.svg?react'
import Favorite from '@material-symbols/svg-400/outlined/favorite.svg?react'
import Person from '@material-symbols/svg-400/outlined/person.svg?react'
import { Tab, Tabs } from './Tabs'

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
  args: { value: 'flights', onChange: () => {} },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  render: () => {
    const [value, setValue] = useState('flights')
    return (
      <Tabs value={value} onChange={(_event, v) => setValue(v)} variant="primary" style={{ width: 420 }}>
        <Tab value="flights" label="Flights" />
        <Tab value="trips" label="Trips" />
        <Tab value="explore" label="Explore" />
      </Tabs>
    )
  },
}

export const Secondary: Story = {
  render: () => {
    const [value, setValue] = useState('trips')
    return (
      <Tabs value={value} onChange={(_event, v) => setValue(v)} variant="secondary" style={{ width: 420 }}>
        <Tab value="flights" label="Flights" />
        <Tab value="trips" label="Trips" />
        <Tab value="explore" label="Explore" />
      </Tabs>
    )
  },
}

export const WithIcons: Story = {
  render: () => {
    const [value, setValue] = useState('home')
    return (
      <Tabs value={value} onChange={(_event, v) => setValue(v)} style={{ width: 420 }}>
        <Tab value="home" label="Home" icon={<Home />} />
        <Tab value="favorites" label="Favorites" icon={<Favorite />} />
        <Tab value="profile" label="Profile" icon={<Person />} />
      </Tabs>
    )
  },
}

const scrollableTabs = [
  'Overview',
  'Specifications',
  'Reviews',
  'Pricing',
  'Accessories',
  'Support',
  'Downloads',
  'Community',
]

export const Scrollable: Story = {
  render: () => {
    const [value, setValue] = useState('pricing')
    return (
      <Tabs
        value={value}
        onChange={(_event, v) => setValue(v)}
        scrollable
        aria-label="Product sections"
        style={{ width: 420 }}
      >
        {scrollableTabs.map((label) => (
          <Tab key={label} value={label.toLowerCase()} label={label} />
        ))}
      </Tabs>
    )
  },
}
