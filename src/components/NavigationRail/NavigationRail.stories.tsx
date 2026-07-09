import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Menu from '@material-symbols/svg-400/outlined/menu.svg?react'
import MenuOpen from '@material-symbols/svg-400/outlined/menu_open.svg?react'
import Edit from '@material-symbols/svg-400/outlined/edit.svg?react'
import Inbox from '@material-symbols/svg-400/outlined/inbox.svg?react'
import Outbox from '@material-symbols/svg-400/outlined/outbox.svg?react'
import Favorite from '@material-symbols/svg-400/outlined/favorite.svg?react'
import Delete from '@material-symbols/svg-400/outlined/delete.svg?react'
import { Fab } from '../Fab'
import { IconButton } from '../IconButton'
import {
  NavigationRail,
  NavigationRailItem,
  type NavigationRailVariant,
} from './NavigationRail'

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
      <NavigationRailItem value="inbox" icon={<Inbox />} label="Inbox" />
      <NavigationRailItem value="outbox" icon={<Outbox />} label="Outbox" badge="3" />
      <NavigationRailItem value="favorites" icon={<Favorite />} label="Favorites" badge />
      <NavigationRailItem value="trash" icon={<Delete />} label="Trash" />
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
              <IconButton variant="standard" icon={<Menu />} aria-label="Open navigation" />
              <Fab size="small" icon={<Edit />} aria-label="Compose" color="tertiary-container" />
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
              <IconButton variant="standard" icon={<MenuOpen />} aria-label="Close navigation" />
              <Fab icon={<Edit />} label="Label" color="tertiary-container" />
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
                icon={expanded ? <MenuOpen /> : <Menu />}
                aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
                onClick={() => setVariant(expanded ? 'collapsed' : 'expanded')}
              />
              {expanded ? (
                <Fab icon={<Edit />} label="Label" color="tertiary-container" />
              ) : (
                <Fab size="small" icon={<Edit />} aria-label="Compose" color="tertiary-container" />
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
