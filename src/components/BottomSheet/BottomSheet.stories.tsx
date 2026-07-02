import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { List, ListItem } from '../List'
import { BottomSheet } from './BottomSheet'

const meta = {
  title: 'Components/BottomSheet',
  component: BottomSheet,
  parameters: { layout: 'fullscreen' },
  args: { open: true },
} satisfies Meta<typeof BottomSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <BottomSheet open={open} onClose={() => setOpen(false)}>
          <List>
            <ListItem headline="Share" onClick={() => setOpen(false)} />
            <ListItem headline="Add to favorites" onClick={() => setOpen(false)} />
            <ListItem headline="Edit" onClick={() => setOpen(false)} />
          </List>
        </BottomSheet>
      </div>
    )
  },
}
