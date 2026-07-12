import type { Meta, StoryObj } from '@storybook/react'
import { IconButton } from '../IconButton'
import { Fab } from '../Fab'
import { Toolbar } from './Toolbar'

const meta = {
  title: 'Components/Toolbar',
  component: Toolbar,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Toolbar>

export default meta
type Story = StoryObj<typeof meta>

const i = (label: string, glyph: string) => (
  <IconButton key={label} variant="standard" icon={<span aria-hidden="true">{glyph}</span>} aria-label={label} />
)

export const Docked: Story = {
  render: () => (
    <div style={{ width: 412 }}>
      <Toolbar variant="docked" aria-label="Document actions">
        {i('Bold', 'B')}
        {i('Italic', 'I')}
        {i('Underline', 'U')}
        {i('Link', '🔗')}
      </Toolbar>
    </div>
  ),
}

export const FloatingHorizontal: Story = {
  render: () => (
    <Toolbar variant="floating" aria-label="Edit actions">
      {i('Bold', 'B')}
      {i('Italic', 'I')}
      {i('Underline', 'U')}
    </Toolbar>
  ),
}

export const FloatingVertical: Story = {
  render: () => (
    <Toolbar variant="floating" orientation="vertical" aria-label="Edit actions">
      {i('Zoom in', '+')}
      {i('Zoom out', '−')}
      {i('Reset', '⌂')}
    </Toolbar>
  ),
}

export const Vibrant: Story = {
  render: () => (
    <Toolbar variant="floating" color="vibrant" aria-label="Edit actions">
      {i('Bold', 'B')}
      {i('Italic', 'I')}
      {i('Underline', 'U')}
    </Toolbar>
  ),
}

export const FloatingWithFab: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Toolbar variant="floating" aria-label="Edit actions">
        {i('Bold', 'B')}
        {i('Italic', 'I')}
        {i('Underline', 'U')}
      </Toolbar>
      <Fab icon={<span aria-hidden="true">✎</span>} aria-label="Compose" />
    </div>
  ),
}
