import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Fab } from '../Fab'
import { IconButton } from '../IconButton'
import {
  NavigationRail,
  NavigationRailItem,
  type NavigationRailVariant,
} from './NavigationRail'

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)
const Menu = icon('M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z')
const MenuOpen = icon('M3 18h13v-2H3zm0-5h10v-2H3zm0-7v2h13V6zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5z')
const Edit = icon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z')
const Inbox = icon('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H5V5h14z')
const Outbox = icon('M19 3H4.99C3.89 3 3 3.9 3 5v14c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19zm-3-4h-2V8h-4v3H8l4 4z')
const Favorites = icon('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z')
const Trash = icon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z')

const meta = {
  title: 'Components/NavigationRail',
  component: NavigationRail,
  parameters: { layout: 'fullscreen' },
  args: { value: 'inbox', onChange: () => {} },
} satisfies Meta<typeof NavigationRail>

export default meta
type Story = StoryObj<typeof meta>

function Items() {
  return (
    <>
      <NavigationRailItem value="inbox" icon={Inbox} label="Inbox" />
      <NavigationRailItem value="outbox" icon={Outbox} label="Outbox" badge="3" />
      <NavigationRailItem value="favorites" icon={Favorites} label="Favorites" />
      <NavigationRailItem value="trash" icon={Trash} label="Trash" />
    </>
  )
}

export const Collapsed: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail
          value={value}
          onChange={setValue}
          header={
            <>
              <IconButton variant="standard" icon={Menu} aria-label="Open navigation" />
              <Fab size="small" icon={Edit} aria-label="Compose" color="tertiary-container" />
            </>
          }
        >
          <Items />
        </NavigationRail>
      </div>
    )
  },
}

export const Expanded: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail
          value={value}
          onChange={setValue}
          variant="expanded"
          header={
            <>
              <IconButton variant="standard" icon={MenuOpen} aria-label="Close navigation" />
              <Fab icon={Edit} label="Label" color="tertiary-container" />
            </>
          }
        >
          <Items />
        </NavigationRail>
      </div>
    )
  },
}

/** The menu button toggles between collapsed and expanded. */
export const Toggle: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    const [variant, setVariant] = useState<NavigationRailVariant>('collapsed')
    const expanded = variant === 'expanded'
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail
          value={value}
          onChange={setValue}
          variant={variant}
          header={
            <>
              <IconButton
                variant="standard"
                icon={expanded ? MenuOpen : Menu}
                aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
                onClick={() => setVariant(expanded ? 'collapsed' : 'expanded')}
              />
              {expanded ? (
                <Fab icon={Edit} label="Label" color="tertiary-container" />
              ) : (
                <Fab size="small" icon={Edit} aria-label="Compose" color="tertiary-container" />
              )}
            </>
          }
        >
          <Items />
        </NavigationRail>
      </div>
    )
  },
}
