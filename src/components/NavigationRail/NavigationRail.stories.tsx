import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Menu from '@material-symbols/svg-400/outlined/menu.svg?react'
import MenuOpen from '@material-symbols/svg-400/outlined/menu_open.svg?react'
import Edit from '@material-symbols/svg-400/outlined/edit.svg?react'
import Inbox from '@material-symbols/svg-400/outlined/inbox.svg?react'
import InboxFill from '@material-symbols/svg-400/outlined/inbox-fill.svg?react'
import Outbox from '@material-symbols/svg-400/outlined/outbox.svg?react'
import OutboxFill from '@material-symbols/svg-400/outlined/outbox-fill.svg?react'
import Favorite from '@material-symbols/svg-400/outlined/favorite.svg?react'
import FavoriteFill from '@material-symbols/svg-400/outlined/favorite-fill.svg?react'
import Delete from '@material-symbols/svg-400/outlined/delete.svg?react'
import DeleteFill from '@material-symbols/svg-400/outlined/delete-fill.svg?react'
import { Fab } from '../Fab'
import { IconButton } from '../IconButton'
import {
  NavigationRail,
  NavigationRailItem,
  type NavigationRailVariant,
} from './NavigationRail'

const meta = {
  title: 'Components/NavigationRail',
  component: NavigationRail,
  parameters: { layout: 'fullscreen' },
  args: { value: 'inbox', onChange: () => {} },
} satisfies Meta<typeof NavigationRail>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Menu icon that rotates 180° clockwise while switching between `menu` and
 * `menu_open` halfway through the turn (the swap point measured from the
 * official m3.material.io rail demo). The rotation is driven by the inherited
 * `--_t`, so it runs on the rail's own DefaultSpatial spring — exactly the
 * same duration/curve as the items' and FAB's morphs, and interruptible with
 * them. `menu_open` is pre-rotated −180° so it lands upright at t = 1;
 * collapsing plays the same turn in reverse.
 */
function MenuMorphIcon() {
  // Glyphs cross-switch in the t ≈ 0.45–0.55 window (opacity clamps to [0,1]).
  return (
    <span
      style={{
        display: 'grid',
        width: '100%',
        height: '100%',
        transform: 'rotate(calc(var(--_t, 0) * 180deg))',
      }}
    >
      <Menu style={{ gridArea: '1 / 1', opacity: 'calc((0.55 - var(--_t, 0)) * 20)' }} />
      <MenuOpen
        style={{
          gridArea: '1 / 1',
          transform: 'rotate(-180deg)',
          opacity: 'calc((var(--_t, 0) - 0.45) * 20)',
        }}
      />
    </span>
  )
}

/**
 * Header contents shared by the stories (per the M3 Design Kit rail): a 56dp
 * (md) menu button and the 56dp FAB. Both sit at the constant 20dp header
 * inset — which is also the collapsed-centered position in the 96dp rail —
 * so nothing moves between states; the FAB morphs itself via `expanded`.
 */
function Header({ expanded, onMenuClick }: { expanded: boolean; onMenuClick?: () => void }) {
  return (
    <>
      <IconButton
        variant="standard"
        size="md"
        icon={<MenuMorphIcon />}
        aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        onClick={onMenuClick}
      />
      {/* followContainer: the FAB follows the rail's --_t spring, in
          exact sync with the rail width and the items' morphs. */}
      <Fab icon={<Edit />} label="Compose" followContainer color="primary" disableElevation />
    </>
  )
}

/** Filled icon for the selected destination, outlined for the rest (m3). */
function Items() {
  return (
    <>
      <NavigationRailItem value="inbox" icon={<Inbox />} selectedIcon={<InboxFill />} label="Inbox" />
      <NavigationRailItem value="outbox" icon={<Outbox />} selectedIcon={<OutboxFill />} label="Outbox" badge="3" />
      <NavigationRailItem value="favorites" icon={<Favorite />} selectedIcon={<FavoriteFill />} label="Favorites" badge />
      <NavigationRailItem value="trash" icon={<Delete />} selectedIcon={<DeleteFill />} label="Trash" />
    </>
  )
}

export const Collapsed: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail aria-label="Mail" value={value} onChange={(_event, v) => setValue(v)} header={<Header expanded={false} />}>
          <Items />
        </NavigationRail>
      </div>
    )
  },
}

export const Expanded: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail aria-label="Mail" value={value} onChange={(_event, v) => setValue(v)} variant="expanded" header={<Header expanded />}>
          <Items />
        </NavigationRail>
      </div>
    )
  },
}

