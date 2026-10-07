import { useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { IconButton } from '../IconButton'
import { Fab } from '../Fab'
import Menu from '@material-symbols/svg-400/outlined/menu.svg?react'
import SearchIcon from '@material-symbols/svg-400/outlined/search.svg?react'
import MoreVert from '@material-symbols/svg-400/outlined/more_vert.svg?react'
import Add from '@material-symbols/svg-400/outlined/add.svg?react'
import Mic from '@material-symbols/svg-400/outlined/mic.svg?react'
import Notifications from '@material-symbols/svg-400/outlined/notifications.svg?react'
import { SearchBar, type SearchBarProps } from '../SearchBar'
import { List, ListItem } from '../List'
import { BottomAppBar, TopAppBar, type TopAppBarProps } from './AppBar'

const meta = {
  title: 'Components/AppBar',
  component: TopAppBar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopAppBar>

export default meta
type Story = StoryObj<typeof meta>

const nav = <IconButton icon={<Menu />} aria-label="Menu" variant="standard" />
const actions = (
  <>
    <IconButton icon={<SearchIcon />} aria-label="Search" variant="standard" />
    <IconButton icon={<MoreVert />} aria-label="More" variant="standard" />
  </>
)

export const Small: Story = {
  args: { title: 'Title', navigationIcon: nav, actions, variant: 'small' },
}

/** Centered title — centered across the full bar width (not between the slots). */
export const CenterAligned: Story = {
  args: { title: 'Title', navigationIcon: nav, actions, titleAlignment: 'center' },
}

/** Medium flexible (112dp, HeadlineMedium). */
export const Medium: Story = {
  args: { title: 'Medium title', navigationIcon: nav, actions, variant: 'medium' },
}

/** Large flexible (120dp, DisplaySmall). */
export const Large: Story = {
  args: { title: 'Large title', navigationIcon: nav, actions, variant: 'large' },
}

/**
 * Subtitles and alignment on every size: small (LabelMedium subtitle), medium
 * flexible (136dp, LabelLarge) and large flexible (152dp, TitleMedium), start-
 * and center-aligned, plus a two-line flexible headline.
 */
export const Subtitles: Story = {
  // Each bar sits in its own <article> so the gallery has no duplicate
  // `banner` landmarks.
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <article aria-label="Small">
        <TopAppBar title="Title" subtitle="Subtitle" navigationIcon={nav} actions={actions} />
      </article>
      <article aria-label="Small centered">
        <TopAppBar
          title="Title"
          subtitle="Subtitle"
          navigationIcon={nav}
          actions={actions}
          titleAlignment="center"
        />
      </article>
      <article aria-label="Medium">
        <TopAppBar
          variant="medium"
          title="Medium title"
          subtitle="Subtitle"
          navigationIcon={nav}
          actions={actions}
        />
      </article>
      <article aria-label="Medium centered">
        <TopAppBar
          variant="medium"
          title="Medium title"
          subtitle="Subtitle"
          navigationIcon={nav}
          actions={actions}
          titleAlignment="center"
        />
      </article>
      <article aria-label="Large">
        <TopAppBar
          variant="large"
          title="Large title"
          subtitle="Subtitle"
          navigationIcon={nav}
          actions={actions}
        />
      </article>
      <article aria-label="Large two-line">
        <TopAppBar
          variant="large"
          title="Large flexible headline on two lines"
          navigationIcon={nav}
          actions={actions}
          style={{ maxWidth: 412 }}
        />
      </article>
    </div>
  ),
}

export const Bottom: Story = {
  render: () => (
    <BottomAppBar
      floatingActionButton={<Fab size="small" icon={<Add />} aria-label="Add" />}
    >
      <IconButton icon={<Menu />} aria-label="Menu" variant="standard" />
      <IconButton icon={<SearchIcon />} aria-label="Search" variant="standard" />
      <IconButton icon={<MoreVert />} aria-label="More" variant="standard" />
    </BottomAppBar>
  ),
}

/**
 * Scroll container with the bar at its top: `scrollBehavior` observes the
 * container (`scrollTarget`) and makes the bar sticky. Renders at rest
 * (scrollTop 0) — scroll the frame to see the behavior.
 */
function ScrollDemo(props: Pick<TopAppBarProps, 'variant' | 'scrollBehavior' | 'subtitle'>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={scrollRef}
      data-testid="scroll-container"
      style={{ height: 480, overflowY: 'auto', background: 'var(--md-sys-color-surface)' }}
    >
      <TopAppBar
        {...props}
        title="Title"
        navigationIcon={nav}
        actions={actions}
        scrollTarget={scrollRef}
      />
      <div style={{ padding: 16, color: 'var(--md-sys-color-on-surface)' }}>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i} style={{ margin: '0 0 16px' }}>
            Paragraph {i + 1}. Scroll content moves under the app bar.
          </p>
        ))}
      </div>
    </div>
  )
}

/** `scrollBehavior="pinned"`: stays put; turns surface-container once content scrolls under it. */
export const ScrollPinned: Story = {
  render: () => <ScrollDemo scrollBehavior="pinned" />,
}

/** `scrollBehavior="enterAlways"`: hides while scrolling down, reappears on scroll up. */
export const ScrollEnterAlways: Story = {
  render: () => <ScrollDemo scrollBehavior="enterAlways" />,
}

/** `scrollBehavior="exitUntilCollapsed"`: a large flexible bar collapses to its 64dp row. */
export const ScrollExitUntilCollapsed: Story = {
  render: () => <ScrollDemo variant="large" subtitle="Subtitle" scrollBehavior="exitUntilCollapsed" />,
}

