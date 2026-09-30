/**
 * Carousel keyline layout — a faithful port of Jetpack Compose material3
 * `carousel/` (androidx-main): `Arrangement.kt`, `Keylines.kt`,
 * `KeylineList.kt`, `Strategy.kt`, `KeylineSnapPosition.kt` and the
 * `Modifier.carouselItem` placement in `Carousel.kt`.
 *
 * Model (same as Compose): every item is laid out end-to-end at the large
 * ("focal") size, so the native scroll offset equals Compose's pager scroll
 * offset. Each item is then *masked* to the size of an interpolated keyline
 * (a rectangular clip centred on the item — content is never scaled) and
 * translated so the masked items pin together with `itemSpacing` between them.
 *
 * All values are pixels in the inline direction measured from the carousel's
 * inline-start edge (Compose negates only `translationX` for RTL; here the
 * consumer applies the translation with logical CSS properties).
 */

/** `CarouselDefaults.MinSmallItemSize` (40dp). */
export const MIN_SMALL_ITEM_SIZE = 40
/** `CarouselDefaults.MaxSmallItemSize` (56dp). */
export const MAX_SMALL_ITEM_SIZE = 56
/** `CarouselDefaults.AnchorSize` (10dp). */
export const ANCHOR_SIZE = 10
/** `Arrangement.MediumItemFlexPercentage`. */
const MEDIUM_ITEM_FLEX_PERCENTAGE = 0.1

const lerpValue = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

// ---------------------------------------------------------------------------
// Arrangement (Arrangement.kt)
// ---------------------------------------------------------------------------

export interface Arrangement {
  priority: number
  smallSize: number
  smallCount: number
  mediumSize: number
  mediumCount: number
  largeSize: number
  largeCount: number
}

const arrangementItemCount = (a: Arrangement) => a.largeCount + a.mediumCount + a.smallCount

function arrangementIsValid(a: Arrangement): boolean {
  if (a.largeCount > 0 && a.smallCount > 0 && a.mediumCount > 0) {
    return a.largeSize > a.mediumSize && a.mediumSize > a.smallSize
  } else if (a.largeCount > 0 && a.smallCount > 0) {
    return a.largeSize > a.smallSize
  }
  return true
}

function arrangementCost(a: Arrangement, targetLargeSize: number): number {
  if (!arrangementIsValid(a)) return Number.MAX_VALUE
  return Math.abs(targetLargeSize - a.largeSize) * a.priority
}

function calculateLargeSize(
  availableSpace: number,
  smallCount: number,
  smallSize: number,
  mediumCount: number,
  largeCount: number,
): number {
  return (
    (availableSpace - (smallCount + mediumCount / 2) * smallSize) /
    (largeCount + mediumCount / 2)
  )
}

function fitArrangement(
  priority: number,
  availableSpace: number,
  itemSpacing: number,
  smallCount: number,
  smallSize: number,
  minSmallSize: number,
  maxSmallSize: number,
  mediumCount: number,
  mediumSize: number,
  largeCount: number,
  largeSize: number,
): Arrangement {
  const totalItemCount = largeCount + mediumCount + smallCount
  const availableSpaceWithoutSpacing = availableSpace - (totalItemCount - 1) * itemSpacing
  let arrangedSmallSize = clamp(smallSize, minSmallSize, maxSmallSize)
  let arrangedMediumSize = mediumSize
  let arrangedLargeSize = largeSize

  const totalSpaceTaken =
    arrangedLargeSize * largeCount + arrangedMediumSize * mediumCount + arrangedSmallSize * smallCount
  const delta = availableSpaceWithoutSpacing - totalSpaceTaken
  if (smallCount > 0 && delta > 0) {
    arrangedSmallSize += Math.min(delta / smallCount, maxSmallSize - arrangedSmallSize)
  } else if (smallCount > 0 && delta < 0) {
    arrangedSmallSize += Math.max(delta / smallCount, minSmallSize - arrangedSmallSize)
  }

  arrangedSmallSize = smallCount > 0 ? arrangedSmallSize : 0
  arrangedLargeSize = calculateLargeSize(
    availableSpaceWithoutSpacing,
    smallCount,
    arrangedSmallSize,
    mediumCount,
    largeCount,
  )
  arrangedMediumSize = (arrangedLargeSize + arrangedSmallSize) / 2

  if (mediumCount > 0 && arrangedLargeSize !== largeSize) {
    const targetAdjustment = (largeSize - arrangedLargeSize) * largeCount
    const availableMediumFlex = arrangedMediumSize * MEDIUM_ITEM_FLEX_PERCENTAGE * mediumCount
    const distribute = Math.min(Math.abs(targetAdjustment), availableMediumFlex)
    if (targetAdjustment > 0) {
      arrangedMediumSize -= distribute / mediumCount
      arrangedLargeSize += distribute / largeCount
    } else {
      arrangedMediumSize += distribute / mediumCount
      arrangedLargeSize -= distribute / largeCount
    }
  }

  return {
    priority,
    smallSize: arrangedSmallSize,
    smallCount,
    mediumSize: arrangedMediumSize,
    mediumCount,
    largeSize: arrangedLargeSize,
    largeCount,
  }
}

