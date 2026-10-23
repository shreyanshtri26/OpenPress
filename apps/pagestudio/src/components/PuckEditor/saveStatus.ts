// Autosave state machine, kept free of React so it can be tested on its own.
export type SaveStatus =
  | { state: 'idle' }                                  // nothing edited since load
  | { state: 'dirty' }                                 // edits not yet sent
  | { state: 'saving'; attempt: number }
  | { state: 'saved'; at: number }
  | { state: 'error'; message: string; attempt: number }

export type SaveEvent =
  | { type: 'edit' }
  | { type: 'start'; attempt?: number }
  | { type: 'success'; at: number }
  | { type: 'failure'; message: string; attempt?: number }

export const MAX_SAVE_ATTEMPTS = 3
export const retryDelayMs = (attempt: number) => Math.min(8000, 1000 * 2 ** (attempt - 1))

export function saveReducer(_prev: SaveStatus, e: SaveEvent): SaveStatus {
  switch (e.type) {
    case 'edit': return { state: 'dirty' }
    case 'start': return { state: 'saving', attempt: e.attempt ?? 1 }
    case 'success': return { state: 'saved', at: e.at }
    case 'failure': return { state: 'error', message: e.message, attempt: e.attempt ?? 1 }
  }
}

export const hasUnsavedChanges = (s: SaveStatus) => s.state === 'dirty' || s.state === 'saving' || s.state === 'error'

export function describeSave(s: SaveStatus, now = Date.now()): string {
  switch (s.state) {
    case 'idle': return 'No changes'
    case 'dirty': return 'Unsaved changes'
    case 'saving': return s.attempt > 1 ? `Saving… (retry ${s.attempt - 1})` : 'Saving…'
    case 'saved': {
      const sec = Math.max(0, Math.round((now - s.at) / 1000))
      return sec < 5 ? 'Saved' : sec < 60 ? `Saved ${sec}s ago` : `Saved ${Math.round(sec / 60)}m ago`
    }
    case 'error': return 'Save failed'
  }
}
