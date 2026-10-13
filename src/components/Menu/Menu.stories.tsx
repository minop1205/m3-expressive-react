import { useEffect, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import ContentCopy from '@material-symbols/svg-400/outlined/content_copy.svg?react'
import Share from '@material-symbols/svg-400/outlined/share.svg?react'
import FormatBold from '@material-symbols/svg-400/outlined/format_bold.svg?react'
import FormatItalic from '@material-symbols/svg-400/outlined/format_italic.svg?react'
import MoreVert from '@material-symbols/svg-400/outlined/more_vert.svg?react'
import Check from '@material-symbols/svg-400/outlined/check.svg?react'
import ChevronRight from '@material-symbols/svg-400/outlined/chevron_right.svg?react'
import Download from '@material-symbols/svg-400/outlined/download.svg?react'
import ContentPaste from '@material-symbols/svg-400/outlined/content_paste.svg?react'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
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
      <MenuItem startIcon={<ContentCopy />}>Copy</MenuItem>
      <MenuItem startIcon={<Share />}>Share</MenuItem>
      <MenuItem disabled>Archive</MenuItem>
    </Menu>
  ),
}

/** Open state so the menu surface (incl. the disabled item) is covered by VRT. */
export const Open: Story = {
  render: () => (
    <div style={{ paddingBottom: 200 }}>
      <Menu defaultOpen trigger={<Button variant="outlined">Open menu</Button>}>
        <MenuItem startIcon={<ContentCopy />}>Copy</MenuItem>
        <MenuItem startIcon={<Share />}>Share</MenuItem>
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
          <MenuItem selected startIcon={<FormatBold />}>
            Bold
          </MenuItem>
          <MenuItem selected={false} startIcon={<FormatItalic />}>
            Italic
          </MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem startIcon={<ContentCopy />}>Copy</MenuItem>
          <MenuItem startIcon={<Share />}>Share</MenuItem>
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
          <MenuItem selected startIcon={<FormatBold />}>
            Bold
          </MenuItem>
          <MenuItem selected={false} startIcon={<FormatItalic />}>
            Italic
          </MenuItem>
          <MenuItem disabled>Underline</MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem startIcon={<ContentCopy />}>Copy</MenuItem>
        </MenuGroup>
      </Menu>
    </div>
  ),
}

/**
 * Overflow "More" icon button with a tooltip that opens a menu: the Tooltip
 * wraps the trigger, and the menu-button ARIA, handlers and focus return land
 * on the real button. Shown open so the menu surface is covered by VRT.
 */
export const TooltipTrigger: Story = {
  render: () => (
    <div style={{ paddingBottom: 160 }}>
      <Menu
        defaultOpen
        aria-label="More options"
        trigger={
          <Tooltip text="More options">
            <IconButton icon={<MoreVert />} aria-label="More options" variant="standard" />
          </Tooltip>
        }
      >
        <MenuItem startIcon={<ContentCopy />}>Copy</MenuItem>
        <MenuItem startIcon={<Share />}>Share</MenuItem>
      </Menu>
    </div>
  ),
}

/**
 * Single-select section (B33): `MenuGroup selectionMode="single"` makes the
 * items `menuitemradio`; the selected one shows its `selectedIcon` check and
 * the baseline secondary-container selected color. Supporting text below a
 * label.
 */
export const SingleSelect: Story = {
  render: () => (
    <div style={{ paddingBottom: 280 }}>
      <Menu defaultOpen trigger={<Button variant="outlined">Sort</Button>}>
        <MenuGroup label="Sort by" selectionMode="single" defaultValue="name">
          <MenuItem value="name" selectedIcon={<Check />}>
            Name
          </MenuItem>
          <MenuItem value="modified" selectedIcon={<Check />} supportingText="Newest first">
            Last modified
          </MenuItem>
          <MenuItem value="size" selectedIcon={<Check />}>
            Size
          </MenuItem>
        </MenuGroup>
        <MenuDivider />
        <MenuItem startIcon={<ContentCopy />} supportingText="Ctrl+C">
          Copy
        </MenuItem>
      </Menu>
    </div>
  ),
}

