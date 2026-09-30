import { useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { IconButton } from '../IconButton'
import { Fab } from '../Fab'
import Menu from '@material-symbols/svg-400/outlined/menu.svg?react'
import Search from '@material-symbols/svg-400/outlined/search.svg?react'
import MoreVert from '@material-symbols/svg-400/outlined/more_vert.svg?react'
import Add from '@material-symbols/svg-400/outlined/add.svg?react'
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
    <IconButton icon={<Search />} aria-label="Search" variant="standard" />
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
      <IconButton icon={<Search />} aria-label="Search" variant="standard" />
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
