export type RenderContext = {
  zones: Record<string, any[]>
  storiesById: Record<string, any>
  sections?: string[]
  activeSection?: string
  authorId?: string
  authorName?: string
  campaigns?: any[]
  authors?: any[]
  extraRenderers?: Record<string, any>
  renderedBlockIds?: Set<string>
  pageType?: string
  currentStory?: any
}