/** The menu button toggles between collapsed and expanded. */
export const Toggle: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    const [variant, setVariant] = useState<NavigationRailVariant>('collapsed')
    const expanded = variant === 'expanded'
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail
          aria-label="Mail"
          value={value}
          onChange={(_event, v) => setValue(v)}
          variant={variant}
          header={
            <Header
              expanded={expanded}
              onMenuClick={() => setVariant(expanded ? 'collapsed' : 'expanded')}
            />
          }
        >
          <Items />
        </NavigationRail>
      </div>
    )
  },
}

/**
 * The expanded rail fits its widest destination (min 220dp, max 360dp);
 * badges sit beside the label while expanded.
 */
export const ExpandedLongLabels: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail aria-label="Mail" value={value} onChange={(_event, v) => setValue(v)} variant="expanded" header={<Header expanded />}>
          <NavigationRailItem value="inbox" icon={<Inbox />} selectedIcon={<InboxFill />} label="Inbox" />
          <NavigationRailItem value="outbox" icon={<Outbox />} selectedIcon={<OutboxFill />} label="Scheduled outbox" badge="12" />
          <NavigationRailItem value="favorites" icon={<Favorite />} selectedIcon={<FavoriteFill />} label="Favorites" badge />
          <NavigationRailItem value="trash" icon={<Delete />} selectedIcon={<DeleteFill />} label="Recently deleted items" />
        </NavigationRail>
      </div>
    )
  },
}

/** In right-to-left layouts the rail sits on the right and its items mirror. */
export const RightToLeft: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    const [variant, setVariant] = useState<NavigationRailVariant>('expanded')
    const expanded = variant === 'expanded'
    return (
      <div dir="rtl" style={{ height: 520, display: 'flex' }}>
        <NavigationRail
          aria-label="Mail"
          value={value}
          onChange={(_event, v) => setValue(v)}
          variant={variant}
          header={
            <Header
              expanded={expanded}
              onMenuClick={() => setVariant(expanded ? 'collapsed' : 'expanded')}
            />
          }
        >
          <Items />
        </NavigationRail>
      </div>
    )
  },
}

function PageContent() {
  return (
    <main style={{ flex: 1, padding: 24, color: 'var(--md-sys-color-on-surface)' }}>
      <h1 style={{ margin: 0, font: 'var(--md-sys-typescale-headline-small-weight) var(--md-sys-typescale-headline-small-size) var(--md-sys-typescale-headline-small-font)' }}>
        Inbox
      </h1>
      <p style={{ maxWidth: 480 }}>
        The modal rail overlaps this content while expanded instead of pushing it
        aside. Press Escape or click the scrim to collapse it.
      </p>
    </main>
  )
}

/**
 * Modal expanded layout: while expanded the rail overlaps the page with a
 * scrim, traps focus and closes on Escape / scrim click; collapsed it is a
 * regular 96dp rail. Selecting a destination also collapses it (app logic).
 */
export const Modal: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    const [variant, setVariant] = useState<NavigationRailVariant>('expanded')
    const expanded = variant === 'expanded'
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail
          aria-label="Mail"
          modal
          onClose={() => setVariant('collapsed')}
          value={value}
          onChange={(_event, v) => {
            setValue(v)
            setVariant('collapsed')
          }}
          variant={variant}
          header={
            <Header
              expanded={expanded}
              onMenuClick={() => setVariant(expanded ? 'collapsed' : 'expanded')}
            />
          }
        >
          <Items />
        </NavigationRail>
        <PageContent />
      </div>
    )
  },
}

/**
 * Modal + hide on collapse: the rail is not shown while collapsed and slides
 * in expanded from the leading edge (opened here from a menu button in the
 * page).
 */
export const ModalHideOnCollapse: Story = {
  render: () => {
    const [value, setValue] = useState('inbox')
    const [variant, setVariant] = useState<NavigationRailVariant>('expanded')
    const expanded = variant === 'expanded'
    return (
      <div style={{ height: 520, display: 'flex' }}>
        <NavigationRail
          aria-label="Mail"
          modal
          hideOnCollapse
          onClose={() => setVariant('collapsed')}
          value={value}
          onChange={(_event, v) => {
            setValue(v)
            setVariant('collapsed')
          }}
          variant={variant}
          header={<Header expanded={expanded} onMenuClick={() => setVariant('collapsed')} />}
        >
          <Items />
        </NavigationRail>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ padding: '8px 4px' }}>
            <IconButton
              variant="standard"
              icon={<Menu />}
              aria-label="Open navigation"
              onClick={() => setVariant('expanded')}
            />
          </div>
          <PageContent />
        </div>
      </div>
    )
  },
}
