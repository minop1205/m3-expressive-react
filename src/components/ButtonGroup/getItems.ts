/**
 * The group's items: direct `<button>` children, or buttons one wrapper deep
 * (e.g. a Tooltip's wrapper span). Shared by keyboard navigation, selection
 * and the press-widen interaction; ButtonGroup.module.css matches the same set.
 */
export function getItems(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(':scope > button, :scope > :not(button) > button'),
  )
}
