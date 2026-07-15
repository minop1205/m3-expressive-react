import type { Meta, StoryObj } from '@storybook/react'
import ContentCopy from '@material-symbols/svg-400/outlined/content_copy.svg?react'
import Share from '@material-symbols/svg-400/outlined/share.svg?react'
import { Button } from '../Button'
import { Menu, MenuItem } from './Menu'

const meta = {
  title: 'Components/Menu',
  component: Menu,
  parameters: { layout: 'centered' },
  args: { trigger: <Button variant="outlined">Open menu</Button>, children: null },
} satisfies Meta<typeof Menu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Menu trigger={<Button variant="outlined">Open menu</Button>}>
      <MenuItem leadingIcon={<ContentCopy />}>Copy</MenuItem>
      <MenuItem leadingIcon={<Share />}>Share</MenuItem>
      <MenuItem disabled>Archive</MenuItem>
    </Menu>
  ),
}

/** Open state so the menu surface (incl. the disabled item) is covered by VRT. */
export const Open: Story = {
  render: () => (
    <div style={{ paddingBottom: 200 }}>
      <Menu defaultOpen trigger={<Button variant="outlined">Open menu</Button>}>
        <MenuItem leadingIcon={<ContentCopy />}>Copy</MenuItem>
        <MenuItem leadingIcon={<Share />}>Share</MenuItem>
        <MenuItem disabled>Archive</MenuItem>
      </Menu>
    </div>
  ),
}
