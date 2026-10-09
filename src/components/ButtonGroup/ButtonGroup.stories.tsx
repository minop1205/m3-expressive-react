import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
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

/**
 * IconButtons wrapped in a Tooltip (one wrapper span deep) keep the connected
 * shape, the 48dp min-width and the standard press-widen.
 */
export const WithTooltips: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
      <ButtonGroup variant="connected" aria-label="Alignment">
        <Tooltip text="Align left">
          <IconButton variant="tonal" icon={<span aria-hidden="true">⯇</span>} aria-label="Left" />
        </Tooltip>
        <Tooltip text="Center">
          <IconButton variant="tonal" icon={<span aria-hidden="true">≡</span>} aria-label="Center" />
        </Tooltip>
        <Tooltip text="Align right">
          <IconButton variant="tonal" icon={<span aria-hidden="true">⯈</span>} aria-label="Right" />
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup aria-label="Media">
        <Tooltip text="Previous">
          <IconButton variant="filled" icon={<span aria-hidden="true">⏮</span>} aria-label="Previous" />
        </Tooltip>
        <Tooltip text="Play">
          <IconButton variant="filled" icon={<span aria-hidden="true">⏵</span>} aria-label="Play" />
        </Tooltip>
        <Tooltip text="Next">
          <IconButton variant="filled" icon={<span aria-hidden="true">⏭</span>} aria-label="Next" />
        </Tooltip>
      </ButtonGroup>
    </div>
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

/**
 * Single select (`selectionMode="single"`): a radiogroup with one Tab stop;
 * arrow keys move focus and selection. With `selectionRequired` the selected
 * item cannot be cleared. The Expressive replacement for the baseline
 * segmented button.
 */
export const SingleSelect: Story = {
  render: () => {
    const [view, setView] = useState<string | null>('week')
    return (
      <ButtonGroup
        variant="connected"
        selectionMode="single"
        selectionRequired
        value={view}
        onChange={(_, next) => setView(next)}
        aria-label="Calendar view"
      >
        <Button variant="tonal" value="day">
          Day
        </Button>
        <Button variant="tonal" value="week">
          Week
        </Button>
        <Button variant="tonal" value="month">
          Month
        </Button>
      </ButtonGroup>
    )
  },
}

/** Multi select (`selectionMode="multiple"`): toggle buttons with `aria-pressed`. */
export const MultiSelect: Story = {
  render: () => (
    <ButtonGroup
      variant="connected"
      selectionMode="multiple"
      defaultValue={['bold', 'underline']}
      aria-label="Text style"
    >
      <IconButton variant="tonal" value="bold" icon={<span aria-hidden="true">B</span>} aria-label="Bold" />
      <IconButton variant="tonal" value="italic" icon={<span aria-hidden="true">I</span>} aria-label="Italic" />
      <IconButton variant="tonal" value="underline" icon={<span aria-hidden="true">U</span>} aria-label="Underline" />
    </ButtonGroup>
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
