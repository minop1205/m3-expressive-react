import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { Menu, MenuItem } from './Menu'

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)
const Copy = icon('M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m0 16H8V7h11z')
const Share = icon('M18 16a3 3 0 0 0-2.24 1L8.9 13.3a3 3 0 0 0 0-2.6l6.86-3.7a3 3 0 1 0-.95-2.2v.4L7.94 8.9a3 3 0 1 0 0 6.2l6.87 3.71v.4A3 3 0 1 0 18 16')

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
      <MenuItem leadingIcon={Copy}>Copy</MenuItem>
      <MenuItem leadingIcon={Share}>Share</MenuItem>
      <MenuItem disabled>Archive</MenuItem>
    </Menu>
  ),
}
