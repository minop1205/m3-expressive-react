/**
 * Selector for elements that own their own activation (click / Enter / Space /
 * typing). A clickable container must not also act on events that come from
 * one of these descendants.
 */
const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'textarea',
  'select',
  'label',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[tabindex]',
].join(',')

/**
 * First interactive element nested inside `root` (not `root` itself), or
 * null — used to warn about clickable containers that hold their own
 * controls (axe `nested-interactive`, docs/decisions/phase-b-api.md B5).
 */
export function findNestedInteractive(root: Element): Element | null {
  return root.querySelector(INTERACTIVE_SELECTOR)
}

interface ContainerEvent {
  target: EventTarget | null
  currentTarget: EventTarget | null
}

/**
 * True when `event` originated in an interactive element nested inside the
 * container the handler is attached to (`event.currentTarget`) — i.e. the
 * target, or one of its ancestors below the container, is a button, link,
 * form control, ARIA widget or focusable element.
 *
 * Clickable containers (`Card`, `ListItem`) use it to leave clicks from nested
 * controls to those controls, mirroring Compose where a nested `clickable`
 * consumes its own press (docs/audits/card.md CD1, docs/audits/list.md LS5).
 */
export function isFromNestedInteractive(event: ContainerEvent): boolean {
  const { target, currentTarget } = event
  if (target === currentTarget) return false
  if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
    return false
  }
  const interactive = target.closest(INTERACTIVE_SELECTOR)
  return (
    interactive != null &&
    interactive !== currentTarget &&
    currentTarget.contains(interactive)
  )
}

/**
 * Keyboard activation guard for clickable containers: only act on Enter /
 * Space when the container itself holds focus (Compose `clickable` handles
 * keys only while focused). Key events bubbling up from any descendant —
 * a nested button, a text input receiving a space — are left alone, so the
 * container neither hijacks the key nor `preventDefault`s the typing.
 */
export function isContainerKeyActivation(event: {
  key: string
  target: EventTarget | null
  currentTarget: EventTarget | null
  defaultPrevented: boolean
}): boolean {
  return (
    event.target === event.currentTarget &&
    !event.defaultPrevented &&
    (event.key === 'Enter' || event.key === ' ')
  )
}