export function findLowestCostArrangement(args: {
  availableSpace: number
  itemSpacing: number
  targetSmallSize: number
  minSmallSize: number
  maxSmallSize: number
  smallCounts: number[]
  targetMediumSize: number
  mediumCounts: number[]
  targetLargeSize: number
  largeCounts: number[]
}): Arrangement | null {
  let lowest: Arrangement | null = null
  let priority = 1
  for (const largeCount of args.largeCounts) {
    for (const mediumCount of args.mediumCounts) {
      for (const smallCount of args.smallCounts) {
        const arrangement = fitArrangement(
          priority,
          args.availableSpace,
          args.itemSpacing,
          smallCount,
          args.targetSmallSize,
          args.minSmallSize,
          args.maxSmallSize,
          mediumCount,
          args.targetMediumSize,
          largeCount,
          args.targetLargeSize,
        )
        if (
          lowest == null ||
          arrangementCost(arrangement, args.targetLargeSize) <
            arrangementCost(lowest, args.targetLargeSize)
        ) {
          lowest = arrangement
          if (arrangementCost(lowest, args.targetLargeSize) === 0) return lowest
        }
        priority++
      }
    }
  }
  return lowest
}

// ---------------------------------------------------------------------------
// Keyline / KeylineList (KeylineList.kt)
// ---------------------------------------------------------------------------

export interface Keyline {
  size: number
  offset: number
  unadjustedOffset: number
  isFocal: boolean
  isAnchor: boolean
  isPivot: boolean
  cutoff: number
}

export type KeylineList = Keyline[]

type Alignment = 'start' | 'center'
interface TmpKeyline {
  size: number
  isAnchor: boolean
}

const firstFocalIndex = (k: KeylineList) => k.findIndex((x) => x.isFocal)
const lastFocalIndex = (k: KeylineList) => {
  for (let i = k.length - 1; i >= 0; i--) if (k[i].isFocal) return i
  return -1
}
const firstNonAnchorIndex = (k: KeylineList) => k.findIndex((x) => !x.isAnchor)
const lastNonAnchorIndex = (k: KeylineList) => {
  for (let i = k.length - 1; i >= 0; i--) if (!k[i].isAnchor) return i
  return -1
}
const pivotIndexOf = (k: KeylineList) => k.findIndex((x) => x.isPivot)
export const focalCount = (k: KeylineList) => lastFocalIndex(k) - firstFocalIndex(k) + 1

function isCutoffLeft(size: number, offset: number) {
  return offset - size / 2 < 0 && offset + size / 2 > 0
}
function isCutoffRight(size: number, offset: number, mainAxisSize: number) {
  return offset - size / 2 < mainAxisSize && offset + size / 2 > mainAxisSize
}

/** Focal range of a tmp list: the first run of the largest non-anchor size. */
function focalRange(tmp: TmpKeyline[]): [number, number, number] {
  let first = -1
  let focalSize = 0
  tmp.forEach((k, i) => {
    if (!k.isAnchor && k.size > focalSize) {
      first = i
      focalSize = k.size
    }
  })
  if (first < 0) return [-1, -1, 0]
  let last = first
  while (last < tmp.length - 1 && tmp[last + 1].size === focalSize) last++
  return [first, last, focalSize]
}

