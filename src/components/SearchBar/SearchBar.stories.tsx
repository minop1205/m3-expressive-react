import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Mic from '@material-symbols/svg-400/outlined/mic.svg?react'
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
  args: { trailingIcon: <Mic /> },
}

export const Disabled: Story = {
  args: { disabled: true, trailingIcon: <Mic /> },
}

export const SearchView: Story = {
  render: (args) => (
    <div style={{ maxWidth: 720 }}>
      <SearchBar {...args} aria-label="Search">
        <List>
          <ListItem headline="Recent: Material Design" onClick={() => {}} />
          <ListItem headline="Recent: Components" onClick={() => {}} />
          <ListItem headline="Recent: Tokens" onClick={() => {}} />
        </List>
      </SearchBar>
    </div>
  ),
}
