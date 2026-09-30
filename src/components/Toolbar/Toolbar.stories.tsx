import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
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

/**
 * Floating `expanded`: `startContent` / `endContent` fold away (FastSpatial)
 * leaving the `children` — here a single high-emphasis action. The second
 * toolbar starts collapsed (`defaultExpanded={false}`).
 */
export const FloatingExpandCollapse: Story = {
  render: function Render() {
    const [expanded, setExpanded] = useState(true)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Button variant="text" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
        <Toolbar
          variant="floating"
          aria-label="Edit actions"
          expanded={expanded}
          onExpandedChange={setExpanded}
          startContent={[i('Bold', 'B'), i('Italic', 'I')]}
          endContent={[i('Underline', 'U'), i('Link', '🔗')]}
        >
          <IconButton variant="filled" icon={<span aria-hidden="true">✎</span>} aria-label="Edit" />
        </Toolbar>
        <Toolbar
          variant="floating"
          orientation="vertical"
          aria-label="Zoom"
          defaultExpanded={false}
          startContent={[i('Zoom in', '+'), i('Zoom out', '−')]}
        >
          {i('Reset', '⌂')}
        </Toolbar>
      </div>
    )
  },
}

const paragraphs = Array.from({ length: 30 }, (_, n) => (
  <p key={n} style={{ margin: '0 0 16px', color: 'var(--md-sys-color-on-surface)' }}>
    Paragraph {n + 1}. Content scrolls behind the toolbar.
  </p>
))

/**
 * `scrollBehavior="collapse"` on a floating toolbar with no `children` plus
 * a separate FAB (m3 "floating toolbar with FAB"): scrolling forward 40px
 * collapses the toolbar away and the FAB grows to 80dp (`size="medium"`);
 * scrolling back expands it. Renders at rest (expanded).
 */
export const FloatingWithFabOnScroll: Story = {
  parameters: { layout: 'fullscreen' },
  render: function Render() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [expanded, setExpanded] = useState(true)
    return (
      <div style={{ position: 'relative', height: 480 }}>
        <div
          ref={scrollRef}
          data-testid="scroll-container"
          tabIndex={0}
          role="region"
          aria-label="Article"
          style={{ height: '100%', overflowY: 'auto', padding: 16, boxSizing: 'border-box' }}
        >
          {paragraphs}
        </div>
        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            bottom: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Toolbar
            variant="floating"
            aria-label="Edit actions"
            scrollBehavior="collapse"
            scrollTarget={scrollRef}
            expanded={expanded}
            onExpandedChange={setExpanded}
            startContent={[i('Bold', 'B'), i('Italic', 'I'), i('Underline', 'U')]}
          />
          <Fab
            color="secondary"
            size={expanded ? 'regular' : 'medium'}
            icon={<span aria-hidden="true">✎</span>}
            aria-label="Compose"
          />
        </div>
      </div>
    )
  },
}

/**
 * `scrollBehavior="exitAlways"` on a docked toolbar: it slides off the bottom
 * edge while scrolling forward and returns on scroll back (sticky at the
 * bottom of its scroller). Renders at rest.
 */
export const DockedExitAlways: Story = {
  parameters: { layout: 'fullscreen' },
  render: function Render() {
    const scrollRef = useRef<HTMLDivElement>(null)
    return (
      <div
        ref={scrollRef}
        data-testid="scroll-container"
        style={{ height: 480, overflowY: 'auto' }}
      >
        <div style={{ padding: 16 }}>{paragraphs}</div>
        <Toolbar
          variant="docked"
          aria-label="Document actions"
          scrollBehavior="exitAlways"
          scrollTarget={scrollRef}
        >
          {i('Bold', 'B')}
          {i('Italic', 'I')}
          {i('Underline', 'U')}
          {i('Link', '🔗')}
        </Toolbar>
      </div>
    )
  },
}
