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

/** Both color schemes with a selected toggle item (Toolbar - Color token sets). */
export const ColorSchemes: Story = {
  render: () => {
    const items = (
      <>
        <IconButton variant="standard" toggle defaultSelected icon={<span aria-hidden="true">B</span>} aria-label="Bold" />
        {i('Italic', 'I')}
        {i('Underline', 'U')}
      </>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 412 }}>
        <Toolbar variant="docked" aria-label="Standard docked">{items}</Toolbar>
        <Toolbar variant="docked" color="vibrant" aria-label="Vibrant docked">{items}</Toolbar>
        <Toolbar variant="floating" aria-label="Standard floating">{items}</Toolbar>
        <Toolbar variant="floating" color="vibrant" aria-label="Vibrant floating">{items}</Toolbar>
      </div>
    )
  },
}

export const FloatingWithFab: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Toolbar variant="floating" aria-label="Edit actions">
        {i('Bold', 'B')}
        {i('Italic', 'I')}
        {i('Underline', 'U')}
      </Toolbar>
      {/* m3 Floating - FAB: a standard toolbar pairs with a secondary FAB. */}
      <Fab color="secondary" icon={<span aria-hidden="true">✎</span>} aria-label="Compose" />
    </div>
  ),
}
