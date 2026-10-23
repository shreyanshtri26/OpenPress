import type { PageStudioData } from './builderConfig'

const STORAGE_KEY = 'pagestudio:published-pages'

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch (error) {
    console.error('Unable to access localStorage', error)
    return null
  }
}

type StoredPage = {
  data: PageStudioData
  createdAt: string
}

type StoredPages = Record<string, StoredPage>

const readPages = (storage: Storage): StoredPages => {
  try {
    const rawValue = storage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue) as StoredPages
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    console.error('Unable to parse published pages from storage', error)
  }

  return {}
}

const writePages = (storage: Storage, pages: StoredPages) => {
  storage.setItem(STORAGE_KEY, JSON.stringify(pages))
}

// Only recent previews are ever opened; keeping every publish fills the storage quota.
const MAX_STORED_PAGES = 5

const newestPages = (pages: StoredPages, keep: number): StoredPages =>
  Object.fromEntries(
    Object.entries(pages)
      .sort(([, a], [, b]) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')))
      .slice(0, keep)
  )

export const savePublishedPage = (data: PageStudioData) => {
  const storage = getStorage()


  if (!storage) {
    return null
  }

  const pages = readPages(storage)
  const id = createId()

  pages[id] = {
    data,
    createdAt: new Date().toISOString(),
  }

  // Drop older previews until it fits; a full quota must not fail the publish.
  for (let keep = MAX_STORED_PAGES; keep >= 1; keep -= 1) {
    try {
      writePages(storage, newestPages(pages, keep))
      return id
    } catch (error) {
      console.warn(`Could not store published page preview keeping ${keep} page(s)`, error)
    }
  }

  return null
}

export const loadPublishedPage = (id: string): PageStudioData | null => {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  const pages = readPages(storage)
  const pageData = pages[id]?.data ?? null


  return pageData
}
