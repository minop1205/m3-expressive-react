import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Tab, TabContext, TabPanel, Tabs } from './Tabs'

describe('Link (navigation) tabs (#499)', () => {
  function LinkTabs({
    value = 'home',
    onChange = () => {},
  }: {
    value?: string
    onChange?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>, v: string) => void
  }) {
    return (
      <Tabs value={value} onChange={onChange} aria-label="Site">
        <Tab value="home" href="#home" label="Home" />
        <Tab value="docs" href="#docs" label="Docs" />
        <Tab value="old" href="#old" label="Old" disabled />
        <Tab value="blog" href="#blog" label="Blog" />
      </Tabs>
    )
  }

  it('renders <a role="tab" href> with aria-selected and no aria-current', () => {
    render(<LinkTabs />)
    const home = screen.getByRole('tab', { name: 'Home' })
    expect(home.tagName).toBe('A')
    expect(home).toHaveAttribute('href', '#home')
    expect(home).toHaveAttribute('aria-selected', 'true')
    expect(home).not.toHaveAttribute('aria-current')
    expect(home).toHaveAttribute('tabindex', '0')
    const docs = screen.getByRole('tab', { name: 'Docs' })
    expect(docs).toHaveAttribute('aria-selected', 'false')
    expect(docs).toHaveAttribute('tabindex', '-1')
  })

  it('passes target / rel / download and a consumer aria-current through', () => {
    render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" href="/a" target="_blank" rel="noopener" label="A" aria-current="page" />
        <Tab value="b" href="/b.pdf" download label="B" />
      </Tabs>,
    )
    const a = screen.getByRole('tab', { name: 'A' })
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener')
    expect(a).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('download')
  })

  it('fires onChange on click without intercepting the navigation', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const seen: boolean[] = []
    const onDocClick = (event: MouseEvent) => seen.push(event.defaultPrevented)
    document.addEventListener('click', onDocClick)
    render(<LinkTabs onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Docs' }))
    document.removeEventListener('click', onDocClick)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][1]).toBe('docs')
    // Nothing in Tabs prevents the browser's default (following the link).
    expect(seen).toEqual([false])
  })

  it('lets a client-side router preventDefault() in onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn((event: React.MouseEvent) => event.preventDefault())
    const seen: boolean[] = []
    const onDocClick = (event: MouseEvent) => seen.push(event.defaultPrevented)
    document.addEventListener('click', onDocClick)
    render(<LinkTabs onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Docs' }))
    document.removeEventListener('click', onDocClick)
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'docs')
    expect(seen).toEqual([true])
  })

  it('does not select on modified clicks (open in a new tab / window)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LinkTabs onChange={onChange} />)
    const docs = screen.getByRole('tab', { name: 'Docs' })
    for (const key of ['Control', 'Meta', 'Shift', 'Alt']) {
      await user.keyboard(`{${key}>}`)
      await user.click(docs)
      await user.keyboard(`{/${key}}`)
    }
    expect(onChange).not.toHaveBeenCalled()
  })

  it('moves focus with arrows (skipping disabled links) and activates with Enter / Space', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn((event: React.MouseEvent) => event.preventDefault())
    render(<LinkTabs onChange={onChange} />)
    screen.getByRole('tab', { name: 'Home' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Docs' })).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Blog' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'blog')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Docs' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'docs')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('renders a disabled link tab without href, aria-disabled and not selectable', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<LinkTabs onChange={onChange} />)
    const old = screen.getByRole('tab', { name: 'Old' })
    expect(old).not.toHaveAttribute('href')
    expect(old).toHaveAttribute('aria-disabled', 'true')
    await user.click(old)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lets a consumer onClick preventDefault() veto the selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Tabs value="a" onChange={onChange} aria-label="S">
        <Tab value="a" href="#a" label="A" />
        <Tab value="b" href="#b" label="B" onClick={(e) => e.preventDefault()} />
      </Tabs>,
    )
    await user.click(screen.getByRole('tab', { name: 'B' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards the ref to the anchor', () => {
    const ref = createRef<HTMLButtonElement | HTMLAnchorElement>()
    render(
      <Tabs value="a" aria-label="S">
        <Tab ref={ref} value="a" href="#a" label="A" />
      </Tabs>,
    )
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<LinkTabs />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('TabContext / TabPanel (#499)', () => {
  function Panels({ onChange }: { onChange?: (e: React.MouseEvent, v: string) => void }) {
    return (
      <TabContext defaultValue="one" onChange={onChange}>
        <Tabs aria-label="Panels">
          <Tab value="one" label="One" />
          <Tab value="two" label="Two" />
          <Tab value="three words" label="Three" />
        </Tabs>
        <TabPanel value="one">First</TabPanel>
        <TabPanel value="two">Second</TabPanel>
        <TabPanel value="three words">Third</TabPanel>
      </TabContext>
    )
  }

  it('links tabs and panels with id / aria-controls / aria-labelledby', () => {
    render(<Panels />)
    for (const [name, text] of [
      ['One', 'First'],
      ['Two', 'Second'],
      ['Three', 'Third'],
    ]) {
      const tab = screen.getByRole('tab', { name })
      const panel = screen.getByText(text)
      expect(panel).toHaveAttribute('role', 'tabpanel')
      expect(tab.id).not.toBe('')
      expect(tab.id).not.toMatch(/\s/)
      expect(tab).toHaveAttribute('aria-controls', panel.id)
      expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    }
  })

  it('shows only the selected panel, focusable with tabIndex 0', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Panels onChange={onChange} />)
    const first = screen.getByRole('tabpanel', { name: 'One' })
    expect(first).toHaveTextContent('First')
    expect(first).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('Second')).not.toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Two' }))
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'two')
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Two' })).toHaveTextContent('Second')
    expect(screen.getByText('First')).not.toBeVisible()
    // Tab from the selected tab moves into its panel (APG).
    await user.tab()
    expect(screen.getByRole('tabpanel', { name: 'Two' })).toHaveFocus()
  })

  it('supports a controlled value and a tabIndex override, and still fires Tabs onChange', async () => {
    const user = userEvent.setup()
    const ctxChange = vi.fn()
    const tabsChange = vi.fn()
    render(
      <TabContext value="b" onChange={ctxChange}>
        <Tabs aria-label="S" onChange={tabsChange}>
          <Tab value="a" label="A" />
          <Tab value="b" label="B" />
        </Tabs>
        <TabPanel value="a">PA</TabPanel>
        <TabPanel value="b" tabIndex={-1}>
          PB
        </TabPanel>
      </TabContext>,
    )
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'B' })).toHaveAttribute('tabindex', '-1')
    await user.click(screen.getByRole('tab', { name: 'A' }))
    expect(ctxChange).toHaveBeenCalledWith(expect.anything(), 'a')
    expect(tabsChange).toHaveBeenCalledWith(expect.anything(), 'a')
    // Controlled: stays on B until the parent updates value.
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true')
  })

  it('omits aria-controls for tabs without a rendered panel and for link tabs', () => {
    render(
      <TabContext defaultValue="a">
        <Tabs aria-label="S">
          <Tab value="a" label="A" />
          <Tab value="b" label="B" />
          <Tab value="c" href="#c" label="C" />
        </Tabs>
        <TabPanel value="a">PA</TabPanel>
      </TabContext>,
    )
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-controls')
    expect(screen.getByRole('tab', { name: 'B' })).not.toHaveAttribute('aria-controls')
    expect(screen.getByRole('tab', { name: 'C' })).not.toHaveAttribute('aria-controls')
    expect(screen.getByRole('tab', { name: 'C' })).not.toHaveAttribute('id')
  })

  it('keeps Tabs without a TabContext unlinked (consumer id / aria-controls still apply)', () => {
    render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="A" aria-controls="mine" id="tab-a" />
        <Tab value="b" label="B" />
      </Tabs>,
    )
    const tab = screen.getByRole('tab', { name: 'A' })
    expect(tab).toHaveAttribute('aria-controls', 'mine')
    expect(tab).toHaveAttribute('id', 'tab-a')
    expect(screen.getByRole('tab', { name: 'B' })).not.toHaveAttribute('id')
  })

  it('warns when Tabs inside a TabContext gets its own value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <TabContext defaultValue="a">
        <Tabs aria-label="S" value="b">
          <Tab value="a" label="A" />
          <Tab value="b" label="B" />
        </Tabs>
      </TabContext>,
    )
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'true')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('TabContext'))
    warn.mockRestore()
  })

  it('throws when TabPanel is used outside TabContext', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TabPanel value="a">x</TabPanel>)).toThrow(/TabContext/)
    spy.mockRestore()
  })

  it('has no axe violations', async () => {
    const { container } = render(<Panels />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Tabs container color (#499)', () => {
  it('exposes the --md-tabs-container-color host property', () => {
    render(
      <Tabs value="a" aria-label="S" style={{ ['--md-tabs-container-color' as string]: 'red' }}>
        <Tab value="a" label="A" />
      </Tabs>,
    )
    expect(
      screen.getByRole('tablist').style.getPropertyValue('--md-tabs-container-color'),
    ).toBe('red')
  })
})
