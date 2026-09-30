import type { Meta, StoryObj } from '@storybook/react'
import { IconButton } from '../IconButton'
import { Fab } from '../Fab'
import Menu from '@material-symbols/svg-400/outlined/menu.svg?react'
import Search from '@material-symbols/svg-400/outlined/search.svg?react'
import MoreVert from '@material-symbols/svg-400/outlined/more_vert.svg?react'
import Add from '@material-symbols/svg-400/outlined/add.svg?react'
import { BottomAppBar, TopAppBar } from './AppBar'

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
