import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { useFabMorph } from './useFabMorph'
import styles from './Fab.module.css'

/** FAB color set. @default 'primary' */
export type FabColor = 'primary' | 'secondary' | 'tertiary'

/** FAB size. @default 'regular' */
export type FabSize = 'small' | 'regular' | 'medium' | 'large'

export interface FabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'children'> {
  /**
   * The icon displayed in the FAB. An Extended FAB (with `label`) may pass
   * `null` for a label-only FAB.
   */
  icon: ReactNode
  /**
   * Optional label — turns the FAB into an Extended FAB, sized per the MD3
   * Expressive extended FAB: `regular` → small extended (56dp, title-medium),
   * `medium` → medium extended (80dp, title-large), `large` → large extended
   * (96dp, headline-small). There is no 40dp extended FAB — `size="small"`
   * with a label renders the 56dp small extended FAB.
   */
  label?: string
  /**
   * For an Extended FAB (with `label`): `true` shows the label, `false`
   * collapses it to the plain icon-only FAB. Toggling runs the MD3 Expressive
   * spring morph (Compose `ExtendedFloatingActionButton(expanded=)`).
   * Omit for a static Extended FAB. Ignored without `label`, and ignored
   * while `followContainer` drives the morph.
   */
  expanded?: boolean
  /**
   * Follows the `--_t` morph value inherited from a morphing container
   * (e.g. a `NavigationRail` header) instead of running the FAB's own
   * spring, staying exactly in sync with the container's spring. While
   * `true`, `expanded` is ignored. Requires `label`. @default false
   */
  followContainer?: boolean
  /** Color set for the container/content roles. @default 'primary' */
  color?: FabColor
  /**
   * `true` (the default) renders the tonal palette — the `*-container` /
   * `on-*-container` roles (e.g. `primary-container`). `false` renders the
   * high-emphasis accent palette — the base color roles (e.g. `primary` with
   * `on-primary` content). @default true
   */
  tonal?: boolean
  /**
   * Container size: small 40dp (no longer recommended by MD3 — prefer a larger
   * size; it keeps a 48dp touch target), regular 56dp, medium 80dp (the size
   * MD3 recommends most), large 96dp. @default 'regular'
   */
  size?: FabSize
  /**
   * Removes the container shadow. Per the MD3 spec a FAB inside a Navigation
   * rail (or drawer) has no elevation. @default false
   */
  disableElevation?: boolean
}

/**
 * Material Design 3 (Expressive) Floating Action Button.
 *
 * A native `<button>` (MUI-idiomatic `onClick`) supporting 4 sizes
 * (small 40dp, regular 56dp, medium 80dp, large 96dp), 3 color sets
 * (`primary` / `secondary` / `tertiary`, each tonal by default or
 * high-emphasis via `tonal={false}`), and an optional label for the Extended
 * FAB. With `expanded` the Extended FAB morphs
 * between icon-only and icon + label: the label row's measured width
 * (`--_label-total`) scales with the spring-driven `--_ext` while the label
 * cross-fades via `--_label-o` — or, with `followContainer`, both follow a
 * morphing container's inherited `--_t` instead. Elevation lifts on hover
 * (level 3 → 4); the container shape is static (MD3 / Compose define no
 * pressed FAB shape).
 *
 * MD3 advises against disabling a FAB — hide it when its action is
 * unavailable. The native `disabled` attribute is still honored.
 */
export const Fab = forwardRef<HTMLButtonElement, FabProps>(function Fab(
  {
    icon,
    label,
    expanded,
    followContainer = false,
    color = 'primary',
    tonal = true,
    size = 'regular',
    disableElevation = false,
    disabled = false,
    type = 'button',
    className,
    ...rest
  },
  ref,
) {
  const isExtended = label != null
  const hasIcon = icon != null && icon !== false
  const morph = isExtended && (followContainer || expanded !== undefined)

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const setButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // `followContainer` renders the morph DOM but writes no inline
  // --_ext/--_label-o, so the CSS falls back to the inherited --_t (the
  // container's spring).
  useFabMorph(expanded === true, buttonRef, morph && !followContainer)

  // Measure the label row's natural width (gap + label + trailing padding) so
  // the morph can scale it without reflowing the text.
  useLayoutEffect(() => {
    if (!morph) return
    const btn = buttonRef.current
    if (!btn) return
    const measure = () => {
      if (labelRef.current) btn.style.setProperty('--_label-total', `${labelRef.current.offsetWidth}px`)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    if (labelRef.current) ro.observe(labelRef.current)
    return () => ro.disconnect()
  }, [label, morph])

  return (
    <button
      ref={setButtonRef}
      {...rest}
      type={type}
      disabled={disabled}
      data-color={color}
      data-tonal={tonal || undefined}
      data-size={size}
      data-disable-elevation={disableElevation || undefined}
      data-extended={(isExtended && !morph) || undefined}
      data-morph={morph || undefined}
      data-no-icon={(isExtended && !hasIcon) || undefined}
      className={clsx(styles.fab, className)}
    >
      {(hasIcon || !isExtended) && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {isExtended &&
        (morph ? (
          <span className={styles.labelWrap}>
            <span ref={labelRef} className={clsx(styles.label, styles.labelInner)}>
              {label}
            </span>
          </span>
        ) : (
          <span className={styles.label}>{label}</span>
        ))}
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )
})
