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
      <ListItem
        headline="Selected + disabled"
        supportingText="on-surface @38% container"
        selected
        disabled
        onClick={fn()}
      />
    </List>
  ),
}

const swatch = (w: number, h: number, hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="hsl(${hue} 45% 62%)"/></svg>`,
  )}`

/** Leading media keep their own size: avatar 40dp (circular), image 56dp,
 * video thumbnail 114×64 — only SVG icons default to 24dp. */
export const LeadingMedia: Story = {
  render: () => (
    <List style={{ width: 400 }}>
      <ListItem
        leading={
          <img src={swatch(40, 40, 270)} width={40} height={40} alt="" style={{ borderRadius: '50%' }} />
        }
        headline="Avatar"
        supportingText="40dp, circular"
      />
      <ListItem
        leading={<img src={swatch(56, 56, 200)} width={56} height={56} alt="" />}
        headline="Image"
        supportingText="56 × 56dp"
      />
      <ListItem
        leading={<img src={swatch(114, 64, 20)} width={114} height={64} alt="" style={{ borderRadius: 12 }} />}
        headline="Video thumbnail"
        supportingText="114 × 64dp"
      />
    </List>
  ),
}
