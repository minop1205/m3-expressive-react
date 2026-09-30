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

const label = (i: number) => (
  <div
    style={{
      height: '100%',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 16,
      boxSizing: 'border-box',
      color: '#fff',
      fontWeight: 600,
    }}
  >
    Item {i + 1}
  </div>
)

function items(count = 7) {
  return COLORS.slice(0, count).map((c, i) => (
    <CarouselItem key={i} style={{ background: c }}>
      {label(i)}
    </CarouselItem>
  ))
}

/** Inline SVG "photos" — deterministic image content for VRT (no network). */
function photo(i: number) {
  const hue = (i * 47) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue},60%,70%)"/><stop offset="1" stop-color="hsl(${hue},55%,35%)"/>
    </linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <circle cx="300" cy="80" r="36" fill="hsl(${(hue + 40) % 360},90%,85%)"/>
    <path d="M0 300 L120 150 L200 230 L270 170 L400 300 Z" fill="hsl(${hue},40%,22%)"/>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
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
      <Carousel aria-label="Photos" variant="hero" itemHeight={240}>
        {items()}
      </Carousel>
    </div>
  ),
}

/** Image items: the image keeps its size and is masked, never scaled. */
export const Images: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <Carousel aria-label="Landscapes" itemWidth={240} itemHeight={220}>
        {Array.from({ length: 8 }, (_, i) => (
          <CarouselItem key={i}>
            <img src={photo(i)} alt={`Landscape ${i + 1}`} />
          </CarouselItem>
        ))}
      </Carousel>
    </div>
  ),
}

/**
 * Interactive items: `onClick` renders a `<button>`, `href` an `<a>`. Tab or
 * Left / Right move between items; the focused item scrolls into the large
 * position. Each item is described by its position ("3 of 7").
 */
export const Interactive: Story = {
  render: () => (
    <div style={{ maxWidth: 640, display: 'grid', gap: 16 }}>
      <Carousel aria-label="Albums">
        {COLORS.map((c, i) => (
          <CarouselItem
            key={i}
            style={{ background: c }}
            aria-label={`Album ${i + 1}`}
            onClick={() => {}}
            disabled={i === 3}
          >
            {label(i)}
          </CarouselItem>
        ))}
      </Carousel>
      <Carousel aria-label="Articles" variant="hero" itemHeight={180}>
        {COLORS.slice(0, 5).map((c, i) => (
          <CarouselItem key={i} style={{ background: c }} href={`#article-${i + 1}`}>
            {label(i)}
          </CarouselItem>
        ))}
      </Carousel>
    </div>
  ),
}

/** A narrow (phone-width) container: fewer, smaller large items. */
export const Narrow: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Carousel aria-label="Photos" itemWidth={200} itemHeight={180}>
        {items()}
      </Carousel>
    </div>
  ),
}

/** Right-to-left: items start at the right edge and the layout mirrors. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" style={{ maxWidth: 640, display: 'grid', gap: 16 }}>
      <Carousel aria-label="Photos">{items()}</Carousel>
      <Carousel aria-label="Photos" variant="hero" itemHeight={180}>
        {items()}
      </Carousel>
    </div>
  ),
}