function createKeylinesWithPivot(
  pivotIndex: number,
  pivotOffset: number,
  firstFocal: number,
  lastFocal: number,
  itemMainAxisSize: number,
  mainAxisSize: number,
  itemSpacing: number,
  tmp: TmpKeyline[],
): KeylineList {
  if (tmp.length === 0 || pivotIndex < 0 || pivotIndex >= tmp.length) return []
  const pivot = tmp[pivotIndex]
  const keylines: KeylineList = []
  const pivotCutoff = isCutoffLeft(pivot.size, pivotOffset)
    ? pivotOffset - pivot.size / 2
    : isCutoffRight(pivot.size, pivotOffset, mainAxisSize)
      ? pivotOffset + pivot.size / 2 - mainAxisSize
      : 0
  keylines.push({
    size: pivot.size,
    offset: pivotOffset,
    unadjustedOffset: pivotOffset,
    isFocal: pivotIndex >= firstFocal && pivotIndex <= lastFocal,
    isAnchor: pivot.isAnchor,
    isPivot: true,
    cutoff: pivotCutoff,
  })

  let offset = pivotOffset - itemMainAxisSize / 2 - itemSpacing
  let unadjustedOffset = pivotOffset - itemMainAxisSize / 2 - itemSpacing
  for (let i = pivotIndex - 1; i >= 0; i--) {
    const t = tmp[i]
    const tOffset = offset - t.size / 2
    const tUnadjusted = unadjustedOffset - itemMainAxisSize / 2
    const cutoff = isCutoffLeft(t.size, tOffset) ? Math.abs(tOffset - t.size / 2) : 0
    keylines.unshift({
      size: t.size,
      offset: tOffset,
      unadjustedOffset: tUnadjusted,
      isFocal: i >= firstFocal && i <= lastFocal,
      isAnchor: t.isAnchor,
      isPivot: false,
      cutoff,
    })
    offset -= t.size + itemSpacing
    unadjustedOffset -= itemMainAxisSize + itemSpacing
  }

  offset = pivotOffset + itemMainAxisSize / 2 + itemSpacing
  unadjustedOffset = pivotOffset + itemMainAxisSize / 2 + itemSpacing
  for (let i = pivotIndex + 1; i < tmp.length; i++) {
    const t = tmp[i]
    const tOffset = offset + t.size / 2
    const tUnadjusted = unadjustedOffset + itemMainAxisSize / 2
    const cutoff = isCutoffRight(t.size, tOffset, mainAxisSize)
      ? tOffset + t.size / 2 - mainAxisSize
      : 0
    keylines.push({
      size: t.size,
      offset: tOffset,
      unadjustedOffset: tUnadjusted,
      isFocal: i >= firstFocal && i <= lastFocal,
      isAnchor: t.isAnchor,
      isPivot: false,
      cutoff,
    })
    offset += t.size + itemSpacing
    unadjustedOffset += itemMainAxisSize + itemSpacing
  }
  return keylines
}

function keylineListWithAlignment(
  mainAxisSize: number,
  itemSpacing: number,
  alignment: Alignment,
  tmp: TmpKeyline[],
): KeylineList {
  const [first, last, focalSize] = focalRange(tmp)
  const focalItemCount = last - first
  let pivotOffset: number
  if (alignment === 'center') {
    const itemSpacingSplit = itemSpacing === 0 || focalItemCount % 2 === 0 ? 0 : itemSpacing / 2
    const itemSpaceCounts = Math.trunc(focalItemCount / 2) * itemSpacing
    pivotOffset =
      mainAxisSize / 2 - (focalSize / 2) * focalItemCount - itemSpacingSplit - itemSpaceCounts
  } else {
    pivotOffset = focalSize / 2
  }
  return createKeylinesWithPivot(
    first,
    pivotOffset,
    first,
    last,
    focalSize,
    mainAxisSize,
    itemSpacing,
    tmp,
  )
}

function keylineListWithPivot(
  mainAxisSize: number,
  itemSpacing: number,
  pivotIndex: number,
  pivotOffset: number,
  tmp: TmpKeyline[],
): KeylineList {
  const [first, last, focalSize] = focalRange(tmp)
  return createKeylinesWithPivot(
    pivotIndex,
    pivotOffset,
    first,
    last,
    focalSize,
    mainAxisSize,
    itemSpacing,
    tmp,
  )
}

function createAlignedKeylineList(
  mainAxisSize: number,
  itemSpacing: number,
  leftAnchorSize: number,
  rightAnchorSize: number,
  a: Arrangement,
  alignment: Alignment,
): KeylineList {
  const tmp: TmpKeyline[] = [{ size: leftAnchorSize, isAnchor: true }]
  const push = (n: number, size: number) => {
    for (let i = 0; i < n; i++) tmp.push({ size, isAnchor: false })
  }
  if (alignment === 'center') {
    push(Math.trunc(a.smallCount / 2), a.smallSize)
    push(Math.trunc(a.mediumCount / 2), a.mediumSize)
    push(a.largeCount, a.largeSize)
    push(Math.trunc(a.mediumCount / 2), a.mediumSize)
    push(Math.trunc(a.smallCount / 2), a.smallSize)
  } else {
    push(a.largeCount, a.largeSize)
    push(a.mediumCount, a.mediumSize)
    push(a.smallCount, a.smallSize)
  }
  tmp.push({ size: rightAnchorSize, isAnchor: true })
  return keylineListWithAlignment(mainAxisSize, itemSpacing, alignment, tmp)
}

