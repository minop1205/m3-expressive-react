import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { SearchBar } from './SearchBar'

const MicIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3m5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
  </svg>
)

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
  args: { trailingIcon: MicIcon },
}
