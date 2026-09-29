import type { Meta, StoryObj } from '@storybook/react'
import { Carousel, CarouselItem } from './Carousel'

const meta = {
  title: 'Components/Carousel',
  component: Carousel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

const COLORS = ['#B3261E', '#6750A4', '#006A6A', '#7D5260', '#386A20', '#8C4A00', '#00639B']

function items(count = 7) {
  return COLORS.slice(0, count).map((c, i) => (
    <CarouselItem key={i} style={{ background: c }}>
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          padding: 16,
          color: '#fff',
          fontWeight: 600,
        }}
      >
        Item {i + 1}
      </div>
    </CarouselItem>
  ))
}

export const MultiBrowse: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <Carousel aria-label="Photos">{items()}</Carousel>
    </div>
  ),
}

export const Uncontained: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <Carousel aria-label="Photos" variant="uncontained" itemWidth={200}>
        {items()}
      </Carousel>
    </div>
  ),
}

export const Hero: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <Carousel aria-label="Photos" variant="hero" itemWidth={420} itemHeight={240}>
        {items()}
      </Carousel>
    </div>
  ),
}
