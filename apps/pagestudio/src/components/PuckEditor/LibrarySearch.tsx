import { useSyncExternalStore, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { matchesLibraryQuery } from './libraryGroups'

// The query lives outside React so the search box (in the `components` override) and every
// `componentItem` override see the same value without prop drilling through Puck.
let query = ''
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => (listeners.add(l), () => { listeners.delete(l) })
const setQuery = (q: string) => { query = q; listeners.forEach((l) => l()) }
const useQuery = () => useSyncExternalStore(subscribe, () => query)

function SearchBox() {
  const q = useQuery()
  return (
    <div className="studio-library-search" role="search">
      <div className="studio-library-search__field">
        <input
          type="search"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components"
          aria-label="Search components"
          className="studio-library-search__input"
        />
        <Search size={14} aria-hidden="true" className="studio-library-search__icon" />
        {q && (
          <button type="button" className="studio-library-search__clear" aria-label="Clear search" onClick={() => setQuery('')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

/** Shows the "no results" state when the query matches nothing in this page's library. */
export function LibraryPanel({ children, labels }: { children: ReactNode; labels: Record<string, string> }) {
  const q = useQuery()
  const any = !q || Object.entries(labels).some(([key, label]) => matchesLibraryQuery(q, key, label))
  return (
    <>
      <SearchBox />
      {any ? <div data-library-searching={q ? true : undefined}>{children}</div> : (
        <p className="studio-library-empty" role="status">No components match “{q}”.</p>
      )}
    </>
  )
}

/** Wraps one library item; non-matches are marked so CSS can hide Puck's draggable wrapper. */
export function LibraryItem({ name, label, children }: { name: string; label?: string; children: ReactNode }) {
  const q = useQuery()
  // Puck owns the draggable wrapper around this node, so a non-match is marked and the wrapper hidden by CSS
  // (.studio-shell [class*="_DrawerItem_"]:has([data-library-hidden])), keeping the item mounted and draggable state intact.
  const hidden = !matchesLibraryQuery(q, name, label)
  return <div data-library-hidden={hidden || undefined} title={label ?? name}>{children}</div>
}
