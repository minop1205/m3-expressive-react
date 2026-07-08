import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import Inbox from '@material-symbols/svg-400/outlined/inbox.svg?react'
import Star from '@material-symbols/svg-400/outlined/star.svg?react'
import { NavigationDrawer, NavigationDrawerItem } from './NavigationDrawer'

const meta = {
  title: 'Components/NavigationDrawer',
  component: NavigationDrawer,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NavigationDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    return (
      <div style={{ height: 480 }}>
        <NavigationDrawer value={value} onChange={setValue}>
          <NavigationDrawerItem value="inbox" icon={<Inbox />} label="Inbox" badge="24" />
          <NavigationDrawerItem value="starred" icon={<Star />} label="Starred" />
        </NavigationDrawer>
      </div>
    )
  },
}

export const Modal: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState('inbox')
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open drawer</Button>
        <NavigationDrawer
          variant="modal"
          open={open}
          onClose={() => setOpen(false)}
          value={value}
          onChange={(v) => {
            setValue(v)
            setOpen(false)
          }}
        >
          <NavigationDrawerItem value="inbox" icon={<Inbox />} label="Inbox" badge="24" />
          <NavigationDrawerItem value="starred" icon={<Star />} label="Starred" />
        </NavigationDrawer>
      </div>
    )
  },
}
