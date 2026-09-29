import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { ButtonGroup } from './ButtonGroup'

const meta = {
  title: 'Components/ButtonGroup',
  component: ButtonGroup,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  render: () => (
    <ButtonGroup aria-label="Actions">
      <Button variant="tonal">Cut</Button>
      <Button variant="tonal">Copy</Button>
      <Button variant="tonal">Paste</Button>
    </ButtonGroup>
  ),
}

export const Connected: Story = {
  render: () => (
    <ButtonGroup variant="connected" aria-label="Text style">
      <Button variant="outlined">Bold</Button>
      <Button variant="outlined">Italic</Button>
      <Button variant="outlined">Underline</Button>
    </ButtonGroup>
  ),
}

export const WithIconButtons: Story = {
  render: () => (
    <ButtonGroup variant="connected" aria-label="Alignment">
      <IconButton variant="tonal" icon={<span aria-hidden="true">⯇</span>} aria-label="Left" />
      <IconButton variant="tonal" icon={<span aria-hidden="true">≡</span>} aria-label="Center" />
      <IconButton variant="tonal" icon={<span aria-hidden="true">⯈</span>} aria-label="Right" />
    </ButtonGroup>
  ),
}

export const Mixed: Story = {
  render: () => (
    <ButtonGroup aria-label="Media">
      <IconButton variant="filled" icon={<span aria-hidden="true">⏮</span>} aria-label="Previous" />
      <Button variant="filled">Play</Button>
      <IconButton variant="filled" icon={<span aria-hidden="true">⏭</span>} aria-label="Next" />
    </ButtonGroup>
  ),
}
