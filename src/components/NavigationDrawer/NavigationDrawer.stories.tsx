import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { NavigationDrawer, NavigationDrawerItem } from './NavigationDrawer'

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)
const Inbox = icon('M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 12h-4a3 3 0 0 1-6 0H5V5h14z')
const Star = icon('M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z')

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
          <NavigationDrawerItem value="inbox" icon={Inbox} label="Inbox" badge="24" />
          <NavigationDrawerItem value="starred" icon={Star} label="Starred" />
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
          <NavigationDrawerItem value="inbox" icon={Inbox} label="Inbox" badge="24" />
          <NavigationDrawerItem value="starred" icon={Star} label="Starred" />
        </NavigationDrawer>
      </div>
    )
  },
}
