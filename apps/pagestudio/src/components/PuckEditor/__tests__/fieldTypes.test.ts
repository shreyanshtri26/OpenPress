import { describe, expect, it } from 'vitest'
import { getConfigForPage } from '../builderConfig'

// Puck throws "Field type for <x> did not exist" while drawing a block's settings if any field (or array/object sub-field)
// has no valid `type`. That crashes the whole editor, so every field of every block on every page type must be well formed.
const KNOWN = new Set(['text', 'textarea', 'number', 'select', 'radio', 'array', 'object', 'external', 'custom', 'slot'])
const PAGES = ['Home', 'ContactUs', 'About', 'SupportUs', 'PrivacyPolicy', 'MediaCouncil', 'Error', 'Blog', 'Section', 'Author', 'AuthorsList', 'Videos', 'VideoAuthor']

function problems(field: any, path: string): string[] {
  if (!field || typeof field !== 'object') return [`${path}: not a field`]
  const found: string[] = KNOWN.has(field.type) ? [] : [`${path}: type is ${String(field.type)}`]
  if (field.type === 'array') for (const [key, sub] of Object.entries(field.arrayFields ?? {})) found.push(...problems(sub, `${path}.${key}`))
  if (field.type === 'object') for (const [key, sub] of Object.entries(field.objectFields ?? {})) found.push(...problems(sub, `${path}.${key}`))
  return found
}

describe('page builder field definitions', () => {
  it('every field on every block has a valid type', async () => {
    const bad: string[] = []
    for (const page of PAGES) {
      const config: any = getConfigForPage(page as any)
      for (const [name, block] of Object.entries<any>(config.components ?? {})) {
        for (const [key, field] of Object.entries(block.fields ?? {})) bad.push(...problems(field, `${page}/${name}.${key}`))
        if (typeof block.resolveFields === 'function') {
          for (const parent of [null, { props: { mode: 'automatic' } }, { props: { mode: 'manual' } }]) {
            const resolved = await block.resolveFields(
              { props: block.defaultProps ?? {} },
              { fields: block.fields, parent, changed: {}, lastFields: block.fields, lastData: null, appState: { data: { content: [], root: {} }, ui: {} } },
            )
            for (const [key, field] of Object.entries(resolved ?? {})) bad.push(...problems(field, `${page}/${name}.resolved.${key}`))
          }
        }
      }
    }
    expect([...new Set(bad)]).toEqual([])
  })
})
