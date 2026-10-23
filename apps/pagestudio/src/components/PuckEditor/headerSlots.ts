import { createContext, useContext } from 'react'

/** The two cells of the Studio header that page-level controls are rendered into (see StudioHeader). */
export type HeaderSlots = { left: HTMLElement | null; right: HTMLElement | null }

// `undefined` = no Studio header above us, so controls render where they are called.
export const HeaderSlotsContext = createContext<HeaderSlots | undefined>(undefined)

export const useHeaderSlots = () => useContext(HeaderSlotsContext)
