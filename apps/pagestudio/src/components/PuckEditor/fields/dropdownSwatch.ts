// Which colour (if any) a dropdown option should show next to its label. Pure, so it can be tested without a browser.

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FUNCTIONAL = /^(?:rgb|rgba|hsl|hsla)\(\s*[-\d.%\s,/]+\)$/i

/** True for a colour a browser understands directly: #rgb, #rrggbb (with or without alpha), rgb()/hsl(). */
export const isCssColor = (value: unknown): value is string =>
  typeof value === 'string' && (HEX.test(value.trim()) || FUNCTIONAL.test(value.trim()))

export type SwatchOption = { label: string; value: unknown; swatch?: string }

const lookup = (colors: Record<string, string>, key: string): string | undefined => {
  if (!key) return undefined
  if (colors[key]) return colors[key]
  const lower = key.trim().toLowerCase()
  const hit = Object.keys(colors).find((k) => k.trim().toLowerCase() === lower)
  return hit ? colors[hit] : undefined
}

/**
 * An explicit `swatch` wins; then the option's own value when it is a colour (a colour picker); then the colour the admin
 * assigned to a taxonomy value with that label or value (categories, sections).
 */
export function swatchFor(option: SwatchOption, taxonomyColors: Record<string, string> = {}): string | undefined {
  if (option.swatch) return option.swatch
  if (isCssColor(option.value)) return option.value.trim()
  const fromTaxonomy = lookup(taxonomyColors, option.label) ?? (typeof option.value === 'string' ? lookup(taxonomyColors, option.value) : undefined)
  return isCssColor(fromTaxonomy) ? fromTaxonomy : undefined
}
