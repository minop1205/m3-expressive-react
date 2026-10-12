import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Mic from '@material-symbols/svg-400/outlined/mic.svg?react'
import ArrowBack from '@material-symbols/svg-400/outlined/arrow_back.svg?react'
import { IconButton } from '../IconButton'
import { List, ListItem } from '../List'
import { SearchBar } from './SearchBar'

const meta = {
  title: 'Components/SearchBar',
  component: SearchBar,
  parameters: { layout: 'padded' },
  args: { placeholder: 'Search', onChange: fn(), onSearch: fn() },
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <SearchBar {...args} aria-label="Search" />
    </div>
  ),
} satisfies Meta<typeof SearchBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithTrailingIcon: Story = {
  args: { endIcon: <Mic /> },
}

export const Disabled: Story = {
  args: { disabled: true, endIcon: <Mic /> },
}

/** Interactive slots: a navigation IconButton leads, a mic IconButton trails. */
export const WithIconButtons: Story = {
  args: {
    startIcon: (
      <IconButton variant="standard" aria-label="Back" icon={<ArrowBack />} />
    ),
    endIcon: (
      <IconButton variant="standard" aria-label="Voice search" icon={<Mic />} />
    ),
  },
}

const results = (
  <List>
    <ListItem headline="Recent: Material Design" onClick={() => {}} />
    <ListItem headline="Recent: Components" onClick={() => {}} />
    <ListItem headline="Recent: Tokens" onClick={() => {}} />
  </List>
)

/** The docked search view, open: contained results container over a scrim. */
export const SearchViewOpen: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <div style={{ maxWidth: 720, minHeight: 360 }}>
      <SearchBar {...args} aria-label="Search">
        {results}
      </SearchBar>
    </div>
  ),
}

export const SearchView: Story = {
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <SearchBar {...args} aria-label="Search">
        {results}
      </SearchBar>
    </div>
  ),
}

const fullScreenResults = (
  <List>
    <ListItem headline="Recent: Material Design" supportingText="Searched yesterday" onClick={() => {}} />
    <ListItem headline="Recent: Components" supportingText="Searched last week" onClick={() => {}} />
    <ListItem headline="Recent: Tokens" supportingText="Searched last month" onClick={() => {}} />
  </List>
)

/**
 * `layout="fullscreen"`: clicking the bar (or typing / ArrowDown) expands a
 * modal view over the viewport — a back button replaces the search icon and
 * the results sit below the field. Escape or Back collapses it.
 */
export const FullScreen: Story = {
  args: { layout: 'fullscreen', endIcon: <Mic /> },
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <SearchBar {...args} aria-label="Search">
        {fullScreenResults}
      </SearchBar>
    </div>
  ),
}

/** The full-screen view, open (Compose ExpandedFullScreenContainedSearchBar). */
export const FullScreenOpen: Story = {
  args: { layout: 'fullscreen', defaultOpen: true, defaultValue: 'Rec', endIcon: <Mic /> },
  render: FullScreen.render,
}