// ---------------------------------------------------------------------------
// Keyline lists per layout (Keylines.kt)
// ---------------------------------------------------------------------------

/** `multiBrowseKeylineList` — large + medium + small (40–56dp). */
export function multiBrowseKeylineList(
  mainAxisSize: number,
  preferredItemSize: number,
  itemSpacing: number,
  itemCount: number,
  minSmallItemSize = MIN_SMALL_ITEM_SIZE,
  maxSmallItemSize = MAX_SMALL_ITEM_SIZE,
): KeylineList {
  if (mainAxisSize <= 0 || preferredItemSize <= 0) return []

  let smallCounts = [1]
  const mediumCounts = [1, 0]
  const targetLargeSize = Math.min(preferredItemSize, mainAxisSize)
  const targetSmallSize = clamp(targetLargeSize / 3, minSmallItemSize, maxSmallItemSize)
  const targetMediumSize = (targetLargeSize + targetSmallSize) / 2

  if (mainAxisSize < minSmallItemSize * 2) smallCounts = [0]

  const minAvailableLargeSpace =
    mainAxisSize -
    targetMediumSize * Math.max(...mediumCounts) -
    maxSmallItemSize * Math.max(...smallCounts)
  const minLargeCount = Math.max(1, Math.floor(minAvailableLargeSpace / targetLargeSize))
  const maxLargeCount = Math.ceil(mainAxisSize / targetLargeSize)
  const largeCounts = Array.from(
    { length: maxLargeCount - minLargeCount + 1 },
    (_, i) => maxLargeCount - i,
  )

  const find = (small: number[], medium: number[]) =>
    findLowestCostArrangement({
      availableSpace: mainAxisSize,
      itemSpacing,
      targetSmallSize,
      minSmallSize: minSmallItemSize,
      maxSmallSize: maxSmallItemSize,
      smallCounts: small,
      targetMediumSize,
      mediumCounts: medium,
      targetLargeSize,
      largeCounts,
    })

  let arrangement = find(smallCounts, mediumCounts)
  if (arrangement != null && arrangementItemCount(arrangement) > itemCount) {
    let surplus = arrangementItemCount(arrangement) - itemCount
    let smallCount = arrangement.smallCount
    let mediumCount = arrangement.mediumCount
    while (surplus > 0) {
      if (smallCount > 0) smallCount -= 1
      else if (mediumCount > 1) mediumCount -= 1
      surplus -= 1
    }
    arrangement = find([smallCount], [mediumCount])
  }
  if (arrangement == null) return []

  return createAlignedKeylineList(
    mainAxisSize,
    itemSpacing,
    ANCHOR_SIZE,
    ANCHOR_SIZE,
    arrangement,
    'start',
  )
}

/**
 * `heroKeylineList` — large item(s) without medium items; with `isCentered`
 * one small item on each side (Compose `HorizontalCenteredHeroCarousel`).
 * `preferredItemSize` `undefined` fills the viewport with one large item.
 */
export function heroKeylineList(
  mainAxisSize: number,
  preferredItemSize: number | undefined,
  itemSpacing: number,
  itemCount: number,
  isCentered = true,
  minSmallItemSize = MIN_SMALL_ITEM_SIZE,
  maxSmallItemSize = MAX_SMALL_ITEM_SIZE,
): KeylineList {
  if (mainAxisSize <= 0) return []
  const shouldCenter = isCentered && itemCount >= 3
  let smallCounts = itemCount <= 1 ? [0] : shouldCenter ? [2] : [1]

  const targetLargeSize = Math.min(preferredItemSize ?? mainAxisSize, mainAxisSize)
  const targetSmallSize = clamp(targetLargeSize / 3, minSmallItemSize, maxSmallItemSize)

  const fullscreenThreshold =
    minSmallItemSize * Math.max(...smallCounts) + minSmallItemSize * 1.25
  if (mainAxisSize < fullscreenThreshold) smallCounts = [0]

  const minAvailableLargeSpace = mainAxisSize - minSmallItemSize * Math.max(...smallCounts)
  const minLargeCount = Math.max(1, Math.floor(minAvailableLargeSpace / targetLargeSize))
  const maxLargeCount = Math.ceil(mainAxisSize / targetLargeSize)
  const largeCounts = Array.from(
    { length: maxLargeCount - minLargeCount + 1 },
    (_, i) => maxLargeCount - i,
  )
  const arrangement = findLowestCostArrangement({
    availableSpace: mainAxisSize,
    itemSpacing,
    targetSmallSize,
    minSmallSize: minSmallItemSize,
    maxSmallSize: maxSmallItemSize,
    smallCounts,
    targetMediumSize: 0,
    mediumCounts: [0],
    targetLargeSize,
    largeCounts,
  })
  if (arrangement == null) return []

  const centered = shouldCenter && itemCount >= arrangementItemCount(arrangement)
  return createAlignedKeylineList(
    mainAxisSize,
    itemSpacing,
    ANCHOR_SIZE,
    ANCHOR_SIZE,
    arrangement,
    centered ? 'center' : 'start',
  )
}

