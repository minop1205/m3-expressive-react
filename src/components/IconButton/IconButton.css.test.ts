import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/*
 * Cascade guard for the disabled colors (docs/audits/iconbutton.md IB2).
 * jsdom's getComputedStyle ignores selector specificity, so the check reads the
 * stylesheet: for every button state (variant × toggle selection × disabled),
 * the winning `--_icon-color` / `--_state-layer-color` / `--_container-color`
 * declaration must come from a `:disabled` rule.
 */
const css = readFileSync(resolve(__dirname, 'IconButton.module.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/@media[^{]*\{[\s\S]*?\}\s*\}/g, '')

interface Decl {
  selector: string
  spec: number
  order: number
  prop: string
  value: string
}

const decls: Decl[] = []
let order = 0
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const body = m[2]
  for (const selector of m[1].split(',').map((s) => s.trim())) {
    if (!selector.startsWith('.iconButton') || selector.includes('::')) continue
    // class / attribute / pseudo-class count (no ids or type selectors used).
    const spec = (selector.match(/\.|\[|:(?!:)/g) ?? []).length
    for (const d of body.matchAll(/(--_[\w-]+)\s*:\s*([^;]+);/g)) {
      decls.push({ selector, spec, order: order++, prop: d[1], value: d[2].trim() })
    }
  }
}

type State = { variant: string; selected?: 'true' | 'false'; disabled: boolean }

function matches(selector: string, s: State): boolean {
  if (/:active|:not/.test(selector)) return false
  for (const [, name, value] of selector.matchAll(/\[data-([\w-]+)(?:='([^']*)')?\]/g)) {
    const actual = name === 'variant' ? s.variant : name === 'selected' ? s.selected : undefined
    if (actual === undefined) return false
    if (value !== undefined && value !== actual) return false
  }
  if (selector.includes(':disabled') && !s.disabled) return false
  return true
}

function winner(prop: string, s: State): Decl | undefined {
  return decls
    .filter((d) => d.prop === prop && matches(d.selector, s))
    .sort((a, b) => a.spec - b.spec || a.order - b.order)
    .at(-1)
}

const variants = ['standard', 'filled', 'tonal', 'outlined']
const selections = [undefined, 'false', 'true'] as const

describe('IconButton disabled cascade', () => {
  for (const variant of variants) {
    for (const selected of selections) {
      it(`${variant} ${selected === undefined ? 'non-toggle' : `selected=${selected}`}`, () => {
        const s: State = { variant, selected, disabled: true }
        const icon = winner('--_icon-color', s)
        expect(icon?.selector).toContain(':disabled')
        expect(icon?.value).toBe(
          'color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)',
        )
        expect(winner('--_state-layer-color', s)?.value).toBe('transparent')
        const container = winner('--_container-color', s)
        expect(container?.selector).toContain(':disabled')
        const filledContainer =
          variant === 'filled' ||
          variant === 'tonal' ||
          (variant === 'outlined' && selected === 'true')
        expect(container?.value).toBe(
          filledContainer
            ? 'color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent)'
            : 'transparent',
        )
      })
    }
  }

  it('outlined disabled outline is outline-variant @ 0.38', () => {
    expect(winner('--_outline-color', { variant: 'outlined', disabled: true })?.value).toBe(
      'color-mix(in srgb, var(--md-sys-color-outline-variant) 38%, transparent)',
    )
  })

  it('unselected filled toggle uses surface-container / on-surface-variant', () => {
    const s: State = { variant: 'filled', selected: 'false', disabled: false }
    expect(winner('--_container-color', s)?.value).toBe('var(--md-sys-color-surface-container)')
    expect(winner('--_icon-color', s)?.value).toBe('var(--md-sys-color-on-surface-variant)')
  })
})
