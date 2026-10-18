import { BadgeLookup, StoryFilter } from './types';

export const STORY_STATE_FILTERS: StoryFilter[] = [
  { key: 'all', label: 'All Stories' },
  { key: 'draft', label: 'Drafts' },
  { key: 'decision_awaited', label: 'Decision Awaited' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'on_hold', label: 'On Hold' },
];

export const STATE_BADGE_LOOKUP: BadgeLookup = {
  draft: { label: 'Draft', tone: 'draft' },
  decision_awaited: { label: 'Decision Awaited', tone: 'decision' },
  approved: { label: 'Approved', tone: 'approved' },
  rejected: { label: 'Rejected', tone: 'rejected' },
  on_hold: { label: 'On Hold', tone: 'on_hold' },
};

export const STATUS_BADGE_LOOKUP: BadgeLookup = {
  raise_a_story: { label: 'Raise a Story', tone: 'idea' },
  ideas: { label: 'Ideas', tone: 'idea' },
  in_progress: { label: 'In Progress', tone: 'progress' },
  in_review: { label: 'In Review', tone: 'review' },
  ready_to_publish: { label: 'Ready to Publish', tone: 'ready' },
  published: { label: 'Published', tone: 'published' },
  draft: { label: 'Draft', tone: 'draft' },
  drafts: { label: 'Draft', tone: 'draft' },
  on_hold: { label: 'On Hold', tone: 'on_hold' },
  hold: { label: 'On Hold', tone: 'on_hold' },
  onhold: { label: 'On Hold', tone: 'on_hold' },
  rejected: { label: 'Rejected', tone: 'rejected' },
  decline: { label: 'Rejected', tone: 'rejected' },
  decision_awaited: { label: 'Decision Awaited', tone: 'decision' },
  approved: { label: 'Approved', tone: 'approved' },
};