// ---------------------------------------------------------------------------
// Strategy (Strategy.kt)
// ---------------------------------------------------------------------------

export interface Strategy {
  defaultKeylines: KeylineList
  startKeylineSteps: KeylineList[]
  endKeylineSteps: KeylineList[]
  availableSpace: number
  itemSpacing: number
  /** Size of focal (fully unmasked) items — every item is laid out at this size. */
  itemMainAxisSize: number
  startShiftDistance: number
  endShiftDistance: number
  startShiftPoints: number[]
  endShiftPoints: number[]
}

function isFirstFocalItemAtStartOfContainer(k: KeylineList) {
  const ff = k[firstFocalIndex(k)]
  return ff.offset - ff.size / 2 >= 0 && firstFocalIndex(k) === firstNonAnchorIndex(k)
}

function isLastFocalItemAtEndOfContainer(k: KeylineList, mainAxisSize: number) {
  const lf = k[lastFocalIndex(k)]
  return lf.offset + lf.size / 2 <= mainAxisSize && lastFocalIndex(k) === lastNonAnchorIndex(k)
}

function firstIndexAfterFocalRangeWithSize(k: KeylineList, size: number) {
  for (let i = lastFocalIndex(k); i <= k.length - 1; i++) if (k[i].size === size) return i
  return k.length - 1
}

function lastIndexBeforeFocalRangeWithSize(k: KeylineList, size: number) {
  for (let i = firstFocalIndex(k) - 1; i >= 0; i--) if (k[i].size === size) return i
  return 0
}

function createShiftedKeylineListForContentPadding(
  from: KeylineList,
  mainAxisSize: number,
  itemSpacing: number,
  contentPadding: number,
  pivot: Keyline,
  pivotIndex: number,
): KeylineList {
  const nonAnchorCount = from.filter((k) => !k.isAnchor).length
  const sizeReduction = contentPadding / nonAnchorCount
  const shifted = keylineListWithPivot(
    mainAxisSize,
    itemSpacing,
    pivotIndex,
    pivot.offset - sizeReduction / 2 + contentPadding,
    from.map((k) => ({ size: k.size - Math.abs(sizeReduction), isAnchor: k.isAnchor })),
  )
  return shifted.map((k, i) => ({ ...k, unadjustedOffset: from[i].unadjustedOffset }))
}

function moveKeylineAndCreateShiftedKeylineList(
  from: KeylineList,
  srcIndex: number,
  dstIndex: number,
  mainAxisSize: number,
  itemSpacing: number,
): KeylineList {
  const pivotDir = srcIndex > dstIndex ? 1 : -1
  const pivotDelta = (from[srcIndex].size - from[srcIndex].cutoff + itemSpacing) * pivotDir
  const pivotIndex = pivotIndexOf(from)
  const newPivotIndex = pivotIndex + pivotDir
  const newPivotOffset = from[pivotIndex].offset + pivotDelta
  const moved = from.slice()
  const [k] = moved.splice(srcIndex, 1)
  moved.splice(dstIndex, 0, k)
  return keylineListWithPivot(
    mainAxisSize,
    itemSpacing,
    newPivotIndex,
    newPivotOffset,
    moved.map((x) => ({ size: x.size, isAnchor: x.isAnchor })),
  )
}

