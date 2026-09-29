import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { List, ListItem } from '../List'
import { SideSheet } from './SideSheet'

const meta = {
  title: 'Components/SideSheet',
  component: SideSheet,
  parameters: { layout: 'fullscreen' },
  args: { open: true, headline: 'Side sheet' },
} satisfies Meta<typeof SideSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  render: () => (
    <div style={{ height: 400, position: 'relative' }}>
      <SideSheet
        headline="Details"
        actions={
          <>
            <Button variant="filled">Save</Button>
            <Button variant="text">Cancel</Button>
          </>
        }
      >
        <List>
          <ListItem headline="Overview" />
          <ListItem headline="Activity" />
          <ListItem headline="Settings" />
        </List>
      </SideSheet>
    </div>
  ),
}

export const Modal: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open modal side sheet</Button>
        <SideSheet
          variant="modal"
          open={open}
          onClose={() => setOpen(false)}
          headline="Filters"
          showDivider
          actions={
            <>
              <Button variant="filled" onClick={() => setOpen(false)}>
                Apply
              </Button>
              <Button variant="text" onClick={() => setOpen(false)}>
                Reset
              </Button>
            </>
          }
        >
          <List>
            <ListItem headline="Price" />
            <ListItem headline="Rating" />
            <ListItem headline="Distance" />
          </List>
        </SideSheet>
      </div>
    )
  },
}

export const LeftAnchor: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open from left</Button>
        <SideSheet
          variant="modal"
          anchor="left"
          open={open}
          onClose={() => setOpen(false)}
          headline="Navigation"
          showBackButton
          onBack={() => setOpen(false)}
        >
          <List>
            <ListItem headline="Home" />
            <ListItem headline="Explore" />
            <ListItem headline="Saved" />
          </List>
        </SideSheet>
      </div>
    )
  },
}
