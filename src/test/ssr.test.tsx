// @vitest-environment node
/**
 * SSR smoke test (#410): every exported component renders through
 * `react-dom/server` — overlays open — without touching `window` /
 * `document` and without a single `console.error` / `console.warn`.
 * A static guard keeps direct `useLayoutEffect` calls out of `src/`
 * (React 18 warns on them during server rendering; use
 * `internal/useIsoLayoutEffect`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import * as lib from '../index'
import {
  BottomAppBar,
  BottomSheet,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardActionArea,
  CardActions,
  Carousel,
  CarouselItem,
  Checkbox,
  Chip,
  ChipSet,
  CircularProgressIndicator,
  DatePicker,
  DatePickerField,
  Dialog,
  Divider,
  Fab,
  FabMenu,
  FabMenuItem,
  FocusRing,
  IconButton,
  LinearProgressIndicator,
  List,
  ListItem,
  LoadingIndicator,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuItem,
  NavigationBar,
  NavigationBarItem,
  NavigationDrawer,
  NavigationDrawerItem,
  NavigationRail,
  NavigationRailItem,
  PullToRefresh,
  Radio,
  RadioGroup,
  Ripple,
  SearchBar,
  SegmentedButton,
  SegmentedButtons,
  Select,
  Option,
  SideSheet,
  Slider,
  Snackbar,
  SnackbarProvider,
  SplitButton,
  SwipeToDismiss,
  Switch,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  TimePicker,
  Toolbar,
  Tooltip,
  TopAppBar,
} from '../index'

const icon = <svg aria-hidden="true" />
const day = new Date(2026, 5, 10)
const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
]

const cases: Record<string, ReactElement> = {
  ThemeProvider: (
    <ThemeProvider>
      <span>content</span>
    </ThemeProvider>
  ),
  Ripple: <Ripple />,
  FocusRing: <FocusRing />,
  TopAppBar: <TopAppBar title="Title" navigationIcon={icon} />,
  BottomAppBar: <BottomAppBar>{icon}</BottomAppBar>,
  BottomSheet: (
    <BottomSheet open showDragHandle>
      Sheet
    </BottomSheet>
  ),
  SideSheet: (
    <SideSheet open variant="modal">
      Sheet
    </SideSheet>
  ),
  Toolbar: (
    <Toolbar>
      <IconButton icon={icon} aria-label="Edit" />
    </Toolbar>
  ),
  SplitButton: (
    <SplitButton open menu={<MenuItem>Item</MenuItem>}>
      Split
    </SplitButton>
  ),
  ButtonGroup: (
    <ButtonGroup>
      <Button>One</Button>
      <Button>Two</Button>
    </ButtonGroup>
  ),
  FabMenu: (
    <FabMenu open icon={icon} ariaLabel="Actions">
      <FabMenuItem icon={icon}>Item</FabMenuItem>
    </FabMenu>
  ),
  FabMenuItem: <FabMenuItem icon={icon}>Item</FabMenuItem>,
  Carousel: (
    <Carousel>
      <CarouselItem>One</CarouselItem>
      <CarouselItem>Two</CarouselItem>
    </Carousel>
  ),
  CarouselItem: <CarouselItem>One</CarouselItem>,
  Button: <Button>Button</Button>,
  Card: <Card>Card</Card>,
  CardActionArea: <CardActionArea>Area</CardActionArea>,
  CardActions: (
    <CardActions>
      <Button>Act</Button>
    </CardActions>
  ),
  DatePicker: <DatePicker open defaultValue={day} onClose={() => {}} />,
  DatePickerField: <DatePickerField defaultValue={day} />,
  Dialog: (
    <Dialog open title="Title">
      Body
    </Dialog>
  ),
  Menu: (
    <Menu open trigger={<Button>Open</Button>}>
      <MenuGroup label="Group">
        <MenuItem>Item</MenuItem>
      </MenuGroup>
      <MenuDivider />
      <MenuItem>Other</MenuItem>
    </Menu>
  ),
  MenuItem: <MenuItem>Item</MenuItem>,
  MenuGroup: (
    <MenuGroup label="Group">
      <MenuItem>Item</MenuItem>
    </MenuGroup>
  ),
  MenuDivider: <MenuDivider />,
  SearchBar: (
    <SearchBar open placeholder="Search">
      <ListItem headline="Suggestion" />
    </SearchBar>
  ),
  SwipeToDismiss: <SwipeToDismiss>Swipe</SwipeToDismiss>,
  TimePicker: <TimePicker />,
  IconButton: <IconButton icon={icon} aria-label="Icon" />,
  List: (
    <List>
      <ListItem headline="One" />
    </List>
  ),
  ListItem: <ListItem headline="One" />,
  LoadingIndicator: <LoadingIndicator />,
  PullToRefresh: <PullToRefresh refreshing>Content</PullToRefresh>,
  Fab: <Fab icon={icon} aria-label="Add" />,
  NavigationBar: (
    <NavigationBar value="a">
      <NavigationBarItem value="a" icon={icon} label="A" />
    </NavigationBar>
  ),
  NavigationBarItem: (
    <NavigationBar>
      <NavigationBarItem value="a" icon={icon} label="A" />
    </NavigationBar>
  ),
  NavigationRail: (
    <NavigationRail value="a" variant="expanded" modal>
      <NavigationRailItem value="a" icon={icon} label="A" />
    </NavigationRail>
  ),
  NavigationRailItem: <NavigationRailItem value="a" icon={icon} label="A" />,
  NavigationDrawer: (
    <NavigationDrawer open variant="modal" value="a">
      <NavigationDrawerItem value="a" label="A" />
    </NavigationDrawer>
  ),
  NavigationDrawerItem: <NavigationDrawerItem value="a" label="A" />,
  Switch: <Switch aria-label="Switch" />,
  Checkbox: <Checkbox aria-label="Check" />,
  Radio: <Radio value="a" aria-label="Radio" />,
  RadioGroup: (
    <RadioGroup name="group" defaultValue="a">
      <Radio value="a" aria-label="A" />
    </RadioGroup>
  ),
  SegmentedButton: <SegmentedButton options={options} />,
  SegmentedButtons: <SegmentedButtons options={options} />,
  Slider: <Slider aria-label="Slider" />,
  Chip: <Chip label="Chip" />,
  ChipSet: (
    <ChipSet>
      <Chip label="Chip" />
    </ChipSet>
  ),
  TextField: <TextField label="Label" />,
  Select: (
    <Select open label="Label" name="field" defaultValue="a">
      <Option value="a">A</Option>
      <Option value="b" disabled>
        B
      </Option>
    </Select>
  ),
  Option: <Option value="a">A</Option>,
  Badge: <Badge />,
  Snackbar: <Snackbar message="Saved" />,
  SnackbarProvider: (
    <SnackbarProvider>
      <span>content</span>
    </SnackbarProvider>
  ),
  Tabs: (
    <Tabs value="a">
      <Tab value="a">A</Tab>
      <Tab value="b">B</Tab>
    </Tabs>
  ),
  Tab: (
    <Tabs defaultValue="a">
      <Tab value="a">A</Tab>
    </Tabs>
  ),
  Tooltip: (
    <Tooltip open text="Tip">
      <Button>Hover</Button>
    </Tooltip>
  ),
  Divider: <Divider />,
  LinearProgressIndicator: <LinearProgressIndicator value={0.5} />,
  CircularProgressIndicator: <CircularProgressIndicator />,
}

describe('server rendering', () => {
  let error: MockInstance
  let warn: MockInstance
  beforeEach(() => {
    error = vi.spyOn(console, 'error')
    warn = vi.spyOn(console, 'warn')
  })
  afterEach(() => {
    error.mockRestore()
    warn.mockRestore()
  })

  it('runs without a DOM', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('covers every exported component', () => {
    const components = Object.entries(lib)
      .filter(([name, value]) => /^[A-Z]/.test(name) && typeof value !== 'string')
      .filter(
        ([, value]) =>
          typeof value === 'function' ||
          (typeof value === 'object' && value !== null && '$$typeof' in value),
      )
      .map(([name]) => name)
      .sort()
    expect(Object.keys(cases).sort()).toEqual(components)
  })

  it.each(Object.entries(cases))('%s renders without warnings', (_, element) => {
    expect(renderToString(element)).not.toBe('')
    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('SearchBar layout="fullscreen" renders without warnings (#442)', () => {
    const html = renderToString(
      <SearchBar layout="fullscreen" open placeholder="Search">
        <ListItem headline="Suggestion" />
      </SearchBar>,
    )
    expect(html).toContain('role="dialog"')
    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('useLayoutEffect guard', () => {
  const src = resolve(__dirname, '..')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? walk(path) : [path]
    })

  it('only internal/useIsoLayoutEffect calls useLayoutEffect', () => {
    const offenders = walk(src)
      .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
      .map((file) => relative(src, file).split('\\').join('/'))
      .filter((file) => file !== 'internal/useIsoLayoutEffect.ts')
      .filter((file) => /\buseLayoutEffect\b/.test(readFileSync(join(src, file), 'utf8')))
    expect(offenders).toEqual([])
  })
})
