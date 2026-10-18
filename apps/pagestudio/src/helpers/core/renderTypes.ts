export type MoreStoriesInjection = {
  insertAfterParagraph: number;
  stories: Array<{ id?: string; headline?: string; title?: string; publishUrl?: string; redirectUrl?: string }>;
  id?: string;
  headingColor?: string;
}

export type RenderContext = {
  zones: Record<string, any[]>
  storiesById: Record<string, any>
  sections?: string[]
  activeSection?: string
  authorId?: string
  authorName?: string;
  campaigns?: any[];
  extraRenderers?: Record<string, (props: any, ctx: any) => string>;
  pageType?: string;
  currentStory?: any;
  moreStoriesInjections?: MoreStoriesInjection[];
  claimSpotlightSidebarAd?: () => boolean;
}
