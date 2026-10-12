import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Home from '@material-symbols/svg-400/outlined/home.svg?react'
import Favorite from '@material-symbols/svg-400/outlined/favorite.svg?react'
import Person from '@material-symbols/svg-400/outlined/person.svg?react'
import { Badge } from '../Badge/Badge'
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

/** `iconPosition="start"`: icon before the label, 8dp gap, 48dp tabs (Compose LeadingIconTab). */
export const LeadingIcons: Story = {
  render: () => {
    const [value, setValue] = useState('home')
    return (
      <Tabs value={value} onChange={(_event, v) => setValue(v)} style={{ width: 420 }}>
        <Tab value="home" label="Home" icon={<Home />} iconPosition="start" />
        <Tab value="favorites" label="Favorites" icon={<Favorite />} iconPosition="start" />
        <Tab value="profile" label="Profile" icon={<Person />} iconPosition="start" />
      </Tabs>
    )
  },
}

/**
 * `badge` takes a `<Badge>`: on the icon (stacked or leading), or after the
 * label for text-only tabs. The indicator still follows the label / icon.
 */
export const WithBadges: Story = {
  render: () => {
    const [stacked, setStacked] = useState('home')
    const [leading, setLeading] = useState('home')
    const [text, setText] = useState('flights')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 420 }}>
        <Tabs value={stacked} onChange={(_event, v) => setStacked(v)} aria-label="Stacked icons">
          <Tab value="home" label="Home" icon={<Home />} badge={<Badge size="small" />} />
          <Tab value="favorites" label="Favorites" icon={<Favorite />} badge={<Badge value={3} />} />
          <Tab value="profile" label="Profile" icon={<Person />} badge={<Badge value={1000} />} />
        </Tabs>
        <Tabs value={leading} onChange={(_event, v) => setLeading(v)} aria-label="Leading icons">
          <Tab value="home" label="Home" icon={<Home />} iconPosition="start" badge={<Badge size="small" />} />
          <Tab value="favorites" label="Favorites" icon={<Favorite />} iconPosition="start" badge={<Badge value={3} />} />
          <Tab value="profile" label="Profile" icon={<Person />} iconPosition="start" />
        </Tabs>
        <Tabs value={text} onChange={(_event, v) => setText(v)} variant="secondary" aria-label="Text only">
          <Tab value="flights" label="Flights" badge={<Badge size="small" />} />
          <Tab value="trips" label="Trips" badge={<Badge value={12} />} />
          <Tab value="explore" label="Explore" />
        </Tabs>
      </div>
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
