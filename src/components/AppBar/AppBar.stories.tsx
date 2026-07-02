import type { Meta, StoryObj } from '@storybook/react'
import { IconButton } from '../IconButton'
import { Fab } from '../Fab'
import { BottomAppBar, TopAppBar } from './AppBar'

const MenuIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z" />
  </svg>
)
const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14" />
  </svg>
)
const MoreIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4" />
  </svg>
)
const AddIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
  </svg>
)

const meta = {
  title: 'Components/AppBar',
  component: TopAppBar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopAppBar>

export default meta
type Story = StoryObj<typeof meta>

const nav = <IconButton icon={MenuIcon} aria-label="Menu" variant="standard" />
const actions = (
  <>
    <IconButton icon={SearchIcon} aria-label="Search" variant="standard" />
    <IconButton icon={MoreIcon} aria-label="More" variant="standard" />
  </>
)

export const Small: Story = {
  args: { title: 'Title', navigationIcon: nav, actions, variant: 'small' },
}

export const CenterAligned: Story = {
  args: { title: 'Title', navigationIcon: nav, actions, variant: 'center' },
}

export const Medium: Story = {
  args: { title: 'Medium title', navigationIcon: nav, actions, variant: 'medium' },
}

export const Large: Story = {
  args: { title: 'Large title', navigationIcon: nav, actions, variant: 'large' },
}

export const Bottom: Story = {
  render: () => (
    <BottomAppBar
      floatingActionButton={<Fab size="small" icon={AddIcon} aria-label="Add" />}
    >
      <IconButton icon={MenuIcon} aria-label="Menu" variant="standard" />
      <IconButton icon={SearchIcon} aria-label="Search" variant="standard" />
      <IconButton icon={MoreIcon} aria-label="More" variant="standard" />
    </BottomAppBar>
  ),
}
