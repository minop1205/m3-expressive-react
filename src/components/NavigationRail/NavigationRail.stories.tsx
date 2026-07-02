import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Fab } from '../Fab'
import { NavigationRail, NavigationRailItem } from './NavigationRail'

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)
const Home = icon('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z')
const Search = icon('M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14')
const Add = icon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z')

const meta = {
  title: 'Components/NavigationRail',
  component: NavigationRail,
  parameters: { layout: 'fullscreen' },
  args: { value: 'home', onChange: () => {} },
} satisfies Meta<typeof NavigationRail>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('home')
    return (
      <div style={{ height: 480, display: 'flex' }}>
        <NavigationRail
          value={value}
          onChange={setValue}
          header={<Fab size="small" icon={Add} aria-label="Compose" color="tertiary-container" />}
        >
          <NavigationRailItem value="home" icon={Home} label="Home" />
          <NavigationRailItem value="search" icon={Search} label="Search" />
        </NavigationRail>
      </div>
    )
  },
}
