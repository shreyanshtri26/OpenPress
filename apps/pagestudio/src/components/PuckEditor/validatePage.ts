// Pre-publish checks on a page's Puck data. Blocking issues stop the publish; warnings are reported but allow it.
export type PageIssue = { severity: 'error' | 'warning'; message: string; componentId?: string; componentType?: string }

type Props = Record<string, unknown>
type Block = { type?: string; props?: Props }
type PageData = { content?: unknown; zones?: unknown } | null | undefined

const URL_KEYS = ['linkUrl', 'href', 'url', 'link', 'landingPageURL']
// Schemes that run code or embed content in a link: never publishable.
const UNSAFE_URL = /^\s*(javascript|data|vbscript):/i

const asBlocks = (v: unknown): Block[] =>
  (Array.isArray(v) ? v : []).filter((b): b is Block => !!b && typeof b === 'object')

const collectBlocks = (data: PageData): Block[] => {
  const zones = data?.zones && typeof data.zones === 'object' ? Object.values(data.zones as Record<string, unknown>) : []
  return [...asBlocks(data?.content), ...zones.flatMap(asBlocks)]
}

export function validatePageForPublish(data: PageData, opts: { knownAdIds?: Set<string> } = {}): PageIssue[] {
  if (asBlocks(data?.content).length === 0) {
    return [{ severity: 'error', message: 'The page is empty. Add at least one component before publishing.' }]
  }
  const issues: PageIssue[] = []
  const ids = new Map<string, number>()
  for (const b of collectBlocks(data)) {
    const id = typeof b.props?.id === 'string' ? b.props.id : undefined
    const where = { componentId: id, componentType: b.type }
    if (id) ids.set(id, (ids.get(id) ?? 0) + 1)
    for (const key of URL_KEYS) {
      const v = b.props?.[key]
      if (typeof v === 'string' && UNSAFE_URL.test(v)) {
        issues.push({ severity: 'error', message: `${b.type}: the "${key}" link uses an unsafe address and cannot be published.`, ...where })
      }
    }
    const adId = b.props?.adId
    if (opts.knownAdIds && typeof adId === 'string' && adId && adId !== 'auto' && !opts.knownAdIds.has(adId)) {
      issues.push({ severity: 'warning', message: `${b.type}: the selected campaign is no longer available, so the slot will fall back or stay empty.`, ...where })
    }
  }
  for (const [id, n] of ids) {
    if (n > 1) issues.push({ severity: 'warning', message: `Section ID "${id}" is used ${n} times; in-page links will only reach the first.`, componentId: id })
  }
  return issues
}

export const blockingIssues = (issues: PageIssue[]) => issues.filter((i) => i.severity === 'error')
