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

/** Opens partially expanded: half the sheet, at most half the viewport. */
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
 * Starts fully expanded (`defaultExpanded`). The drag handle toggles between
 * expanded and partially expanded; dragging snaps between the detents.
 */
export const Expanded: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
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

/** `skipPartiallyExpanded`: opens at full height; the handle dismisses. */
export const SkipPartiallyExpanded: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          skipPartiallyExpanded
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
 * viewport-high container), like Compose `BottomSheetScaffold`.
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
          aria-label="Places"
        >
          <PlaceList />
        </BottomSheet>
      </div>
    )
  },
}
