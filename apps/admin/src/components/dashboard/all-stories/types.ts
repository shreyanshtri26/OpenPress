export type StoryState =
  | 'draft'
  | 'decision_awaited'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | string;

export type StoryStatus =
  | 'raise_a_story'
  | 'ideas'
  | 'in_progress'
  | 'in_review'
  | 'ready_to_publish'
  | 'published'
  | string;

export type StoryFilterKey =
  | 'all'
  | 'draft'
  | 'decision_awaited'
  | 'approved'
  | 'rejected'
  | 'on_hold';

export type BadgeTone =
  | 'draft'
  | 'on_hold'
  | 'rejected'
  | 'approved'
  | 'decision'
  | 'idea'
  | 'progress'
  | 'review'
  | 'ready'
  | 'published'
  | 'default';

export interface StorySummary {
  storyId: string;
  title?: string;
  category?: string;
  status: StoryStatus;
  state?: StoryState | null;
  updatedAt?: string;
  createdAt?: string;
  proposedFilingDate?: string;
  publishedAt?: string;
  authorName?: string;
  editorName?: string;
  authorId: string;
  assignedTo: string;
  assignedToName?: string[];
  section?: string;
  Section?: string;
}

export interface StoryFilter {
  key: StoryFilterKey;
  label: string;
}

export interface BadgeDescriptor {
  label: string;
  tone: BadgeTone;
}

export type BadgeLookup = Record<string, BadgeDescriptor>;

export type GridStory = Omit<StorySummary, 'createdAt' | 'updatedAt' | 'proposedFilingDate' | 'publishedAt'> & {
  createdAt?: string | Date;
  updatedAt?: string | Date;
  proposedFilingDate?: string | Date;
  publishedAt?: string | Date;
  statusLabel: string;
  statusTone: BadgeTone;
  workflowStateLabel: string;
  workflowStateTone: BadgeTone;
  statusValue: string;
  workflowStateValue: string;
  authorDisplay: string;
  assignedToDisplay: string;
  storySection?: string;
};
