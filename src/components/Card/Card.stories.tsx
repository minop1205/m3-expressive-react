import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Button } from '../Button'
import { Card, CardActionArea, CardActions } from './Card'

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: { layout: 'centered' },
  args: {
    variant: 'filled',
    children: 'Card content',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['filled', 'elevated', 'outlined'],
    },
    disabled: { control: 'boolean' },
  },
  render: (args) => (
    <Card {...args} style={{ width: 300, padding: 16 }}>
      {args.children}
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {(['filled', 'elevated', 'outlined'] as const).map((variant) => (
        <Card key={variant} variant={variant} style={{ width: 200, padding: 16 }}>
          <strong style={{ textTransform: 'capitalize' }}>{variant}</strong>
          <p style={{ margin: '8px 0 0' }}>Supporting text for the card body.</p>
        </Card>
      ))}
    </div>
  ),
}

export const Clickable: Story = {
  args: { onClick: fn() },
  render: (args) => (
    <Card {...args} variant="elevated" style={{ width: 300, padding: 16 }}>
      <strong>Clickable card</strong>
      <p style={{ margin: '8px 0 0' }}>
        Passing onClick adds ripple, focus ring, and keyboard activation.
      </p>
    </Card>
  ),
}

/** `href` renders the whole card as a link (`<a>`, Enter only). */
export const Link: Story = {
  render: () => (
    <Card variant="outlined" href="#article-42" style={{ width: 300, padding: 16 }}>
      <strong>Link card</strong>
      <p style={{ margin: '8px 0 0' }}>Opens the article — middle-click and new-tab work.</p>
    </Card>
  ),
}

/**
 * A card with a primary action and separate buttons: `CardActionArea` wraps
 * the content in one button / link, `CardActions` holds the other actions as
 * its siblings (never nest controls inside a clickable card).
 */
export const WithActions: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {(['filled', 'elevated', 'outlined'] as const).map((variant) => (
        <Card key={variant} variant={variant} style={{ width: 240 }}>
          <CardActionArea onClick={fn()} style={{ padding: 16 }}>
            <strong style={{ textTransform: 'capitalize' }}>{variant}</strong>
            <p style={{ margin: '8px 0 0' }}>The content is the primary action.</p>
          </CardActionArea>
          <CardActions>
            <Button variant="text">Share</Button>
            <Button variant="filled">Open</Button>
          </CardActions>
        </Card>
      ))}
    </div>
  ),
}

export const Disabled: Story = {
  args: { onClick: fn(), disabled: true },
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {(['filled', 'elevated', 'outlined'] as const).map((variant) => (
        <Card key={variant} {...args} variant={variant} style={{ width: 200, padding: 16 }}>
          <strong style={{ textTransform: 'capitalize' }}>{variant}</strong>
          <p style={{ margin: '8px 0 0' }}>Disabled: container and content at 38%.</p>
        </Card>
      ))}
    </div>
  ),
}

/** `dragged`: raised elevation (6dp / 8dp) and the 0.16 on-surface state layer. */
export const Dragged: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {(['filled', 'elevated', 'outlined'] as const).map((variant) => (
        <Card key={variant} variant={variant} dragged style={{ width: 200, padding: 16 }}>
          <strong style={{ textTransform: 'capitalize' }}>{variant}</strong>
          <p style={{ margin: '8px 0 0' }}>Being dragged.</p>
        </Card>
      ))}
    </div>
  ),
}
