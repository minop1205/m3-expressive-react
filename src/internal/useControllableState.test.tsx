import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { resetDevWarnings } from './devWarning'
import { useControllableState } from './useControllableState'

type Props = { value?: string; defaultValue?: string }

const setup = (initialProps: Props, onChange?: (v: string) => void) =>
  renderHook(
    ({ value, defaultValue = 'a' }: Props) =>
      useControllableState({ value, defaultValue, name: 'Thing', state: 'value', onChange }),
    { initialProps },
  )

describe('useControllableState', () => {
  let warn: MockInstance

  beforeEach(() => {
    resetDevWarnings()
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warn.mockRestore()
    vi.unstubAllEnvs()
  })

  it('uncontrolled: starts at defaultValue and stores setValue', () => {
    const onChange = vi.fn()
    const { result } = setup({}, onChange)
    expect(result.current[0]).toBe('a')
    expect(result.current[2]).toBe(false)
    act(() => result.current[1]('b'))
    expect(result.current[0]).toBe('b')
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('controlled: follows value and ignores setValue', () => {
    const onChange = vi.fn()
    const { result, rerender } = setup({ value: 'x' }, onChange)
    expect(result.current[0]).toBe('x')
    expect(result.current[2]).toBe(true)
    act(() => result.current[1]('y'))
    expect(result.current[0]).toBe('x')
    expect(onChange).toHaveBeenCalledWith('y')
    rerender({ value: 'z' })
    expect(result.current[0]).toBe('z')
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps setValue stable across renders', () => {
    const { result, rerender } = setup({})
    const first = result.current[1]
    rerender({})
    expect(result.current[1]).toBe(first)
  })

  it('warns once when switching from controlled to uncontrolled', () => {
    const { result, rerender } = setup({ value: 'x' })
    rerender({})
    rerender({ value: 'x' })
    rerender({})
    // Controlledness stays locked to the first render; the last value stays.
    expect(result.current[2]).toBe(true)
    expect(result.current[0]).toBe('x')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(
      /changing the controlled value state of Thing to be uncontrolled/,
    )
  })

  it('warns when switching from uncontrolled to controlled', () => {
    const { result, rerender } = setup({})
    rerender({ value: 'x' })
    expect(result.current[0]).toBe('a')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(
      /changing the uncontrolled value state of Thing to be controlled/,
    )
  })

  it('warns when defaultValue changes while uncontrolled', () => {
    const { result, rerender } = setup({ defaultValue: 'a' })
    rerender({ defaultValue: 'a' })
    expect(warn).not.toHaveBeenCalled()
    rerender({ defaultValue: 'b' })
    expect(result.current[0]).toBe('a')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(
      /changing the default value state of an uncontrolled Thing after being initialized/,
    )
  })

  it('compares array / object defaults structurally', () => {
    const { rerender } = renderHook(
      ({ d }: { d: string[] }) =>
        useControllableState({ value: undefined, defaultValue: d, name: 'Thing', state: 'value' }),
      { initialProps: { d: ['a'] } },
    )
    rerender({ d: ['a'] })
    expect(warn).not.toHaveBeenCalled()
    rerender({ d: ['b'] })
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('does not warn about defaultValue changes while controlled', () => {
    const { rerender } = setup({ value: 'x', defaultValue: 'a' })
    rerender({ value: 'x', defaultValue: 'b' })
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { rerender } = setup({ value: 'x' })
    rerender({})
    const other = setup({ defaultValue: 'a' })
    other.rerender({ defaultValue: 'b' })
    expect(warn).not.toHaveBeenCalled()
  })
})
