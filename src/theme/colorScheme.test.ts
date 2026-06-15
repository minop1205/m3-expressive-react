import { describe, it, expect } from 'vitest'
import {
  generateColorScheme,
  schemeToCssVars,
  type ColorRole,
} from './colorScheme'

const HEX = /^#[0-9a-fA-F]{6}$/

describe('generateColorScheme', () => {
  it('produces a valid hex value for every role in both modes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const scheme = generateColorScheme({ seedColor: '#6750A4', mode })
      for (const role in scheme) {
        expect(scheme[role as ColorRole]).toMatch(HEX)
      }
    }
  })

  it('yields different primary values for light vs dark', () => {
    const light = generateColorScheme({ seedColor: '#6750A4', mode: 'light' })
    const dark = generateColorScheme({ seedColor: '#6750A4', mode: 'dark' })
    expect(light.primary).not.toBe(dark.primary)
  })

  it('respects the seed color (different seeds → different primaries)', () => {
    const a = generateColorScheme({ seedColor: '#6750A4', mode: 'light' })
    const b = generateColorScheme({ seedColor: '#386A20', mode: 'light' })
    expect(a.primary).not.toBe(b.primary)
  })

  it('maps roles to --md-sys-color-* custom properties', () => {
    const scheme = generateColorScheme({ seedColor: '#6750A4', mode: 'light' })
    const vars = schemeToCssVars(scheme)
    expect(vars['--md-sys-color-primary']).toMatch(HEX)
    expect(vars['--md-sys-color-on-surface']).toMatch(HEX)
    expect(vars['--md-sys-color-surface-container-high']).toMatch(HEX)
  })
})
