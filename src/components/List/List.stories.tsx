import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Star from '@material-symbols/svg-400/outlined/star.svg?react'
import ChevronRight from '@material-symbols/svg-400/outlined/chevron_right.svg?react'
import { List, ListItem } from './List'

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
        leading={<Star />}
        headline="Starred"
        supportingText="With leading icon and trailing metadata"
        trailingSupportingText="100+"
        trailing={<ChevronRight />}
      />
      <ListItem leading={<Star />} headline="Another item" trailing={<ChevronRight />} />
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
