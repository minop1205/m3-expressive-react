import type { Meta, StoryObj } from '@storybook/react'
import ContentCopy from '@material-symbols/svg-400/outlined/content_copy.svg?react'
import Share from '@material-symbols/svg-400/outlined/share.svg?react'
import FormatBold from '@material-symbols/svg-400/outlined/format_bold.svg?react'
import FormatItalic from '@material-symbols/svg-400/outlined/format_italic.svg?react'
import { Button } from '../Button'
import { Menu, MenuDivider, MenuGroup, MenuItem } from './Menu'

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

/**
 * Expressive vertical menu: segmented `MenuGroup` containers with a section
 * label, a divider, a selected (`menuitemcheckbox`) item, and a disabled item.
 */
export const Vertical: Story = {
  render: () => (
    <div style={{ paddingBottom: 340 }}>
      <Menu
        defaultOpen
        variant="vertical"
        trigger={<Button variant="outlined">Open menu</Button>}
      >
        <MenuGroup label="Format">
          <MenuItem selected leadingIcon={<FormatBold />}>
            Bold
          </MenuItem>
          <MenuItem selected={false} leadingIcon={<FormatItalic />}>
            Italic
          </MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem leadingIcon={<ContentCopy />}>Copy</MenuItem>
          <MenuItem leadingIcon={<Share />}>Share</MenuItem>
          <MenuDivider />
          <MenuItem disabled>Archive</MenuItem>
        </MenuGroup>
      </Menu>
    </div>
  ),
}

/** Vertical menu with the vibrant (tertiary based) color option. */
export const VerticalVibrant: Story = {
  render: () => (
    <div style={{ paddingBottom: 260 }}>
      <Menu
        defaultOpen
        variant="vertical"
        color="vibrant"
        trigger={<Button variant="outlined">Open menu</Button>}
      >
        <MenuGroup label="Format">
          <MenuItem selected leadingIcon={<FormatBold />}>
            Bold
          </MenuItem>
          <MenuItem selected={false} leadingIcon={<FormatItalic />}>
            Italic
          </MenuItem>
          <MenuItem disabled>Underline</MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem leadingIcon={<ContentCopy />}>Copy</MenuItem>
        </MenuGroup>
      </Menu>
    </div>
  ),
}
