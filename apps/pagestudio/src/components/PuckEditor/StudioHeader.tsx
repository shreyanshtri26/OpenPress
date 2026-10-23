import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createUsePuck } from '@measured/puck'
import { LayoutGrid, Redo2, SlidersHorizontal, Undo2 } from 'lucide-react'
import { HeaderSlotsContext, useHeaderSlots } from './headerSlots'

const usePuckState = createUsePuck()

// Below this width two sidebars leave the canvas too little room (Puck itself only intervenes under 638px).
const SINGLE_PANEL_QUERY = '(max-width: 999px)'

type IconToggleProps = { label: string; shortcut?: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }

function IconAction({ label, shortcut, pressed, disabled, onClick, children }: IconToggleProps) {
  return (
    <button
      type="button"
      className="studio-icon-btn"
      aria-label={label}
      aria-pressed={pressed}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/**
 * Page Studio's application header, replacing Puck's default one so the layout can be a real three-column grid:
 *
 *   [ sidebar toggles + page switcher ]   [ page title ]   [ undo/redo · save status · save · preview · publish ]
 *
 * The side cells are equal `minmax(0, 1fr)` tracks, so the title is centred whatever the width of either side. The page
 * switcher and the actions are rendered by PuckHeaderActions (which owns their state) through portals into the two cells.
 */
export function StudioHeader({ title, actions }: { title: string; actions: ReactNode }) {
  const [left, setLeft] = useState<HTMLElement | null>(null)
  const [right, setRight] = useState<HTMLElement | null>(null)

  const leftOpen = usePuckState((s) => s.appState.ui.leftSideBarVisible)
  const rightOpen = usePuckState((s) => s.appState.ui.rightSideBarVisible)
  const hasPast = usePuckState((s) => s.history.hasPast)
  const hasFuture = usePuckState((s) => s.history.hasFuture)
  const back = usePuckState((s) => s.history.back)
  const forward = usePuckState((s) => s.history.forward)
  const dispatch = usePuckState((s) => s.dispatch)

  // Same rule as Puck's own toggles: on a narrow screen opening one sidebar closes the other.
  const toggle = useCallback((side: 'left' | 'right') => {
    const narrow = window.matchMedia(SINGLE_PANEL_QUERY).matches
    const key = side === 'left' ? 'leftSideBarVisible' : 'rightSideBarVisible'
    const other = side === 'left' ? 'rightSideBarVisible' : 'leftSideBarVisible'
    const visible = side === 'left' ? leftOpen : rightOpen
    dispatch({ type: 'setUi', ui: { [key]: !visible, ...(narrow ? { [other]: false } : {}) } })
  }, [dispatch, leftOpen, rightOpen])

  // Narrow window with both panels open: keep the properties panel, close the components panel.
  useEffect(() => {
    const mq = window.matchMedia(SINGLE_PANEL_QUERY)
    const fit = () => {
      if (mq.matches && leftOpen && rightOpen) dispatch({ type: 'setUi', ui: { leftSideBarVisible: false } })
    }
    fit()
    mq.addEventListener('change', fit)
    return () => mq.removeEventListener('change', fit)
  }, [leftOpen, rightOpen, dispatch])

  return (
    <HeaderSlotsContext.Provider value={{ left, right }}>
      <header className="studio-header" style={{ gridArea: 'header' }}>
        <div className="studio-header__left">
          <IconAction label={leftOpen ? 'Hide components and outline' : 'Show components and outline'} pressed={leftOpen} onClick={() => toggle('left')}>
            <LayoutGrid size={18} aria-hidden="true" />
          </IconAction>
          <div className="studio-header__slot" ref={setLeft} />
        </div>

        <h2 className="studio-header__title" title={title}>{title}</h2>

        <div className="studio-header__right">
          <div className="studio-header__group" role="group" aria-label="History">
            <IconAction label="Undo" shortcut="Ctrl+Z" disabled={!hasPast} onClick={() => back()}>
              <Undo2 size={18} aria-hidden="true" />
            </IconAction>
            <IconAction label="Redo" shortcut="Ctrl+Shift+Z" disabled={!hasFuture} onClick={() => forward()}>
              <Redo2 size={18} aria-hidden="true" />
            </IconAction>
          </div>
          <div className="studio-header__slot studio-header__slot--right" ref={setRight} />
          <span className="studio-header__divider" aria-hidden="true" />
          <IconAction label={rightOpen ? 'Hide properties' : 'Show properties'} pressed={rightOpen} onClick={() => toggle('right')}>
            <SlidersHorizontal size={18} aria-hidden="true" />
          </IconAction>
        </div>

        {/* PuckHeaderActions renders nothing here; it portals its controls into the cells above. */}
        {actions}
      </header>
    </HeaderSlotsContext.Provider>
  )
}

/** Renders its children into one of the header cells; inline when there is no Studio header. */
export function HeaderPortal({ slot, children }: { slot: 'left' | 'right'; children: ReactNode }) {
  const slots = useHeaderSlots()
  if (!slots) return <>{children}</>
  const el = slots[slot]
  return el ? createPortal(children, el) : null
}
