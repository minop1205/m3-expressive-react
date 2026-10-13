/**
 * Parameterized axe coverage across component variants / sizes / key states
 * (#425). Each component's own test file runs axe on its default rendering;
 * this suite loops over the variant matrix so a variant-specific a11y
 * regression (missing name, invalid ARIA, nested interactive, ...) fails CI.
 */
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { TopAppBar } from '../components/AppBar'
import { Button } from '../components/Button'
import { Card, CardActionArea, CardActions } from '../components/Card'
import { Carousel, CarouselItem } from '../components/Carousel'
import { Chip } from '../components/Chip'
import { Dialog } from '../components/Dialog'
import { IconButton } from '../components/IconButton'
import { List, ListItem } from '../components/List'
import { NavigationDrawer, NavigationDrawerItem } from '../components/NavigationDrawer'
import { SideSheet } from '../components/SideSheet'
import { Slider } from '../components/Slider'
import { Tab, Tabs } from '../components/Tabs'
import { TextField } from '../components/TextField'
import { Toolbar } from '../components/Toolbar'

const Icon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2 2 22h20z" />
  </svg>
)

type Case = [name: string, element: () => ReactElement]

async function expectNoViolations(element: ReactElement) {
  const { container } = render(element)
  // Portalled overlays render into document.body, so scan the whole body.
  // `region` is a page-level rule (content outside landmarks) that does not
  // apply to a component rendered in isolation.
  const results = await axe(container.ownerDocument.body, {
    rules: { region: { enabled: false } },
  })
  expect(results).toHaveNoViolations()
}

function suite(component: string, cases: Case[]) {
  describe(`${component} axe across variants`, () => {
    it.each(cases)('%s', async (_name, element) => {
      await expectNoViolations(element())
    })
  })
}

const buttonVariants = ['elevated', 'filled', 'tonal', 'outlined', 'text'] as const
const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

suite('Button', [
  ...buttonVariants.map((variant): Case => [
    `variant=${variant}`,
    () => <Button variant={variant}>Label</Button>,
  ]),
  ...sizes.map((size): Case => [`size=${size}`, () => <Button size={size}>Label</Button>]),
  ['with startIcon', () => <Button startIcon={Icon}>Label</Button>],
  ['toggle unselected', () => <Button toggle>Label</Button>],
  ['toggle selected (outlined)', () => <Button toggle selected variant="outlined">Label</Button>],
  ['disabled', () => <Button disabled>Label</Button>],
])

const iconButtonVariants = ['standard', 'filled', 'tonal', 'outlined'] as const

suite('IconButton', [
  ...iconButtonVariants.map((variant): Case => [
    `variant=${variant}`,
    () => <IconButton icon={Icon} aria-label="Add" variant={variant} />,
  ]),
  ...sizes.map((size): Case => [
    `size=${size}`,
    () => <IconButton icon={Icon} aria-label="Add" size={size} />,
  ]),
  ['width=narrow', () => <IconButton icon={Icon} aria-label="Add" width="narrow" />],
  ['width=wide, shape=square', () => <IconButton icon={Icon} aria-label="Add" width="wide" shape="square" />],
  ...iconButtonVariants.map((variant): Case => [
    `toggle selected variant=${variant}`,
    () => (
      <IconButton
        icon={Icon}
        variant={variant}
        toggle
        selected
        aria-label="Favorite"
        selectedAriaLabel="Unfavorite"
      />
    ),
  ]),
  ['disabled toggle', () => <IconButton icon={Icon} aria-label="Add" toggle disabled />],
])

const tabs = (props: Partial<Parameters<typeof Tabs>[0]>, withIcons = false) => (
  <Tabs aria-label="Sections" defaultValue="a" {...props}>
    <Tab value="a" label="Alpha" icon={withIcons ? Icon : undefined} />
    <Tab value="b" label="Beta" icon={withIcons ? Icon : undefined} />
    <Tab value="c" label="Gamma" icon={withIcons ? Icon : undefined} disabled />
  </Tabs>
)

suite('Tabs', [
  ['primary fixed', () => tabs({ variant: 'primary' })],
  ['primary scrollable', () => tabs({ variant: 'primary', scrollable: true })],
  ['primary with icons', () => tabs({ variant: 'primary' }, true)],
  ['secondary fixed', () => tabs({ variant: 'secondary' })],
  ['secondary scrollable', () => tabs({ variant: 'secondary', scrollable: true })],
  ['secondary with icons', () => tabs({ variant: 'secondary' }, true)],
])

suite('Dialog', [
  [
    'basic',
    () => (
      <Dialog open title="Discard draft?" actions={<button type="button">OK</button>}>
        Supporting text
      </Dialog>
    ),
  ],
  [
    'full-screen',
    () => (
      <Dialog open fullScreen title="Settings" actions={<button type="button">Save</button>}>
        Content
      </Dialog>
    ),
  ],
])

