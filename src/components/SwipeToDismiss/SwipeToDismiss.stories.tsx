import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { List, ListItem } from '../List'
import { SwipeToDismiss } from './SwipeToDismiss'

const meta = {
  title: 'Components/SwipeToDismiss',
  component: SwipeToDismiss,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SwipeToDismiss>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [items, setItems] = useState([1, 2, 3, 4])
    return (
      <List style={{ width: 360, border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 12, overflow: 'hidden' }}>
        {items.map((n) => (
          <SwipeToDismiss
            key={n}
            onDismiss={() => setItems((prev) => prev.filter((x) => x !== n))}
            background={
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  color: 'var(--md-sys-color-on-error-container)',
                  background: 'var(--md-sys-color-error-container)',
                }}
              >
                <span>Delete</span>
                <span>Delete</span>
              </div>
            }
          >
            <ListItem headline={`Swipe me #${n}`} supportingText="Drag left or right" />
          </SwipeToDismiss>
        ))}
      </List>
    )
  },
}