function getStartKeylineSteps(
  d: KeylineList,
  mainAxisSize: number,
  itemSpacing: number,
  beforeContentPadding: number,
): KeylineList[] {
  if (d.length === 0) return []
  const steps: KeylineList[] = [d]
  if (isFirstFocalItemAtStartOfContainer(d)) {
    if (beforeContentPadding !== 0) {
      steps.push(
        createShiftedKeylineListForContentPadding(
          d,
          mainAxisSize,
          itemSpacing,
          beforeContentPadding,
          d[firstFocalIndex(d)],
          firstFocalIndex(d),
        ),
      )
    }
    return steps
  }
  const startIndex = firstNonAnchorIndex(d)
  const endIndex = firstFocalIndex(d)
  const numberOfSteps = endIndex - startIndex
  if (numberOfSteps <= 0 && d[firstFocalIndex(d)].cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(d, 0, 0, mainAxisSize, itemSpacing))
    return steps
  }
  for (let i = 0; i < numberOfSteps; i++) {
    const prev = steps[steps.length - 1]
    const originalItemIndex = startIndex + i
    let dstIndex = d.length - 1
    if (originalItemIndex > 0) {
      const neighborBeforeSize = d[originalItemIndex - 1].size
      dstIndex = firstIndexAfterFocalRangeWithSize(prev, neighborBeforeSize) - 1
    }
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(
        prev,
        firstNonAnchorIndex(d),
        dstIndex,
        mainAxisSize,
        itemSpacing,
      ),
    )
  }
  if (beforeContentPadding !== 0) {
    const last = steps[steps.length - 1]
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(
      last,
      mainAxisSize,
      itemSpacing,
      beforeContentPadding,
      last[firstFocalIndex(last)],
      firstFocalIndex(last),
    )
  }
  return steps
}

function getEndKeylineSteps(
  d: KeylineList,
  mainAxisSize: number,
  itemSpacing: number,
  afterContentPadding: number,
): KeylineList[] {
  if (d.length === 0) return []
  const steps: KeylineList[] = [d]
  if (isLastFocalItemAtEndOfContainer(d, mainAxisSize)) {
    if (afterContentPadding !== 0) {
      steps.push(
        createShiftedKeylineListForContentPadding(
          d,
          mainAxisSize,
          itemSpacing,
          -afterContentPadding,
          d[lastFocalIndex(d)],
          lastFocalIndex(d),
        ),
      )
    }
    return steps
  }
  const startIndex = lastFocalIndex(d)
  const endIndex = lastNonAnchorIndex(d)
  const numberOfSteps = endIndex - startIndex
  if (numberOfSteps <= 0 && d[lastFocalIndex(d)].cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(d, 0, 0, mainAxisSize, itemSpacing))
    return steps
  }
  for (let i = 0; i < numberOfSteps; i++) {
    const prev = steps[steps.length - 1]
    const originalItemIndex = endIndex - i
    let dstIndex = 0
    if (originalItemIndex < d.length - 1) {
      const neighborAfterSize = d[originalItemIndex + 1].size
      dstIndex = lastIndexBeforeFocalRangeWithSize(prev, neighborAfterSize) + 1
    }
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(
        prev,
        lastNonAnchorIndex(d),
        dstIndex,
        mainAxisSize,
        itemSpacing,
      ),
    )
  }
  if (afterContentPadding !== 0) {
    const last = steps[steps.length - 1]
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(
      last,
      mainAxisSize,
      itemSpacing,
      -afterContentPadding,
      last[lastFocalIndex(last)],
      lastFocalIndex(last),
    )
  }
  return steps
}

function getStepInterpolationPoints(
  totalShiftDistance: number,
  steps: KeylineList[],
  isShiftingLeft: boolean,
): number[] {
  const points = [0]
  if (totalShiftDistance === 0 || steps.length === 0) return points
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]
    const curr = steps[i]
    const distanceShifted = isShiftingLeft
      ? curr[0].unadjustedOffset - prev[0].unadjustedOffset
      : prev[prev.length - 1].unadjustedOffset - curr[curr.length - 1].unadjustedOffset
    const stepPercentage = distanceShifted / totalShiftDistance
    points.push(i === steps.length - 1 ? 1 : points[i - 1] + stepPercentage)
  }
  return points
}

export function createStrategy(
  defaultKeylines: KeylineList,
  availableSpace: number,
  itemSpacing: number,
  beforeContentPadding: number,
  afterContentPadding: number,
): Strategy | null {
  if (defaultKeylines.length === 0 || availableSpace <= 0) return null
  const itemMainAxisSize = defaultKeylines[firstFocalIndex(defaultKeylines)]?.size ?? 0
  if (!(itemMainAxisSize > 0)) return null
  const startKeylineSteps = getStartKeylineSteps(
    defaultKeylines,
    availableSpace,
    itemSpacing,
    beforeContentPadding,
  )
  const endKeylineSteps = getEndKeylineSteps(
    defaultKeylines,
    availableSpace,
    itemSpacing,
    afterContentPadding,
  )
  const startShiftDistance =
    startKeylineSteps.length === 0
      ? 0
      : Math.max(
          startKeylineSteps[startKeylineSteps.length - 1][0].unadjustedOffset -
            startKeylineSteps[0][0].unadjustedOffset,
          beforeContentPadding,
        )
  const lastOf = (k: KeylineList) => k[k.length - 1]
  const endShiftDistance =
    endKeylineSteps.length === 0
      ? 0
      : Math.max(
          lastOf(endKeylineSteps[0]).unadjustedOffset -
            lastOf(endKeylineSteps[endKeylineSteps.length - 1]).unadjustedOffset,
          afterContentPadding,
        )
  return {
    defaultKeylines,
    startKeylineSteps,
    endKeylineSteps,
    availableSpace,
    itemSpacing,
    itemMainAxisSize,
    startShiftDistance,
    endShiftDistance,
    startShiftPoints: getStepInterpolationPoints(startShiftDistance, startKeylineSteps, true),
    endShiftPoints: getStepInterpolationPoints(endShiftDistance, endKeylineSteps, false),
  }
}

