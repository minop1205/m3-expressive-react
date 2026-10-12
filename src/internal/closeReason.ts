import type { SyntheticEvent } from 'react'

/**
 * Why a modal overlay asked to close — the shared `reason` vocabulary of
 * ruling B7 (pickers: `'escapeKeyDown'` / `'backdropClick'`; Snackbar:
 * `'escapeKeyDown'`), extended for the overlays (#407):
 *
 * - `'escapeKeyDown'` — Escape while the overlay is the topmost modal
 * - `'backdropClick'` — a click on the scrim
 * - `'closeButton'` — the overlay's built-in close control (Dialog's
 *   full-screen close button, SideSheet's close button, BottomSheet's drag
 *   handle activated as a button)
 * - `'drag'` — BottomSheet released past the drag / fling threshold
 *
 * Each component narrows this to the reasons it can emit.
 */
export type ModalCloseReason = 'escapeKeyDown' | 'backdropClick' | 'closeButton' | 'drag'

/**
 * The event behind a close request: a React synthetic event for clicks and
 * pointer gestures, the native `KeyboardEvent` for Escape (handled on
 * `window` by `useModal`).
 */
export type ModalCloseEvent = SyntheticEvent | Event
