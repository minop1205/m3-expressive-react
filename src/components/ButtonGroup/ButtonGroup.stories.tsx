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

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** Standard between-space per size (18 / 12 / 8 / 8 / 8dp). */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      {SIZES.map((size) => (
        <ButtonGroup key={size} size={size} aria-label={`Actions ${size}`}>
          <IconButton
            variant="tonal"
            size={size}
            icon={<span aria-hidden="true">⏮</span>}
            aria-label="Previous"
          />
          <Button variant="filled" size={size}>
            Play
          </Button>
          <IconButton
            variant="tonal"
            size={size}
            icon={<span aria-hidden="true">⏭</span>}
            aria-label="Next"
          />
        </ButtonGroup>
      ))}
    </div>
  ),
}

/** Connected inner corners per size, the 48dp minimum width at xs / sm, and a
 * selected (fully round) toggle in the middle. */
export const ConnectedSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      {SIZES.map((size) => (
        <ButtonGroup key={size} variant="connected" size={size} aria-label={`Alignment ${size}`}>
          <IconButton
            variant="tonal"
            size={size}
            toggle
            icon={<span aria-hidden="true">⯇</span>}
            aria-label="Left"
          />
          <IconButton
            variant="tonal"
            size={size}
            toggle
            defaultSelected
            icon={<span aria-hidden="true">≡</span>}
            aria-label="Center"
          />
          <IconButton
            variant="tonal"
            size={size}
            toggle
            icon={<span aria-hidden="true">⯈</span>}
            aria-label="Right"
          />
        </ButtonGroup>
      ))}
    </div>
  ),
}

/** Connected toggle buttons: selected = fully round; disabled stays in line. */
export const ConnectedToggle: Story = {
  render: () => (
    <ButtonGroup variant="connected" aria-label="Text style">
      <Button variant="tonal" toggle defaultSelected>
        Bold
      </Button>
      <Button variant="tonal" toggle>
        Italic
      </Button>
      <Button variant="tonal" toggle disabled>
        Underline
      </Button>
    </ButtonGroup>
  ),
}
