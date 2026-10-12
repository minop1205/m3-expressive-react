/**
 * Smoke test for #413: every component built on `useControllableState` warns
 * in development when its controlled prop switches to `undefined`.
 */
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { resetDevWarnings } from '../internal/devWarning'
import { Button } from '../components/Button/Button'
import { ButtonGroup } from '../components/ButtonGroup/ButtonGroup'
import { Checkbox } from '../components/Checkbox/Checkbox'
import { Chip } from '../components/Chip/Chip'
import { DatePicker } from '../components/DatePicker/DatePicker'
import { DatePickerField } from '../components/DatePicker/DatePickerField'
import { FabMenu, FabMenuItem } from '../components/FabMenu/FabMenu'
import { IconButton } from '../components/IconButton/IconButton'
import { List, ListItem } from '../components/List/List'
import { Menu, MenuItem } from '../components/Menu/Menu'
import { NavigationBar, NavigationBarItem } from '../components/NavigationBar/NavigationBar'
import {
  NavigationDrawer,
  NavigationDrawerItem,
} from '../components/NavigationDrawer/NavigationDrawer'
import { NavigationRail, NavigationRailItem } from '../components/NavigationRail/NavigationRail'
import { Radio } from '../components/Radio/Radio'
import { RadioGroup } from '../components/Radio/RadioGroup'
import { SearchBar } from '../components/SearchBar/SearchBar'
import { SegmentedButton } from '../components/SegmentedButton/SegmentedButton'
import { Slider } from '../components/Slider/Slider'
import { SplitButton } from '../components/SplitButton/SplitButton'
import { SwipeToDismiss } from '../components/SwipeToDismiss/SwipeToDismiss'
import { Switch } from '../components/Switch/Switch'
import { Tab, Tabs } from '../components/Tabs/Tabs'
import { TextField } from '../components/TextField/TextField'
import { TimePicker } from '../components/TimePicker/TimePicker'
import { Tooltip } from '../components/Tooltip/Tooltip'

const Icon = <svg viewBox="0 0 24 24" aria-hidden="true" />
const noop = () => {}

/** [component name, state, render with the controlled prop set / unset]. */
type Case = [string, string, (controlled: boolean) => ReactElement]
const pick = <T,>(controlled: boolean, v: T) => (controlled ? v : undefined)

const cases: Case[] = [
  ['Button', 'selected', (c) => <Button toggle selected={pick(c, true)}>B</Button>],
  [
    'ButtonGroup',
    'value',
    (c) => (
      <ButtonGroup selectionMode="single" value={pick(c, 'a')}>
        <Button value="a">A</Button>
        <Button value="b">B</Button>
      </ButtonGroup>
    ),
  ],
  ['Checkbox', 'checked', (c) => <Checkbox aria-label="C" checked={pick(c, true)} onChange={noop} />],
  ['Chip', 'selected', (c) => <Chip variant="filter" label="C" selected={pick(c, true)} />],
  ['DatePicker', 'value', (c) => <DatePicker value={pick(c, new Date(2024, 6, 4))} />],
  ['DatePickerField', 'value', (c) => <DatePickerField value={pick(c, new Date(2024, 6, 4))} />],
  [
    'FabMenu',
    'open',
    (c) => (
      <FabMenu icon={Icon} ariaLabel="Create" open={pick(c, false)}>
        <FabMenuItem icon={Icon}>Note</FabMenuItem>
      </FabMenu>
    ),
  ],
  [
    'IconButton',
    'selected',
    (c) => <IconButton icon={Icon} aria-label="I" toggle selected={pick(c, true)} />,
  ],
  [
    'List',
    'value',
    (c) => (
      <List selectionMode="single" value={pick(c, 'a')} aria-label="L">
        <ListItem value="a" headline="A" />
      </List>
    ),
  ],
  [
    'Menu',
    'open',
    (c) => (
      <Menu trigger={<button>Open</button>} aria-label="M" open={pick(c, false)}>
        <MenuItem>Copy</MenuItem>
      </Menu>
    ),
  ],
  [
    'NavigationBar',
    'value',
    (c) => (
      <NavigationBar value={pick(c, 'a')}>
        <NavigationBarItem value="a" icon={Icon} label="A" />
      </NavigationBar>
    ),
  ],
  [
    'NavigationDrawer',
    'value',
    (c) => (
      <NavigationDrawer value={pick(c, 'a')}>
        <NavigationDrawerItem value="a" icon={Icon} label="A" />
      </NavigationDrawer>
    ),
  ],
  [
    'NavigationRail',
    'value',
    (c) => (
      <NavigationRail value={pick(c, 'a')} aria-label="R">
        <NavigationRailItem value="a" icon={Icon} label="A" />
      </NavigationRail>
    ),
  ],
  [
    'RadioGroup',
    'value',
    (c) => (
      <RadioGroup aria-label="G" value={pick(c, 'a')}>
        <Radio value="a" aria-label="A" />
      </RadioGroup>
    ),
  ],
  ['SearchBar', 'value', (c) => <SearchBar aria-label="S" value={pick(c, 'q')} onChange={noop} />],
  ['SearchBar', 'open', (c) => <SearchBar aria-label="S" open={pick(c, false)} />],
  [
    'SegmentedButton',
    'value',
    (c) => (
      <SegmentedButton
        aria-label="V"
        options={[{ value: 'a', label: 'A' }]}
        value={pick(c, 'a')}
      />
    ),
  ],
  ['Slider', 'value', (c) => <Slider aria-label="V" value={pick(c, 40)} />],
  [
    'SplitButton',
    'open',
    (c) => (
      <SplitButton menu={<MenuItem>Copy</MenuItem>} open={pick(c, false)}>
        Send
      </SplitButton>
    ),
  ],
  [
    'SwipeToDismiss',
    'dismissed',
    (c) => (
      <SwipeToDismiss dismissed={pick(c, null)}>
        <span>content</span>
      </SwipeToDismiss>
    ),
  ],
  ['Switch', 'selected', (c) => <Switch aria-label="S" selected={pick(c, true)} />],
  [
    'Tabs',
    'value',
    (c) => (
      <Tabs value={pick(c, 'a')} aria-label="T">
        <Tab value="a" label="A" />
      </Tabs>
    ),
  ],
  ['TextField', 'value', (c) => <TextField label="N" value={pick(c, 'x')} onChange={noop} />],
  ['TimePicker', 'value', (c) => <TimePicker value={pick(c, { hour: 10, minute: 30 })} />],
  [
    'Tooltip',
    'open',
    (c) => (
      <Tooltip text="Hint" open={pick(c, false)}>
        <button>Trigger</button>
      </Tooltip>
    ),
  ],
]

describe('controlled → uncontrolled switch warning (#413)', () => {
  let warn: MockInstance
  beforeEach(() => {
    resetDevWarnings()
    warn = vi.spyOn(console, 'warn').mockImplementation(noop)
  })
  afterEach(() => warn.mockRestore())

  it.each(cases)('%s (%s)', (name, state, ui) => {
    const { rerender } = render(ui(true))
    const message = new RegExp(
      `changing the controlled ${state} state of ${name} to be uncontrolled`,
    )
    const matching = () => warn.mock.calls.filter(([m]) => message.test(String(m)))
    expect(matching()).toHaveLength(0)
    rerender(ui(false))
    expect(matching()).toHaveLength(1)
  })
})
