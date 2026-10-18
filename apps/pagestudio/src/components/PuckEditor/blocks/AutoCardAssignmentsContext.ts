import { createContext } from 'react'

export type AutoCardAssignments = {
  storyIdsByCardId: Record<string, string[]>
}

export const AutoCardAssignmentsContext = createContext<AutoCardAssignments | null>(null)