/**
 * Multi-select vertical menu (B33): `selectionMode="multiple"` items are
 * `menuitemcheckbox` and the menu stays open while toggling; `selectedIcon`
 * swaps the start icon, and items carry supporting text.
 */
export const VerticalMultiSelect: Story = {
  render: () => (
    <div style={{ paddingBottom: 300 }}>
      <Menu defaultOpen variant="vertical" trigger={<Button variant="outlined">Format</Button>}>
        <MenuGroup label="Style" selectionMode="multiple" defaultValue={['bold']}>
          <MenuItem
            value="bold"
            startIcon={<FormatBold />}
            selectedIcon={<Check />}
            supportingText="Ctrl+B"
          >
            Bold
          </MenuItem>
          <MenuItem
            value="italic"
            startIcon={<FormatItalic />}
            selectedIcon={<Check />}
            supportingText="Ctrl+I"
          >
            Italic
          </MenuItem>
        </MenuGroup>
        <MenuGroup selectionMode="single" defaultValue="left">
          <MenuItem value="left" selectedIcon={<Check />}>
            Align left
          </MenuItem>
          <MenuItem value="center" selectedIcon={<Check />}>
            Align center
          </MenuItem>
        </MenuGroup>
      </Menu>
    </div>
  ),
}

/** Opens the submenu of the item with `id` once mounted (for VRT). */
function OpenSubmenu({ id, children }: { id: string; children: ReactNode }) {
  useEffect(() => {
    const timer = setTimeout(() => document.getElementById(id)?.click(), 50)
    return () => clearTimeout(timer)
  }, [id])
  return <>{children}</>
}

const exportSubmenu = (
  <>
    <MenuItem>PDF</MenuItem>
    <MenuItem>PNG</MenuItem>
    <MenuItem>SVG</MenuItem>
  </>
)

/**
 * Submenu (B34): a `MenuItem` with `submenu` opens a nested menu beside it
 * (flipping to the other side when there is no room). Shown with the submenu
 * open; its parent item stays highlighted.
 */
export const Submenu: Story = {
  render: () => (
    <div style={{ paddingBottom: 220, paddingRight: 200 }}>
      <OpenSubmenu id="story-export">
        <Menu defaultOpen trigger={<Button variant="outlined">File</Button>}>
          <MenuItem startIcon={<ContentPaste />}>Paste</MenuItem>
          <MenuItem
            id="story-export"
            startIcon={<Download />}
            endIcon={<ChevronRight />}
            submenu={exportSubmenu}
          >
            Export as
          </MenuItem>
          <MenuItem startIcon={<Share />}>Share</MenuItem>
        </Menu>
      </OpenSubmenu>
    </div>
  ),
}

/** Submenu of the vertical menu: the open submenu's parent item takes the 12dp shape. */
export const VerticalSubmenu: Story = {
  render: () => (
    <div style={{ paddingBottom: 220, paddingRight: 200 }}>
      <OpenSubmenu id="story-vertical-export">
        <Menu defaultOpen variant="vertical" trigger={<Button variant="outlined">File</Button>}>
          <MenuGroup>
            <MenuItem startIcon={<ContentPaste />}>Paste</MenuItem>
            <MenuItem
              id="story-vertical-export"
              startIcon={<Download />}
              endIcon={<ChevronRight />}
              submenu={<MenuGroup>{exportSubmenu}</MenuGroup>}
            >
              Export as
            </MenuItem>
            <MenuItem startIcon={<Share />}>Share</MenuItem>
          </MenuGroup>
        </Menu>
      </OpenSubmenu>
    </div>
  ),
}

/**
 * Context menu (B34): no trigger — `anchorPosition` opens the menu at a point,
 * e.g. `{ top: event.clientY, left: event.clientX }` from `onContextMenu`.
 */
export const ContextMenu: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ height: 260 }}>
      <Menu defaultOpen aria-label="Image actions" anchorPosition={{ top: 48, left: 64 }}>
        <MenuItem startIcon={<ContentCopy />}>Copy image</MenuItem>
        <MenuItem startIcon={<Download />}>Save image as…</MenuItem>
        <MenuItem startIcon={<Share />}>Share</MenuItem>
      </Menu>
    </div>
  ),
}
