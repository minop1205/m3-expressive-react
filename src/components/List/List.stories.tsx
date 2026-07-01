import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { List, ListItem } from './List'

const StarIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
)

const ChevronIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
  </svg>
)

const meta = {
  title: 'Components/List',
  component: ListItem,
  parameters: { layout: 'padded' },
  args: { headline: 'List item' },
} satisfies Meta<typeof ListItem>

export default meta
type Story = StoryObj<typeof meta>

export const Lines: Story = {
  render: () => (
    <List style={{ width: 360, border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: 12 }}>
      <ListItem headline="One-line item" />
      <ListItem headline="Two-line item" supportingText="Supporting text" />
      <ListItem
        headline="Three-line item"
        overline="OVERLINE"
        supportingText="Supporting text that adds a third line to the item"
      />
    </List>
  ),
}

export const WithLeadingAndTrailing: Story = {
  render: () => (
    <List style={{ width: 360 }}>
      <ListItem
        leading={StarIcon}
        headline="Starred"
        supportingText="With leading icon and trailing metadata"
        trailingSupportingText="100+"
        trailing={ChevronIcon}
      />
      <ListItem leading={StarIcon} headline="Another item" trailing={ChevronIcon} />
    </List>
  ),
}

export const Interactive: Story = {
  render: () => (
    <List style={{ width: 360 }}>
      <ListItem headline="Clickable" supportingText="role=button + ripple" onClick={fn()} />
      <ListItem headline="Selected" supportingText="secondary-container fill" selected onClick={fn()} />
      <ListItem headline="Disabled" supportingText="dimmed to 38%" disabled onClick={fn()} />
    </List>
  ),
}
