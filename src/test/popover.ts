/**
 * A minimal Popover API stand-in for jsdom (which has none): `showPopover` /
 * `hidePopover` and `:popover-open` matching, recording the top layer in show
 * order (last = topmost) and every `showPopover` call.
 */
export interface PopoverMock {
  /** Elements in the top layer, bottom → top (disconnected ones dropped). */
  topLayer: () => HTMLElement[]
  /** Every `showPopover()` call, in order. */
  showCalls: HTMLElement[]
  restore: () => void
}

type PopoverProto = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

export function installPopoverMock(): PopoverMock {
  const layer: HTMLElement[] = []
  const showCalls: HTMLElement[] = []
  const proto = HTMLElement.prototype as PopoverProto
  const originalMatches = Element.prototype.matches

  proto.showPopover = function (this: HTMLElement) {
    if (!this.hasAttribute('popover')) throw new DOMException('Not a popover', 'NotSupportedError')
    if (layer.includes(this)) throw new DOMException('Already showing', 'InvalidStateError')
    layer.push(this)
    showCalls.push(this)
  }
  proto.hidePopover = function (this: HTMLElement) {
    const index = layer.indexOf(this)
    if (index === -1) throw new DOMException('Not showing', 'InvalidStateError')
    layer.splice(index, 1)
  }
  Element.prototype.matches = function (this: Element, selector: string) {
    if (selector === ':popover-open') return layer.includes(this as HTMLElement)
    return originalMatches.call(this, selector)
  }
  // jsdom's cascade lets its UA `[popover]:not(:popover-open)…{display:none}`
  // out-specify the components' author `display`, which wins in browsers
  // (author origin beats UA). Neutralize it so promoted roots stay visible.
  const style = document.createElement('style')
  style.textContent = '[popover]:not(:popover-open):not(dialog[open]) { display: revert; }'
  document.head.appendChild(style)

  return {
    topLayer: () => layer.filter((el) => el.isConnected),
    showCalls,
    restore: () => {
      Reflect.deleteProperty(proto, 'showPopover')
      Reflect.deleteProperty(proto, 'hidePopover')
      Element.prototype.matches = originalMatches
      style.remove()
    },
  }
}
