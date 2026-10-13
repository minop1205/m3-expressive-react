import { useState, type CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { List, ListItem } from '../List'
import { DragHandle } from './DragHandle'

const meta = {
  title: 'Components/DragHandle',
  component: DragHandle,
  parameters: { layout: 'centered' },
  args: {
    'aria-label': 'Pane',
    min: 0,
    max: 100,
    defaultValue: 50,
    onChange: fn(),
    onDragStart: fn(),
    onDragEnd: fn(),
  },
  argTypes: {
    disabled: { control: 'boolean' },
    paneSide: { control: 'inline-radio', options: ['start', 'end'] },
  },
} satisfies Meta<typeof DragHandle>

export default meta
type Story = StoryObj<typeof meta>

/** Resting 4×48dp capsule; press or drag it to see the 12×52dp state. */
export const Default: Story = {}

export const Disabled: Story = {
  args: { disabled: true },
}

const paneStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'auto',
  borderRadius: 'var(--md-sys-shape-corner-large)',
  background: 'var(--md-sys-color-surface-container)',
  color: 'var(--md-sys-color-on-surface)',
}

const mail = [
  { id: 'a', from: 'Ali Connors', subject: 'Brunch this weekend?' },
  { id: 'b', from: 'Sandra Adams', subject: 'Summer BBQ' },
  { id: 'c', from: 'Trevor Hansen', subject: 'Oui oui' },
  { id: 'd', from: 'Britta Holt', subject: 'Birthday gift' },
]

/**
 * List-detail layout: the handle sits in the 24dp spacer between the panes
 * and sizes the list pane (`aria-controls`), clamped to 200–480px. Drag it,
 * or focus it and use the arrow keys (Shift for bigger steps, Home / End for
 * the limits).
 */
export const ListDetail: Story = {
  parameters: { layout: 'padded' },
  render: function Render(args) {
    const [width, setWidth] = useState(280)
    const [selected, setSelected] = useState<string | null>('a')
    const message = mail.find((m) => m.id === selected)
    return (
      <div
        style={{
          display: 'flex',
          height: 400,
          maxWidth: 900,
          padding: 16,
          background: 'var(--md-sys-color-surface)',
        }}
      >
        <section id="mail-list" aria-label="Inbox" style={{ ...paneStyle, flex: `0 0 ${width}px` }}>
          <List selectionMode="single" value={selected} onChange={(_event, value) => setSelected(value)}>
            {mail.map((m) => (
              <ListItem key={m.id} value={m.id} headline={m.from} supportingText={m.subject} />
            ))}
          </List>
        </section>
        <DragHandle
          {...args}
          aria-label="Inbox"
          aria-controls="mail-list"
          min={200}
          max={480}
          step={8}
          shiftStep={40}
          value={width}
          getAriaValueText={(v) => `${v} pixels`}
          onChange={(event, value) => {
            setWidth(value)
            args.onChange?.(event, value)
          }}
          style={{ alignSelf: 'center' }}
        />
        <section aria-label="Message" style={{ ...paneStyle, flex: 1, padding: 24 }}>
          <h2 style={{ margin: 0, font: 'var(--md-sys-typescale-headline-small-weight) var(--md-sys-typescale-headline-small-size) / var(--md-sys-typescale-headline-small-line-height) var(--md-sys-typescale-headline-small-font)' }}>
            {message?.subject ?? 'No message selected'}
          </h2>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{message?.from}</p>
        </section>
      </div>
    )
  },
}
