import { cloneElement, isValidElement, type ReactElement } from 'react'

/**
 * Trigger forwarding between wrapper components (Menu, Tooltip) — issue #419.
 *
 * Menu and Tooltip both decorate a single trigger element by cloning it with
 * ARIA attributes and event handlers. When the trigger is itself one of these
 * wrappers (`<Menu trigger={<Tooltip><IconButton/></Tooltip>}>` or
 * `<Tooltip><Menu trigger={…}/></Tooltip>`), cloning the wrapper would put
 * those props on its wrapper `<span>` (or its popup) instead of the real
 * button. A wrapper marked with `TRIGGER_SLOT` instead receives them through
 * the internal `FORWARDED_TRIGGER_PROPS` prop and merges them into its own
 * trigger, so they always land on the real focusable element.
 */

/** Static marker on a forwarding component: the name of its trigger prop. */
export const TRIGGER_SLOT = '__m3TriggerSlot'

/** Internal prop that carries trigger props from an outer wrapper. */
export const FORWARDED_TRIGGER_PROPS = '__m3TriggerProps'

export type TriggerProps = Record<string, unknown>

type AnyElement = ReactElement<Record<string, unknown>>

/** The trigger prop name when `element` is a forwarding wrapper. */
function slotOf(element: AnyElement): string | undefined {
  const type = element.type as unknown
  if (type == null || (typeof type !== 'object' && typeof type !== 'function')) return undefined
  const slot = (type as Record<string, unknown>)[TRIGGER_SLOT]
  return typeof slot === 'string' ? slot : undefined
}

/** Whether `element` forwards trigger props to its own trigger. */
export function isTriggerForwarder(element: AnyElement): boolean {
  return slotOf(element) !== undefined
}

/** The innermost (real) trigger element, unwrapping forwarding wrappers. */
export function innermostTrigger(element: AnyElement): AnyElement {
  let current = element
  for (let depth = 0; depth < 10; depth++) {
    const slot = slotOf(current)
    const next = slot ? current.props[slot] : undefined
    if (!isValidElement(next)) break
    current = next as AnyElement
  }
  return current
}

const isHandlerKey = (key: string) => /^on[A-Z]/.test(key)

/**
 * Merge `extra` onto `base` for the keys of `extra`: handlers are chained
 * (base first), `aria-describedby` is joined, other values are replaced.
 */
export function mergeTriggerProps(base: TriggerProps, extra: TriggerProps): TriggerProps {
  const merged: TriggerProps = {}
  for (const key of Object.keys(extra)) {
    const theirs = base[key]
    const ours = extra[key]
    if (isHandlerKey(key) && typeof theirs === 'function' && typeof ours === 'function') {
      merged[key] = (...args: unknown[]) => {
        theirs(...args)
        ours(...args)
      }
    } else if (key === 'aria-describedby') {
      merged[key] = [theirs, ours].filter(Boolean).join(' ') || undefined
    } else {
      merged[key] = ours
    }
  }
  return merged
}

/**
 * The props the trigger effectively carries before this component adds its
 * own: the element's props (unless it is a forwarder, whose props stay on its
 * wrapper) merged with the props forwarded by an outer wrapper.
 */
export function baseTriggerProps(
  child: AnyElement,
  forwarded: TriggerProps | undefined,
): TriggerProps {
  const own = isTriggerForwarder(child) ? {} : child.props
  return { ...own, ...mergeTriggerProps(own, forwarded ?? {}) }
}

/**
 * Apply `props` (already composed with `baseTriggerProps`) to the trigger:
 * directly on a plain element, or forwarded through a wrapper.
 */
export function applyTriggerProps(
  child: AnyElement,
  forwarded: TriggerProps | undefined,
  props: TriggerProps,
): ReactElement {
  const own = isTriggerForwarder(child) ? {} : child.props
  const all = { ...mergeTriggerProps(own, forwarded ?? {}), ...props }
  return isTriggerForwarder(child)
    ? cloneElement(child, { [FORWARDED_TRIGGER_PROPS]: all })
    : cloneElement(child, all)
}

const TABBABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]'

/**
 * The real focusable trigger inside a wrapper: its first tabbable descendant
 * outside `exclude` (the component's own popup), falling back to the first
 * element child.
 */
export function findTriggerElement(
  wrapper: HTMLElement | null,
  exclude?: HTMLElement | null,
): HTMLElement | null {
  if (!wrapper) return null
  for (const el of Array.from(wrapper.querySelectorAll<HTMLElement>(TABBABLE))) {
    if (exclude?.contains(el)) continue
    if (el.tabIndex < 0) continue
    return el
  }
  return wrapper.firstElementChild as HTMLElement | null
}