function lerpKeyline(a: Keyline, b: Keyline, t: number): Keyline {
  return {
    size: lerpValue(a.size, b.size, t),
    offset: lerpValue(a.offset, b.offset, t),
    unadjustedOffset: lerpValue(a.unadjustedOffset, b.unadjustedOffset, t),
    isFocal: t < 0.5 ? a.isFocal : b.isFocal,
    isAnchor: t < 0.5 ? a.isAnchor : b.isAnchor,
    isPivot: t < 0.5 ? a.isPivot : b.isPivot,
    cutoff: lerpValue(a.cutoff, b.cutoff, t),
  }
}

const lerpKeylineList = (a: KeylineList, b: KeylineList, t: number): KeylineList =>
  a.map((k, i) => lerpKeyline(k, b[i], t))

function lerpRange(outMin: number, outMax: number, inMin: number, inMax: number, v: number) {
  if (v <= inMin) return outMin
  if (v >= inMax) return outMax
  return lerpValue(outMin, outMax, (v - inMin) / (inMax - inMin))
}

/** `Strategy.getKeylineListForScrollOffset`. */
export function getKeylineListForScrollOffset(
  s: Strategy,
  scrollOffset: number,
  maxScrollOffset: number,
): KeylineList {
  const positive = Math.max(0, scrollOffset)
  const startShiftOffset = s.startShiftDistance
  const endShiftOffset = Math.max(0, maxScrollOffset - s.endShiftDistance)
  if (positive >= startShiftOffset && positive <= endShiftOffset) return s.defaultKeylines

  let interpolation = lerpRange(1, 0, 0, startShiftOffset, positive)
  let shiftPoints = s.startShiftPoints
  let steps = s.startKeylineSteps
  if (positive > endShiftOffset) {
    interpolation = lerpRange(0, 1, endShiftOffset, maxScrollOffset, positive)
    shiftPoints = s.endShiftPoints
    steps = s.endKeylineSteps
    if (endShiftOffset < 0.01 && s.startKeylineSteps.length === 2 && s.endKeylineSteps.length === 2) {
      steps = [
        s.startKeylineSteps[s.startKeylineSteps.length - 1],
        s.endKeylineSteps[s.endKeylineSteps.length - 1],
      ]
    }
  }
  if (steps.length < 2) return steps[0] ?? s.defaultKeylines

  let fromStep = 0
  let toStep = 0
  let stepped = 0
  let lower = shiftPoints[0]
  for (let i = 1; i < steps.length; i++) {
    const upper = shiftPoints[i]
    if (interpolation <= upper) {
      fromStep = i - 1
      toStep = i
      stepped = lerpRange(0, 1, lower, upper, interpolation)
      break
    }
    lower = upper
  }
  return lerpKeylineList(steps[fromStep], steps[toStep], stepped)
}

/** Compose `calculateMaxScrollOffset`. */
export function maxScrollOffset(s: Strategy, itemCount: number): number {
  const total = s.itemMainAxisSize * itemCount + s.itemSpacing * (itemCount - 1)
  return Math.max(0, total - s.availableSpace)
}

/**
 * `getSnapPositionOffset` — distance from the carousel's start edge at which
 * the item's (unmasked) start edge rests when the item is snapped.
 */
export function snapPositionOffset(s: Strategy, itemIndex: number, itemCount: number): number {
  const d = s.defaultKeylines
  let offset = Math.round(d[firstFocalIndex(d)].unadjustedOffset - s.itemMainAxisSize / 2)
  const startLast = s.startKeylineSteps.length - 1
  if (itemIndex <= startLast) {
    const step = s.startKeylineSteps[clamp(startLast - itemIndex, 0, startLast)]
    offset = Math.round(step[firstFocalIndex(step)].unadjustedOffset - s.itemMainAxisSize / 2)
  }
  const endLast = s.endKeylineSteps.length - 1
  const lastItemIndex = itemCount - 1
  if (itemIndex >= lastItemIndex - endLast && itemCount > focalCount(d)) {
    const step = s.endKeylineSteps[clamp(endLast - (lastItemIndex - itemIndex), 0, endLast)]
    offset = Math.round(step[lastFocalIndex(step)].unadjustedOffset - s.itemMainAxisSize / 2)
  }
  return offset
}