suite('SideSheet', [
  [
    'standard',
    () => (
      <SideSheet open headline="Filters" aria-label="Filters">
        <p>Content</p>
      </SideSheet>
    ),
  ],
  [
    'modal with back button and divider',
    () => (
      <SideSheet
        variant="modal"
        open
        headline="Filters"
        aria-label="Filters"
        showBackButton
        showDivider
      >
        <p>Content</p>
      </SideSheet>
    ),
  ],
])

const drawer = (variant: 'standard' | 'modal') => (
  <NavigationDrawer
    variant={variant}
    open
    onClose={() => {}}
    value="a"
    onChange={() => {}}
    aria-label="Navigation"
  >
    <NavigationDrawerItem value="a" icon={Icon} label="Inbox" />
    <NavigationDrawerItem value="b" icon={Icon} label="Starred" />
  </NavigationDrawer>
)

suite('NavigationDrawer', [['standard', () => drawer('standard')]])

describe('NavigationDrawer axe across variants (modal)', () => {
  // The modal surface is a <div role="dialog"> since #468 (#429).
  it('modal', async () => {
    await expectNoViolations(drawer('modal'))
  })
})

const cardVariants = ['filled', 'elevated', 'outlined'] as const

suite('Card', [
  ...cardVariants.map((variant): Case => [
    `static variant=${variant}`,
    () => <Card variant={variant}>Static</Card>,
  ]),
  ...cardVariants.map((variant): Case => [
    `interactive variant=${variant}`,
    () => (
      <Card variant={variant} onClick={() => {}} aria-label="Open">
        Interactive
      </Card>
    ),
  ]),
  ...cardVariants.map((variant): Case => [
    `disabled variant=${variant}`,
    () => (
      <Card variant={variant} onClick={() => {}} aria-label="Open" disabled>
        Disabled
      </Card>
    ),
  ]),
  ['link card', () => <Card variant="outlined" href="/x">Link</Card>],
  [
    'action area + actions',
    () => (
      <Card variant="elevated">
        <CardActionArea onClick={() => {}}>
          <h3>Title</h3>
        </CardActionArea>
        <CardActions>
          <button type="button">Share</button>
        </CardActions>
      </Card>
    ),
  ],
])

suite('Chip', [
  ['assist', () => <Chip label="Tag" />],
  ['assist elevated', () => <Chip label="Tag" elevated />],
  ['assist with icon', () => <Chip label="Tag" icon={Icon} />],
  ['filter unselected', () => <Chip variant="filter" label="Tag" />],
  ['filter selected elevated', () => <Chip variant="filter" label="Tag" selected elevated />],
  ['input removable', () => <Chip variant="input" label="Tag" removable />],
  ['input disabled removable', () => <Chip variant="input" label="Tag" removable disabled />],
  ['suggestion', () => <Chip variant="suggestion" label="Tag" />],
  ['suggestion elevated', () => <Chip variant="suggestion" label="Tag" elevated />],
  ['suggestion disabled', () => <Chip variant="suggestion" label="Tag" disabled />],
])

suite('Slider', [
  ...sizes.map((size): Case => [
    `size=${size}`,
    () => <Slider aria-label="Volume" size={size} defaultValue={40} />,
  ]),
  ['stepped with ticks', () => <Slider aria-label="Volume" step={10} showTicks defaultValue={40} />],
  ['range with ticks', () => <Slider aria-label="Range" step={10} showTicks defaultValue={[20, 60]} />],
  ['inset icon', () => <Slider aria-label="Volume" size="md" insetIcon={Icon} defaultValue={40} />],
  ['centered', () => <Slider aria-label="Balance" min={-50} max={50} centered defaultValue={10} />],
  ['value label', () => <Slider aria-label="Volume" showValueLabel defaultValue={40} />],
  ['vertical range', () => <Slider aria-label="Range" orientation="vertical" defaultValue={[20, 60]} />],
])

const textFieldVariants = ['filled', 'outlined'] as const

suite('TextField', [
  ...textFieldVariants.flatMap((variant): Case[] => [
    [`${variant}`, () => <TextField variant={variant} label="Name" />],
    [`${variant} multiline`, () => <TextField variant={variant} label="Notes" multiline rows={3} />],
    [
      `${variant} prefix / suffix`,
      () => <TextField variant={variant} label="Price" prefixText="$" suffixText="USD" />,
    ],
    [
      `${variant} icons + supporting text + counter`,
      () => (
        <TextField
          variant={variant}
          label="Search"
          startIcon={Icon}
          supportingText="Hint"
          maxLength={20}
        />
      ),
    ],
    [`${variant} disabled`, () => <TextField variant={variant} label="Name" disabled defaultValue="x" />],
    [`${variant} read-only`, () => <TextField variant={variant} label="Name" readOnly defaultValue="x" />],
    [`${variant} error`, () => <TextField variant={variant} label="Email" error errorText="Invalid" />],
    [`${variant} required`, () => <TextField variant={variant} label="Name" required />],
  ]),
])

const carouselVariants = ['multi-browse', 'uncontained', 'hero'] as const

