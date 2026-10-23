// Where the dropdown list goes (pure, so it can be tested without a browser).
export type Placement = { left: number; width: number; maxHeight: number; top?: number; bottom?: number }

const GAP = 6
const EDGE = 8
const MIN_LIST_WIDTH = 240
const MAX_LIST_WIDTH = 420
const MAX_LIST_HEIGHT = 320

/** Where the list goes: under the trigger if it fits, otherwise above; wide enough for long labels, never off screen. */
export function placeList(trigger: DOMRect, viewport: { width: number; height: number }, wantedHeight = MAX_LIST_HEIGHT): Placement {
  const width = Math.min(Math.max(trigger.width, MIN_LIST_WIDTH), MAX_LIST_WIDTH, viewport.width - EDGE * 2)
  const left = Math.min(Math.max(trigger.left, EDGE), viewport.width - width - EDGE)
  const below = viewport.height - trigger.bottom - GAP - EDGE
  const above = trigger.top - GAP - EDGE
  const useBelow = below >= Math.min(wantedHeight, 200) || below >= above
  const maxHeight = Math.max(120, Math.min(MAX_LIST_HEIGHT, useBelow ? below : above))
  return useBelow
    ? { left, width, maxHeight, top: trigger.bottom + GAP }
    : { left, width, maxHeight, bottom: viewport.height - trigger.top + GAP }
}
