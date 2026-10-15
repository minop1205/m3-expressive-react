import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BottomSheet } from '../components/BottomSheet'
import { Dialog } from '../components/Dialog'
import { NavigationDrawer, NavigationDrawerItem } from '../components/NavigationDrawer'
import { NavigationRail, NavigationRailItem } from '../components/NavigationRail'
import { SideSheet } from '../components/SideSheet'

/*
 * #516: an overlay mounted with `open` plays the same open motion as one
 * opened later. An element has no before-change style on its first render,
 * so the open transition only runs when `@starting-style` gives it the
 * closed values. jsdom has no transitions, so this reads the stylesheets.
 */

/** The CSS module, comments stripped. */
function css(component: string): string {
  return readFileSync(
    resolve(__dirname, `../components/${component}/${component}.module.css`),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '')
}

/** The bodies of the top-level `@starting-style { … }` blocks (not nested in `@media`). */
function topLevelStartingStyles(source: string): string[] {
  const blocks: string[] = []
  let depth = 0
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (depth === 0 && source.startsWith('@starting-style', i)) {
      const open = source.indexOf('{', i)
      let d = 0
      let j = open
      for (; j < source.length; j++) {
        if (source[j] === '{') d++
        else if (source[j] === '}' && --d === 0) break
      }
      blocks.push(source.slice(open + 1, j))
      i = j
    }
  }
  return blocks
}

/** Declarations per selector in the given rule bodies (selector lists split). */
function rules(bodies: string[]): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>()
  for (const body of bodies) {
    for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const decls: Record<string, string> = {}
      for (const d of m[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) decls[d[1]] = d[2].trim()
      for (const selector of m[1].split(',')) {
        const key = selector.trim().replace(/\s+/g, ' ')
        out.set(key, { ...out.get(key), ...decls })
      }
    }
  }
  return out
}

const EXPECTED: Record<string, Record<string, Record<string, string>>> = {
  Dialog: {
    '.root[data-open] .scrim': { opacity: '0' },
    '.root[data-open] .dialog': { opacity: '0', transform: 'scale(0.85)' },
    '.root[data-full-screen][data-open] .dialog': { transform: 'translateY(24px)' },
  },
  BottomSheet: {
    ".root[data-variant='modal'][data-open] .scrim": { opacity: '0' },
    ".root[data-variant='modal'][data-open] .sheet": { transform: 'translateY(100%)' },
    ".root[data-variant='modal'][data-open][data-detent='partial'] .sheet": {
      transform: 'translateY(100%)',
    },
  },
  SideSheet: {
    '.modalRoot[data-open] .scrim': { opacity: '0' },
    ".modalRoot[data-open] .sheet[data-anchor='right']": { transform: 'translateX(100%)' },
    ".modalRoot[data-open] .sheet[data-anchor='left']": { transform: 'translateX(-100%)' },
  },
  NavigationDrawer: {
    '.modalRoot[data-open] .scrim': { opacity: '0' },
    '.modalRoot[data-open] .drawer': { transform: 'translateX(-100%)' },
    "[dir='rtl'] .modalRoot[data-open] .drawer": { transform: 'translateX(100%)' },
  },
  NavigationRail: {
    '.modalRoot[data-open] .scrim': { opacity: '0' },
    '.rail[data-modal][data-open]': { 'box-shadow': 'none' },
  },
}

describe('overlays mounted open start from the closed state (#516)', () => {
  for (const [component, expected] of Object.entries(EXPECTED)) {
    it(`${component} declares @starting-style for its open state`, () => {
      const source = css(component)
      const starting = rules(topLevelStartingStyles(source))
      for (const [selector, decls] of Object.entries(expected)) {
        expect(starting.get(selector), `${component} ${selector}`).toEqual(decls)
      }
    })

    it(`${component} keeps the reduced-motion rule (no transitions)`, () => {
      expect(css(component)).toMatch(
        /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\{\s*transition: none;/,
      )
    })
  }
})

describe('React autoFocus works in an overlay mounted open (#516)', () => {
  it('Dialog', () => {
    render(
      <Dialog open title="Rename">
        <button type="button">first</button>
        <input aria-label="Name" autoFocus />
      </Dialog>,
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('BottomSheet', () => {
    render(
      <BottomSheet open aria-label="Sheet">
        <button type="button">first</button>
        <input aria-label="Name" autoFocus />
      </BottomSheet>,
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('SideSheet (modal)', () => {
    render(
      <SideSheet open variant="modal" headline="Filters">
        <button type="button">first</button>
        <input aria-label="Name" autoFocus />
      </SideSheet>,
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('NavigationDrawer (modal)', () => {
    render(
      <NavigationDrawer open variant="modal">
        <input aria-label="Search" autoFocus />
        <NavigationDrawerItem value="inbox" label="Inbox" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
  })

  it('NavigationRail (modal, expanded)', () => {
    render(
      <NavigationRail modal variant="expanded" aria-label="Main">
        <input aria-label="Search" autoFocus />
        <NavigationRailItem value="inbox" icon={<svg aria-hidden="true" />} label="Inbox" />
      </NavigationRail>,
    )
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
  })

  it('data-autofocus works for content mounted while closed', () => {
    const { rerender } = render(
      <Dialog open={false} title="Rename">
        <button type="button">first</button>
        <input aria-label="Name" data-autofocus />
      </Dialog>,
    )
    rerender(
      <Dialog open title="Rename">
        <button type="button">first</button>
        <input aria-label="Name" data-autofocus />
      </Dialog>,
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })
})
