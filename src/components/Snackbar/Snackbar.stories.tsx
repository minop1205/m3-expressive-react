import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Button } from '../Button/Button'
import { Snackbar } from './Snackbar'
import { SnackbarProvider, useSnackbar, type SnackbarCloseReason } from './SnackbarProvider'

const meta = {
  title: 'Components/Snackbar',
  component: Snackbar,
  // The snackbar fills the available width (up to 600dp).
  parameters: { layout: 'padded' },
  args: { message: 'Single-line snackbar' },
} satisfies Meta<typeof Snackbar>

export default meta
type Story = StoryObj<typeof meta>

export const Message: Story = {}

export const WithAction: Story = {
  args: {
    message: 'Message archived',
    action: { label: 'Undo', onClick: fn() },
  },
}

export const WithActionAndDismiss: Story = {
  args: {
    message: 'Sent to trash',
    action: { label: 'Undo', onClick: fn() },
    onDismiss: fn(),
  },
}

export const TwoLine: Story = {
  args: {
    message:
      'A longer snackbar message that wraps onto a second line to demonstrate the two-line layout.',
    action: { label: 'Action', onClick: fn() },
    onDismiss: fn(),
  },
}

/** A long action on its own line, end-aligned below the message. */
export const ActionOnNewLine: Story = {
  args: {
    message: 'Your photos were moved to the shared album.',
    action: { label: 'Open shared album', onClick: fn() },
    actionOnNewLine: true,
    onDismiss: fn(),
  },
}

/* -------------------------------------------------------------------------- */
/* Host: SnackbarProvider + useSnackbar()                                      */
/* -------------------------------------------------------------------------- */

function ShowOnMount() {
  const { show } = useSnackbar()
  useEffect(() => {
    // Indefinite (it has an action), so the VRT capture is deterministic.
    void show({ message: 'Message deleted', actionLabel: 'Undo', withDismissAction: true })
  }, [show])
  return <p style={{ margin: 0 }}>Page content. The snackbar sits bottom-center, in front of it.</p>
}

/**
 * The host placement: bottom-center with 12dp margins, filling the width up
 * to 600dp. Shown immediately on mount.
 */
export const Host: Story = {
  render: () => (
    <SnackbarProvider>
      <ShowOnMount />
    </SnackbarProvider>
  ),
}

function Demo() {
  const { show, close } = useSnackbar()
  const [last, setLast] = useState<SnackbarCloseReason | null>(null)
  const track = (p: Promise<SnackbarCloseReason>) => void p.then(setLast)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Button variant="tonal" onClick={() => track(show('Photo saved'))}>
        Short (4s)
      </Button>
      <Button
        variant="tonal"
        onClick={() => track(show({ message: 'Syncing your library…', duration: 'long' }))}
      >
        Long (10s)
      </Button>
      <Button
        variant="tonal"
        onClick={() =>
          track(show({ message: 'Conversation archived', actionLabel: 'Undo', withDismissAction: true }))
        }
      >
        With action (indefinite)
      </Button>
      <Button
        variant="tonal"
        onClick={() =>
          track(
            show({
              message: 'Your photos were moved to the shared album.',
              actionLabel: 'Open shared album',
              actionOnNewLine: true,
              withDismissAction: true,
            }),
          )
        }
      >
        Long action
      </Button>
      <Button
        variant="tonal"
        onClick={() => {
          track(show('First of three'))
          track(show('Second of three'))
          track(show('Third of three'))
        }}
      >
        Queue three
      </Button>
      <Button variant="text" onClick={close}>
        Close current
      </Button>
      <span aria-live="off" style={{ fontFamily: 'var(--md-sys-typescale-body-medium-font)' }}>
        Last result: {last ?? '—'}
      </span>
    </div>
  )
}

/**
 * `useSnackbar().show()` queues snackbars one at a time and resolves with the
 * close reason: `'action' | 'dismiss' | 'timeout' | 'escapeKeyDown'`. The
 * timer pauses on hover / focus; Escape dismisses while focus is inside.
 */
export const HostPlayground: Story = {
  render: () => (
    <SnackbarProvider>
      <Demo />
    </SnackbarProvider>
  ),
}
