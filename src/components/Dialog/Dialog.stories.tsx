import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { Dialog } from './Dialog'
import AlertIcon from '@material-symbols/svg-400/outlined/warning.svg?react'

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'fullscreen' },
  args: { open: true },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Reset settings?"
          actions={
            <>
              <Button variant="text" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="text" onClick={() => setOpen(false)}>
                Reset
              </Button>
            </>
          }
        >
          This will restore all settings to their default values.
        </Dialog>
      </div>
    )
  },
}

export const FullScreen: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open full-screen</Button>
        <Dialog
          open={open}
          fullScreen
          onClose={() => setOpen(false)}
          title="New event"
          actions={
            <Button variant="text" onClick={() => setOpen(false)}>
              Save
            </Button>
          }
        >
          <p>Full-screen dialog content goes here.</p>
        </Dialog>
      </div>
    )
  },
}

export const WithIcon: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          icon={<AlertIcon />}
          title="Discard draft?"
          actions={
            <>
              <Button variant="text" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="text" onClick={() => setOpen(false)}>
                Discard
              </Button>
            </>
          }
        >
          Your changes will be lost.
        </Dialog>
      </div>
    )
  },
}
