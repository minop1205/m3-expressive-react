import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Archive from '@material-symbols/svg-400/outlined/archive.svg?react'
import Delete from '@material-symbols/svg-400/outlined/delete.svg?react'
import { List, ListItem } from '../List'
import { IconButton } from '../IconButton'
import { SwipeToDismiss, type SwipeDismissDirection } from './SwipeToDismiss'

const meta = {
  title: 'Components/SwipeToDismiss',
  component: SwipeToDismiss,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SwipeToDismiss>

export default meta
type Story = StoryObj<typeof meta>

const listStyle: CSSProperties = {
  width: 360,
  border: '1px solid var(--md-sys-color-outline-variant)',
  borderRadius: 12,
  overflow: 'hidden',
}

function SwipeBackground({
  icon,
  label,
  align,
  color,
  background,
}: {
  icon: ReactNode
  label: string
  align: 'start' | 'end'
  color: string
  background: string
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'start' ? 'flex-start' : 'flex-end',
        gap: 12,
        padding: '0 24px',
        boxSizing: 'border-box',
        color,
        background,
      }}
    >
      <span style={{ display: 'inline-flex', width: 24, height: 24 }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

const archiveBackground = (
  <SwipeBackground
    icon={<Archive width={24} height={24} fill="currentColor" />}
    label="Archive"
    align="start"
    color="var(--md-sys-color-on-secondary-container)"
    background="var(--md-sys-color-secondary-container)"
  />
)

const deleteBackground = (
  <SwipeBackground
    icon={<Delete width={24} height={24} fill="currentColor" />}
    label="Delete"
    align="end"
    color="var(--md-sys-color-on-error-container)"
    background="var(--md-sys-color-error-container)"
  />
)

/**
 * Swipe start→end to archive, end→start to delete — each direction reveals
 * its own background (`startToEndBackground` / `endToStartBackground`). The
 * row slides out, then `onDismiss` removes it. Directions are logical, so
 * they mirror in RTL.
 */
export const Default: Story = {
  render: () => {
    const [items, setItems] = useState([1, 2, 3, 4])
    return (
      <List style={listStyle}>
        {items.map((n) => (
          <SwipeToDismiss
            key={n}
            onDismiss={() => setItems((prev) => prev.filter((x) => x !== n))}
            startToEndBackground={archiveBackground}
            endToStartBackground={deleteBackground}
          >
            <ListItem headline={`Swipe me #${n}`} supportingText="Drag left or right" />
          </SwipeToDismiss>
        ))}
      </List>
    )
  },
}

/**
 * The non-gesture alternative m3 requires ("Swipeable list items should
 * include alternative ways to access hidden actions"): each row's delete
 * button sets the controlled `dismissed` state, which plays the same exit
 * animation as a swipe; `onDismiss` then removes the row and moves focus to
 * the next row's button so keyboard users are not dropped to `<body>`.
 */
export const WithDeleteButton: Story = {
  render: () => {
    const [items, setItems] = useState([1, 2, 3, 4])
    const [dismissed, setDismissed] = useState<Record<number, SwipeDismissDirection | null>>({})
    const listRef = useRef<HTMLUListElement>(null)
    /** Row index to focus after a removal that happened while focus was inside. */
    const focusIndex = useRef<number | null>(null)

    const remove = (n: number) => {
      if (listRef.current?.contains(document.activeElement)) focusIndex.current = items.indexOf(n)
      setItems((prev) => prev.filter((x) => x !== n))
    }

    useEffect(() => {
      if (focusIndex.current == null) return
      const buttons = listRef.current?.querySelectorAll('button')
      const next = buttons?.[Math.min(focusIndex.current, buttons.length - 1)]
      ;(next ?? listRef.current)?.focus()
      focusIndex.current = null
    }, [items])

    return (
      <List ref={listRef} tabIndex={-1} style={listStyle}>
        {items.map((n) => (
          <SwipeToDismiss
            key={n}
            dismissed={dismissed[n] ?? null}
            onDismissedChange={(value) => setDismissed((prev) => ({ ...prev, [n]: value }))}
            onDismiss={() => remove(n)}
            enableStartToEnd={false}
            endToStartBackground={deleteBackground}
          >
            <ListItem
              headline={`Message #${n}`}
              supportingText="Swipe left or press delete"
              trailing={
                <IconButton
                  icon={<Delete />}
                  aria-label={`Delete message #${n}`}
                  variant="standard"
                  onClick={() => setDismissed((prev) => ({ ...prev, [n]: 'endToStart' }))}
                />
              }
            />
          </SwipeToDismiss>
        ))}
      </List>
    )
  },
}