suite('Carousel', [
  ...carouselVariants.map((variant): Case => [
    `variant=${variant}`,
    () => (
      <Carousel aria-label="Photos" variant={variant}>
        <CarouselItem>One</CarouselItem>
        <CarouselItem>Two</CarouselItem>
        <CarouselItem>Three</CarouselItem>
      </Carousel>
    ),
  ]),
  ...carouselVariants.map((variant): Case => [
    `href items variant=${variant}`,
    () => (
      <Carousel aria-label="Albums" variant={variant}>
        <CarouselItem href="/one">One</CarouselItem>
        <CarouselItem href="/two">Two</CarouselItem>
        <CarouselItem href="/three">Three</CarouselItem>
      </Carousel>
    ),
  ]),
  [
    'interactive items with a disabled item',
    () => (
      <Carousel aria-label="Albums" variant="hero">
        <CarouselItem onClick={() => {}}>One</CarouselItem>
        <CarouselItem onClick={() => {}} disabled>
          Two
        </CarouselItem>
        <CarouselItem onClick={() => {}}>Three</CarouselItem>
      </Carousel>
    ),
  ],
])

const toolbarVariants = ['docked', 'floating'] as const
const toolbarColors = ['standard', 'vibrant'] as const

suite('Toolbar', [
  ...toolbarVariants.flatMap((variant) =>
    toolbarColors.map((color): Case => [
      `variant=${variant} color=${color}`,
      () => (
        <Toolbar aria-label="Actions" variant={variant} color={color}>
          <IconButton icon={Icon} aria-label="Bold" />
          <IconButton icon={Icon} aria-label="Italic" />
        </Toolbar>
      ),
    ]),
  ),
  ...toolbarColors.map((color): Case => [
    `floating vertical color=${color}`,
    () => (
      <Toolbar aria-label="Actions" variant="floating" orientation="vertical" color={color}>
        <IconButton icon={Icon} aria-label="Bold" />
        <IconButton icon={Icon} aria-label="Italic" />
      </Toolbar>
    ),
  ]),
  [
    'floating with start / end content (expanded)',
    () => (
      <Toolbar
        aria-label="Actions"
        variant="floating"
        color="vibrant"
        startContent={<IconButton icon={Icon} aria-label="Undo" />}
        endContent={<IconButton icon={Icon} aria-label="Redo" />}
      >
        <IconButton icon={Icon} aria-label="Bold" />
      </Toolbar>
    ),
  ],
])

const appBarVariants = ['small', 'center', 'medium', 'large'] as const

suite('TopAppBar', [
  ...appBarVariants.map((variant): Case => [
    `variant=${variant}`,
    () => (
      <TopAppBar
        variant={variant}
        title="Title"
        navigationIcon={<button type="button" aria-label="Menu">m</button>}
        actions={<button type="button" aria-label="Search">s</button>}
      />
    ),
  ]),
  ...appBarVariants.map((variant): Case => [
    `variant=${variant} with subtitle`,
    () => (
      <TopAppBar
        variant={variant}
        title="Title"
        subtitle="Subtitle"
        navigationIcon={<button type="button" aria-label="Menu">m</button>}
      />
    ),
  ]),
  [
    'medium flexible, subtitle, centered, collapsed',
    () => (
      <TopAppBar
        variant="medium"
        title="Title"
        subtitle="Subtitle"
        titleAlignment="center"
        collapsedFraction={1}
        navigationIcon={<button type="button" aria-label="Menu">m</button>}
      />
    ),
  ],
  [
    'large flexible, subtitle, centered, half collapsed',
    () => (
      <TopAppBar
        variant="large"
        title="Title"
        subtitle="Subtitle"
        titleAlignment="center"
        collapsedFraction={0.5}
        navigationIcon={<button type="button" aria-label="Menu">m</button>}
      />
    ),
  ],
])

const listRows = (
  <>
    <ListItem headline="Static" supportingText="Supporting" leading={Icon} />
    <ListItem headline="Clickable" onClick={() => {}} />
    <ListItem headline="Selected" onClick={() => {}} selected />
    <ListItem headline="Disabled" onClick={() => {}} disabled />
    <ListItem headline="Link" href="/x" trailingSupportingText="100+" />
  </>
)

suite('List', [
  ['standard', () => <List aria-label="Items">{listRows}</List>],
  ['segmented', () => <List aria-label="Items" variant="segmented">{listRows}</List>],
  [
    'single selection with a disabled row',
    () => (
      <List aria-label="Items" selectionMode="single" defaultValue="b">
        <ListItem headline="A" value="a" />
        <ListItem headline="B" value="b" />
        <ListItem headline="C" value="c" disabled />
      </List>
    ),
  ],
  [
    'segmented multiple selection with a disabled row',
    () => (
      <List aria-label="Items" variant="segmented" selectionMode="multiple" defaultValue={['a']}>
        <ListItem headline="A" value="a" />
        <ListItem headline="B" value="b" />
        <ListItem headline="C" value="c" disabled />
      </List>
    ),
  ],
])