/** The scroll offset at which `itemIndex` is snapped (clamped to the scroll range). */
export function snapScrollOffset(s: Strategy, itemIndex: number, itemCount: number): number {
  const raw =
    itemIndex * (s.itemMainAxisSize + s.itemSpacing) - snapPositionOffset(s, itemIndex, itemCount)
  return clamp(raw, 0, maxScrollOffset(s, itemCount))
}

export interface ItemMask {
  /** Visible (masked) size of the item. */
  size: number
  /** Translation of the whole (unmasked) item along the inline axis. */
  translation: number
  /** Start of the visible mask relative to the item's translated start edge. */
  maskStart: number
  /** Whether the item sits on a focal keyline (fully unmasked). */
  isFocal: boolean
}

/** `Modifier.carouselItem` placement for one item at a given scroll offset. */
export function itemMask(
  s: Strategy,
  keylines: KeylineList,
  index: number,
  scrollOffset: number,
): ItemMask {
  const L = s.itemMainAxisSize
  const unadjustedCenter = index * (L + s.itemSpacing) + L / 2 - scrollOffset

  let before = keylines[0]
  for (let i = keylines.length - 1; i >= 0; i--) {
    if (keylines[i].unadjustedOffset < unadjustedCenter) {
      before = keylines[i]
      break
    }
  }
  const after =
    keylines.find((k) => k.unadjustedOffset >= unadjustedCenter) ?? keylines[keylines.length - 1]
  const progress =
    before === after
      ? 1
      : (unadjustedCenter - before.unadjustedOffset) /
        (after.unadjustedOffset - before.unadjustedOffset)
  const k = lerpKeyline(before, after, progress)

  let translation = k.offset - unadjustedCenter
  if (before === after) {
    translation += (unadjustedCenter - k.unadjustedOffset) / k.size
  }
  const size = Math.min(L, Math.max(0, k.size))
  return { size, translation, maskStart: (L - size) / 2, isFocal: k.isFocal }
}

export interface ItemBox {
  /** Visible item start, relative to the item's layout slot. */
  start: number
  /** Visible item size (0 when fully outside the viewport). */
  size: number
  /** Start of the unmasked content relative to the visible item start. */
  contentStart: number
  /** Whether the item is fully unmasked and fully inside the viewport. */
  isFullyShown: boolean
}

/**
 * The visible box of item `index` at `scrollOffset`: the keyline mask
 * ([itemMask]) additionally clipped to the viewport `[0, availableSpace]` —
 * Compose's Pager clips its items to the carousel bounds (here: the content
 * box inside the 16dp padding).
 */
export function itemBox(
  s: Strategy,
  keylines: KeylineList,
  index: number,
  scrollOffset: number,
): ItemBox {
  const m = itemMask(s, keylines, index, scrollOffset)
  const slotStart = index * (s.itemMainAxisSize + s.itemSpacing) - scrollOffset
  const contentAbs = slotStart + m.translation
  const maskStart = contentAbs + m.maskStart
  const visStart = clamp(maskStart, 0, s.availableSpace)
  const visEnd = Math.min(maskStart + m.size, s.availableSpace)
  const size = Math.max(0, visEnd - visStart)
  return {
    start: visStart - slotStart,
    size,
    contentStart: contentAbs - visStart,
    isFullyShown: size >= s.itemMainAxisSize - 0.5,
  }
}

/**
 * The scroll offset that brings item `index` fully into a focal (large)
 * position with the least scrolling — among the snap positions, as the
 * carousel only rests there — or `null` when it is already fully shown.
 */
export function revealScrollOffset(
  s: Strategy,
  index: number,
  itemCount: number,
  scrollOffset: number,
): number | null {
  const max = maxScrollOffset(s, itemCount)
  const shownAt = (offset: number) =>
    itemBox(s, getKeylineListForScrollOffset(s, offset, max), index, offset).isFullyShown
  if (shownAt(scrollOffset)) return null
  let best: number | null = null
  for (let i = 0; i < itemCount; i++) {
    const candidate = snapScrollOffset(s, i, itemCount)
    if (best != null && Math.abs(candidate - scrollOffset) >= Math.abs(best - scrollOffset)) continue
    if (shownAt(candidate)) best = candidate
  }
  return best
}
