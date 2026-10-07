/**
 * Host-CSS hardening: library-rendered headings, paragraphs and list
 * elements keep their component-defined margins inside
 * a page with aggressive typography / prose CSS — Infima's `.markdown
 * h1:first-child` (0,2,1) and `.markdown li + li` (0,1,2), Tailwind
 * Typography, CMS styles. jsdom (css: true) resolves the cascade by
 * specificity, so the injected sheet below reproduces the docs-site leak.
 * (jsdom does not resolve logical padding / list-style shorthands, so the
 * hardened list padding is covered by the docs-site browser sweep.)
 */
import { render } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TopAppBar } from '@/components/AppBar'
import { Dialog } from '@/components/Dialog'
import { List, ListItem } from '@/components/List'
import { SideSheet } from '@/components/SideSheet'
import { SwipeToDismiss } from '@/components/SwipeToDismiss'

// `:not(.host-x)` lifts each selector to the 0,2,1 of `.markdown h1:first-child`
// without depending on child position.
const HOST_CSS = `
  .prose h1:not(.host-x), .prose h2:not(.host-x), .prose h3:not(.host-x),
  .prose p:not(.host-x) { margin: 25px 0; }
  .prose ul:not(.host-x), .prose ol:not(.host-x) { margin: 0 0 20px; }
  .prose li:not(.host-x) { margin: 4px 0; }
  .prose li + li { margin-top: 4px; }
`

let sheet: HTMLStyleElement

beforeAll(() => {
  sheet = document.createElement('style')
  sheet.textContent = HOST_CSS
  document.head.appendChild(sheet)
  // Modal surfaces portal to <body>, so the prose scope is the whole page.
  document.body.classList.add('prose')
})

afterAll(() => {
  sheet.remove()
  document.body.classList.remove('prose')
})

const margins = (el: Element | null) => {
  if (el == null) throw new Error('element not rendered')
  const cs = getComputedStyle(el)
  return [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].join(' ')
}
const ZERO = '0px 0px 0px 0px'

describe('host typography CSS does not leak into component margins', () => {
  it('AppBar title / subtitle', () => {
    const { container } = render(<TopAppBar title="Title" subtitle="Subtitle" />)
    expect(margins(container.querySelector('h1'))).toBe(ZERO)
    expect(margins(container.querySelector('p'))).toBe(ZERO)
  })

  it('Dialog title (16dp bottom margin) and full-screen title', () => {
    const { baseElement, unmount } = render(<Dialog open title="Reset?">Body</Dialog>)
    expect(margins(baseElement.querySelector('h2'))).toBe('0px 0px 16px 0px')
    unmount()
    const fs = render(<Dialog open fullScreen title="Edit">Body</Dialog>)
    expect(margins(fs.baseElement.querySelector('h2'))).toBe(ZERO)
  })

  it('SideSheet headline', () => {
    const { container } = render(<SideSheet headline="Details">Content</SideSheet>)
    expect(margins(container.querySelector('h2'))).toBe(ZERO)
  })

  it('List / ListItem / SwipeToDismiss list elements', () => {
    const { container } = render(
      <List>
        <ListItem headline="Static" />
        <ListItem headline="Actionable" onClick={() => {}} />
        <SwipeToDismiss>
          <ListItem headline="Swipeable" />
        </SwipeToDismiss>
      </List>,
    )
    const ul = container.querySelector('ul')!
    expect(margins(ul)).toBe(ZERO)
    const items = container.querySelectorAll('ul > li')
    expect(items).toHaveLength(3)
    for (const li of items) expect(margins(li)).toBe(ZERO)
  })
})
