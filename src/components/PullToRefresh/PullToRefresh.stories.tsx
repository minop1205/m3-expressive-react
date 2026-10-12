import { useState, type CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { List, ListItem } from '../List'
import { PullToRefresh, type PullToRefreshProps } from './PullToRefresh'

const meta = {
  title: 'Components/PullToRefresh',
  component: PullToRefresh,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PullToRefresh>

export default meta
type Story = StoryObj<typeof meta>

const frameStyle: CSSProperties = {
  width: 360,
  border: '1px solid var(--md-sys-color-outline-variant)',
  borderRadius: 12,
  overflow: 'hidden',
  background: 'var(--md-sys-color-surface)',
  display: 'flex',
  flexDirection: 'column',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 8px 8px 16px',
  borderBottom: '1px solid var(--md-sys-color-outline-variant)',
  color: 'var(--md-sys-color-on-surface)',
  font: 'var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) / var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font)',
}

/**
 * A feed with a visible Refresh button (the keyboard / pointer alternative
 * the gesture needs) and a simulated 2s fetch.
 */
function Feed({
  initialRefreshing = false,
  ...props
}: Omit<PullToRefreshProps, 'refreshing' | 'onRefresh'> & { initialRefreshing?: boolean }) {
  const [refreshing, setRefreshing] = useState(initialRefreshing)
  const [round, setRound] = useState(1)
  const refresh = () => {
    setRefreshing(true)
    window.setTimeout(() => {
      setRound((r) => r + 1)
      setRefreshing(false)
    }, 2000)
  }
  return (
    <div style={frameStyle}>
      <div style={headerStyle}>
        <span>Inbox</span>
        {/* A refresh that never ends (the Refreshing / Circular stories) can be stopped here. */}
        <Button variant="text" onClick={refreshing ? () => setRefreshing(false) : refresh}>
          {refreshing ? 'Stop' : 'Refresh'}
        </Button>
      </div>
      <PullToRefresh
        {...props}
        refreshing={refreshing}
        onRefresh={refresh}
        style={{ height: 420 }}
      >
        <List>
          {Array.from({ length: 12 }, (_, i) => (
            <ListItem
              key={i}
              headline={`Message ${i + 1}`}
              supportingText={`Fetched in round ${round}`}
            />
          ))}
        </List>
      </PullToRefresh>
    </div>
  )
}

/** Pull down from the top of the list (touch, mouse or pen) past 80px of indicator travel. */
export const Default: Story = {
  render: () => <Feed />,
}

/** `refreshing`: the indeterminate contained loading indicator at the threshold. */
export const Refreshing: Story = {
  render: () => <Feed initialRefreshing />,
}

/** `indicator="circular"`: the classic arrow / spinner on a surface disc with Level 2 elevation. */
export const Circular: Story = {
  render: () => <Feed indicator="circular" initialRefreshing />,
}
