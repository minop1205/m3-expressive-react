import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Tab, Tabs } from './Tabs'

const HomeIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
)
const FavIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
  </svg>
)
const ProfileIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10m0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5" />
  </svg>
)

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
      <Tabs value={value} onChange={setValue} variant="primary" style={{ width: 420 }}>
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
      <Tabs value={value} onChange={setValue} variant="secondary" style={{ width: 420 }}>
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
      <Tabs value={value} onChange={setValue} style={{ width: 420 }}>
        <Tab value="home" label="Home" icon={HomeIcon} />
        <Tab value="favorites" label="Favorites" icon={FavIcon} />
        <Tab value="profile" label="Profile" icon={ProfileIcon} />
      </Tabs>
    )
  },
}
