import { createContext } from 'react'

/**
 * When ThumbnailGrid is in Automatic mode, each grid slot wraps its content in
 * this provider carrying the auto-selected story ID for that slot.
 * StoryCard and RecommendCard read from here and prefer it over their own
 * storyId prop, so existing cards update their story without being replaced.
 */
export const AutoStoryIdContext = createContext<string | null>(null)
