import type { SVGProps } from 'react'

/**
 * Self-contained icons used *inside* library components (chevrons, close,
 * search, etc.). Kept dependency-free on purpose: the library must not force
 * consumers to install an icon package. Demo/story icons instead use Material
 * Symbols (a devDependency) — see any `*.stories.tsx`.
 *
 * Each is a plain `<svg>` that inherits color (`fill: currentColor`) and is
 * sized by its container (override with `width`/`height` props when needed).
 */
type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </Icon>
)

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V10h14zm0-12H5V6h14z" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </Icon>
)

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14" />
  </Icon>
)

/** Material "arrow_back" — mirror it in RTL (it points to the inline start). */
export const ArrowBackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
  </Icon>
)

export const KeyboardIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-9 3h2v2h-2zm0 3h2v2h-2zM8 8h2v2H8zm0 3h2v2H8zm-1 2H5v-2h2zm0-3H5V8h2zm9 7H8v-2h8zm0-4h-2v-2h2zm0-3h-2V8h2zm3 3h-2v-2h2zm0-3h-2V8h2z" />
  </Icon>
)

export const ScheduleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16m.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </Icon>
)

/** Material Symbols `swipe_vertical` (filled) — Compose Icons.Filled.SwipeVertical. */
export const SwipeVerticalIcon = (props: IconProps) => (
  <Icon viewBox="0 -960 960 960" {...props}>
    <path d="M646-126q-20 8-42 7t-42-11L295-254l7-26q5-19 19-31t34-14l99-8-117-320q-5-12 .5-22.5T355-691q12-5 23 .5t16 17.5l99 272 63-23-47-131q-5-12-1.5-27.5T523-603q12-5 22.5.5T561-585l51 141 62-23-37-103q-5-12 .5-23t17.5-16q12-5 22.5.5T693-591l38 104 63-23-11-28q-5-12 .5-23t17.5-16q12-5 23 .5t16 17.5l61 169q23 63-4.5 122.5T806-185l-160 59ZM80-80v-40h93q-62-78-97.5-169T40-480q0-100 35.5-191T173-840H80v-40h180v180h-40v-133q-65 75-102.5 164.5T80-480q0 99 37.5 188.5T220-127v-133h40v180H80Z" />
  </Icon>
)

export const ArrowDropDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m7 10 5 5 5-5z" />
  </Icon>
)

export const EditIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </Icon>
)
