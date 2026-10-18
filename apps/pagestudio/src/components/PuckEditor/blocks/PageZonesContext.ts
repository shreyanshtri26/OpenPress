import { createContext } from 'react'

type ZoneBlock = {
  type?: string
  props?: Record<string, unknown>
}

export type PageZonesData = Record<string, ZoneBlock[]>

export const PageZonesContext = createContext<PageZonesData>({})