/**
 * The state props render any scroll state without a scroll source: `scrolled`
 * (surface-container) on small and medium bars, and a fully collapsed medium
 * bar (`collapsedFraction={1}`).
 */
export const ScrollStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <article aria-label="Scrolled small">
        <TopAppBar title="Scrolled" navigationIcon={nav} actions={actions} scrolled />
      </article>
      <article aria-label="Scrolled medium">
        <TopAppBar
          variant="medium"
          title="Scrolled"
          navigationIcon={nav}
          actions={actions}
          scrolled
        />
      </article>
      <article aria-label="Collapsed medium">
        <TopAppBar
          variant="medium"
          title="Collapsed"
          navigationIcon={nav}
          actions={actions}
          collapsedFraction={1}
        />
      </article>
    </div>
  ),
}

// ---- Search app bar ----

/**
 * A 32dp avatar in a 48dp target (story helper — the library has no Avatar
 * component; any focusable control works in the actions slot).
 */
function Avatar() {
  return (
    <button
      type="button"
      aria-label="Account"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        padding: 0,
        border: 0,
        borderRadius: '50%',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--md-sys-color-primary)',
          color: 'var(--md-sys-color-on-primary)',
          fontFamily: 'var(--md-sys-typescale-title-medium-font)',
          fontSize: 'var(--md-sys-typescale-title-medium-size)',
          fontWeight: 'var(--md-sys-typescale-title-medium-weight)',
        }}
      >
        A
      </span>
    </button>
  )
}

const searchField = (props: Partial<SearchBarProps> = {}) => (
  <SearchBar
    placeholder="Search product"
    aria-label="Product search"
    startIcon={false}
    {...props}
  />
)

const mic = <IconButton icon={<Mic />} aria-label="Voice search" variant="standard" />

/**
 * `variant="search"`: the search field replaces the heading text; nav icon
 * and avatar sit outside it (64dp row: 4 | 48 | 8 | field | 8 | 48 | 4).
 */
export const Search: Story = {
  args: {
    variant: 'search',
    title: 'Products',
    navigationIcon: nav,
    actions: <Avatar />,
    searchBar: searchField(),
  },
}

/** `titleAlignment="center"` centers the field's text and placeholder. */
export const SearchCentered: Story = {
  args: { ...Search.args, titleAlignment: 'center' },
}

/**
 * Icon layouts (m3): a trailing avatar outside; a mic inside the field plus
 * the avatar outside; two trailing elements outside; and the default search
 * glyph inside the field with no navigation icon.
 */
export const SearchLayouts: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <article aria-label="Trailing outside">
        <TopAppBar
          variant="search"
          titleAlignment="center"
          navigationIcon={nav}
          actions={<Avatar />}
          searchBar={searchField()}
        />
      </article>
      <article aria-label="Trailing inside and outside">
        <TopAppBar
          variant="search"
          titleAlignment="center"
          navigationIcon={nav}
          actions={<Avatar />}
          searchBar={searchField({ endIcon: mic })}
        />
      </article>
      <article aria-label="Two trailing outside">
        <TopAppBar
          variant="search"
          navigationIcon={nav}
          actions={
            <>
              <IconButton icon={<Notifications />} aria-label="Notifications" variant="standard" />
              <Avatar />
            </>
          }
          searchBar={searchField()}
        />
      </article>
      <article aria-label="Leading glyph inside">
        <TopAppBar
          variant="search"
          actions={<IconButton icon={<MoreVert />} aria-label="More" variant="standard" />}
          searchBar={searchField({ startIcon: undefined })}
        />
      </article>
    </div>
  ),
}

/** `scrolled`: the bar turns surface-container, the field surface-container-highest. */
export const SearchScrolled: Story = {
  args: { ...Search.args, scrolled: true, searchBar: searchField({ endIcon: mic }) },
}

/** Selecting the field opens SearchBar's docked search view (open initially here). */
export const SearchViewOpen: Story = {
  render: () => (
    <div style={{ minHeight: 400 }}>
      <TopAppBar
        variant="search"
        title="Products"
        navigationIcon={nav}
        actions={<Avatar />}
        searchBar={
          <SearchBar
            placeholder="Search product"
            aria-label="Product search"
            startIcon={false}
            defaultOpen
          >
            <List>
              <ListItem headline="Recent: Headphones" onClick={() => {}} />
              <ListItem headline="Recent: Keyboards" onClick={() => {}} />
              <ListItem headline="Recent: Monitors" onClick={() => {}} />
            </List>
          </SearchBar>
        }
      />
    </div>
  ),
}

function SearchScrollDemo() {
  const scrollRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={scrollRef}
      style={{ height: 480, overflowY: 'auto', background: 'var(--md-sys-color-surface)' }}
    >
      <TopAppBar
        variant="search"
        title="Products"
        navigationIcon={nav}
        actions={<Avatar />}
        searchBar={searchField()}
        scrollBehavior="pinned"
        scrollTarget={scrollRef}
      />
      <div style={{ padding: 16, color: 'var(--md-sys-color-on-surface)' }}>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i} style={{ margin: '0 0 16px' }}>
            Paragraph {i + 1}. Scroll content moves under the app bar.
          </p>
        ))}
      </div>
    </div>
  )
}

/** `scrollBehavior="pinned"` on a search app bar — scroll the frame to see the colors change. */
export const SearchScrollPinned: Story = {
  render: () => <SearchScrollDemo />,
}
