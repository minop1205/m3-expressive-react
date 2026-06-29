import type { Meta, StoryObj } from '@storybook/react'
import { CircularProgressIndicator } from './CircularProgressIndicator'
import { LinearProgressIndicator } from './LinearProgressIndicator'

const meta = {
  title: 'Components/ProgressIndicator',
  component: LinearProgressIndicator,
  parameters: { layout: 'padded' },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    thickness: {
      control: 'inline-radio',
      options: [4, 8],
    },
    shape: {
      control: 'inline-radio',
      options: ['flat', 'wavy'],
    },
  },
} satisfies Meta<typeof LinearProgressIndicator>

export default meta

type LinearStory = StoryObj<typeof LinearProgressIndicator>
type CircularStory = StoryObj<typeof CircularProgressIndicator>

export const LinearDeterminate: LinearStory = {
  args: { value: 0.5 },
  render: (args) => (
    <div style={{ width: 360 }}>
      <LinearProgressIndicator {...args} aria-label="Loading" />
    </div>
  ),
}

export const LinearIndeterminate: LinearStory = {
  args: {},
  render: (args) => (
    <div style={{ width: 360 }}>
      <LinearProgressIndicator {...args} aria-label="Loading" />
    </div>
  ),
}

export const LinearThick: LinearStory = {
  args: { value: 0.65, thickness: 8 },
  render: (args) => (
    <div style={{ width: 360 }}>
      <LinearProgressIndicator {...args} aria-label="Loading" />
    </div>
  ),
}

export const LinearWavyDeterminate: LinearStory = {
  args: { value: 0.3, shape: 'wavy' },
  render: (args) => (
    <div style={{ width: 360 }}>
      <LinearProgressIndicator {...args} aria-label="Loading" />
    </div>
  ),
}

export const LinearWavyIndeterminate: LinearStory = {
  args: { shape: 'wavy' },
  render: (args) => (
    <div style={{ width: 360 }}>
      <LinearProgressIndicator {...args} aria-label="Loading" />
    </div>
  ),
}

export const CircularDeterminate: CircularStory = {
  args: { value: 0.7 },
  argTypes: {
    size: {
      control: { type: 'range', min: 24, max: 96, step: 4 },
    },
  },
  render: (args) => <CircularProgressIndicator {...args} aria-label="Loading" />,
}

export const CircularWavyDeterminate: CircularStory = {
  args: { value: 0.7, shape: 'wavy' },
  argTypes: {
    size: {
      control: { type: 'range', min: 24, max: 96, step: 4 },
    },
  },
  render: (args) => <CircularProgressIndicator {...args} aria-label="Loading" />,
}

export const CircularIndeterminate: CircularStory = {
  args: {},
  render: (args) => <CircularProgressIndicator {...args} aria-label="Loading" />,
}

export const CircularWavyIndeterminate: CircularStory = {
  args: { shape: 'wavy' },
  render: (args) => <CircularProgressIndicator {...args} aria-label="Loading" />,
}

export const CircularSmall: CircularStory = {
  args: { value: 0.45, size: 24 },
  render: (args) => <CircularProgressIndicator {...args} aria-label="Loading" />,
}
