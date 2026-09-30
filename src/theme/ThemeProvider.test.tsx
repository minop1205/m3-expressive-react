import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeProvider'

function MotionProbe() {
  const { motionScheme } = useTheme()
  return <span data-testid="probe">{motionScheme}</span>
}

describe('ThemeProvider motionScheme', () => {
  it('defaults to the expressive scheme (ruling B2)', () => {
    const { container } = render(
      <ThemeProvider>
        <MotionProbe />
      </ThemeProvider>,
    )
    expect(container.firstElementChild).toHaveAttribute(
      'data-md-motion-scheme',
      'expressive',
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('expressive')
  })

  it('writes motionScheme="standard" to the root and context', () => {
    const { container } = render(
      <ThemeProvider motionScheme="standard">
        <MotionProbe />
      </ThemeProvider>,
    )
    expect(container.firstElementChild).toHaveAttribute(
      'data-md-motion-scheme',
      'standard',
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('standard')
  })

  it('switches the attribute when the prop changes', () => {
    const { container, rerender } = render(
      <ThemeProvider motionScheme="standard" />,
    )
    rerender(<ThemeProvider motionScheme="expressive" />)
    expect(container.firstElementChild).toHaveAttribute(
      'data-md-motion-scheme',
      'expressive',
    )
  })

  it('lets a nested provider override the outer scheme', () => {
    render(
      <ThemeProvider motionScheme="standard">
        <ThemeProvider motionScheme="expressive" className="inner">
          <MotionProbe />
        </ThemeProvider>
      </ThemeProvider>,
    )
    const probe = screen.getByTestId('probe')
    expect(probe).toHaveTextContent('expressive')
    expect(probe.closest('[data-md-motion-scheme]')).toHaveAttribute(
      'data-md-motion-scheme',
      'expressive',
    )
  })
})
