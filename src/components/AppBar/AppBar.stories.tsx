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
      floatingActionButton={<Fab size="small" icon={<Add />} aria-label="Add" />}
    >
      <IconButton icon={<Menu />} aria-label="Menu" variant="standard" />
      <IconButton icon={<Search />} aria-label="Search" variant="standard" />
      <IconButton icon={<MoreVert />} aria-label="More" variant="standard" />
    </BottomAppBar>
  ),
}
