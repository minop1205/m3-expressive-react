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
    const [open, setOpen] = useState(true)
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

const places = [
  'Golden Gate Park',
  'Ferry Building',
  'Coit Tower',
  'Lands End',
  'Mission Dolores',
  'Twin Peaks',
  'Alcatraz Island',
  'Palace of Fine Arts',
]

function PlaceList() {
  return (
    <List>
      {places.map((place) => (
        <ListItem key={place} headline={place} supportingText="San Francisco, CA" />
      ))}
    </List>
  )
}

/**
 * Opt-in detents (`skipPartiallyExpanded={false}`): opens partially expanded —
 * half the sheet, at most half the viewport. The drag handle toggles between
 * partially expanded and expanded; dragging snaps between the detents.
 */
export const PartiallyExpanded: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          skipPartiallyExpanded={false}
          aria-label="Places"
        >
          <PlaceList />
        </BottomSheet>
      </div>
    )
  },
}

/** Opt-in detents, starting fully expanded (`defaultExpanded`). */
export const Expanded: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          skipPartiallyExpanded={false}
          defaultExpanded
          aria-label="Places"
        >
          <PlaceList />
        </BottomSheet>
      </div>
    )
  },
}

/** Controlled detent: `expanded` + `onExpandedChange`. */
export const ControlledDetent: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    const [expanded, setExpanded] = useState(false)
    return (
      <div style={{ padding: 24, display: 'flex', gap: 8 }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <Button variant="outlined" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          skipPartiallyExpanded={false}
          expanded={expanded}
          onExpandedChange={setExpanded}
          aria-label="Places"
        >
          <PlaceList />
        </BottomSheet>
      </div>
    )
  },
}

/**
 * `variant="standard"`: no scrim, no focus trap — the page stays usable.
 * The sheet fills the bottom of its nearest positioned ancestor (here the
 * viewport-high container), like Compose `BottomSheetScaffold`. Shown with
 * the opt-in partial detent, as a persistent sheet that peeks.
 */
export const Standard: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <div style={{ padding: 24 }}>
          <Button onClick={() => setOpen((o) => !o)}>{open ? 'Hide sheet' : 'Show sheet'}</Button>
          <p>The page behind a standard sheet stays interactive.</p>
        </div>
        <BottomSheet
          variant="standard"
          open={open}
          onClose={() => setOpen(false)}
          skipPartiallyExpanded={false}
          aria-label="Places"
        >
          <PlaceList />
        </BottomSheet>
      </div>
    )
  },
}
