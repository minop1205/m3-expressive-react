import { afterEach, describe, expect, it } from 'vitest'
import { createMenuTypeahead, handleMenuTypeahead, moveMenuFocus } from './menuNavigation'

function makeItems(labels: string[]): HTMLElement[] {
  document.body.innerHTML = ''
  return labels.map((label) => {
    const el = document.createElement('button')
    el.tabIndex = -1
    el.innerHTML = label
    document.body.append(el)
    return el
  })
}

const key = (k: string) => ({ key: k, preventDefault: () => {} })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('moveMenuFocus', () => {
  it('moves with wrap and jumps with Home / End', () => {
    const items = makeItems(['A', 'B', 'C'])
    items[0].focus()
    moveMenuFocus(key('ArrowDown'), items)
    expect(document.activeElement).toBe(items[1])
    moveMenuFocus(key('End'), items)
    expect(document.activeElement).toBe(items[2])
    moveMenuFocus(key('ArrowDown'), items)
    expect(document.activeElement).toBe(items[0])
    moveMenuFocus(key('ArrowUp'), items)
    expect(document.activeElement).toBe(items[2])
    moveMenuFocus(key('Home'), items)
    expect(document.activeElement).toBe(items[0])
  })

  it('ignores other keys', () => {
    const items = makeItems(['A'])
    expect(moveMenuFocus(key('x'), items)).toBe(false)
    expect(moveMenuFocus(key('ArrowDown'), [])).toBe(false)
  })
})

describe('handleMenuTypeahead', () => {
  it('cycles through the matches of a repeated letter (#430)', () => {
    const items = makeItems(['Apple', 'Avocado', 'Apricot', 'Banana'])
    const state = createMenuTypeahead()
    items[0].focus()
    expect(handleMenuTypeahead(key('a'), items, state, 1000)).toBe(true)
    expect(document.activeElement).toBe(items[1])
    handleMenuTypeahead(key('a'), items, state, 1100)
    expect(document.activeElement).toBe(items[2])
    handleMenuTypeahead(key('a'), items, state, 1200)
    expect(document.activeElement).toBe(items[0])
  })

  it('matches a multi-character prefix from the focused item', () => {
    const items = makeItems(['Apple', 'Apricot', 'Avocado'])
    const state = createMenuTypeahead()
    items[0].focus()
    handleMenuTypeahead(key('a'), items, state, 1000)
    handleMenuTypeahead(key('v'), items, state, 1100)
    expect(document.activeElement).toBe(items[2])
  })

  it('resets the buffer after a pause', () => {
    const items = makeItems(['Banana', 'Cherry', 'Blueberry'])
    const state = createMenuTypeahead()
    items[0].focus()
    handleMenuTypeahead(key('c'), items, state, 1000)
    expect(document.activeElement).toBe(items[1])
    handleMenuTypeahead(key('b'), items, state, 5000)
    expect(document.activeElement).toBe(items[2])
  })

  it('ignores modified, whitespace and non-printable keys', () => {
    const items = makeItems(['Apple'])
    const state = createMenuTypeahead()
    expect(handleMenuTypeahead({ key: 'a', ctrlKey: true }, items, state)).toBe(false)
    expect(handleMenuTypeahead({ key: ' ' }, items, state)).toBe(false)
    expect(handleMenuTypeahead({ key: 'Enter' }, items, state)).toBe(false)
  })
})
