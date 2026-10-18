export interface CampaignFilter {
  key: 'all' | 'active' | 'paused' | 'expired' | 'draft' | 'start_later';
  label: string;
}

export const CAMPAIGN_STATUS_FILTERS: CampaignFilter[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active / Start Now' },
  { key: 'paused', label: 'Paused' },
  { key: 'expired', label: 'Expired' },
  { key: 'draft', label: 'Draft' },
  { key: 'start_later', label: 'Start Later' },
];

export interface CampaignStatusLookup {
  [key: string]: {
    label: string;
    colorClass: string;
    bgClass: string;
  };
}

export const CAMPAIGN_STATUS_LOOKUP: CampaignStatusLookup = {
  start_now: {
    label: 'START NOW',
    colorClass: 'text-green-700',
    bgClass: 'bg-green-100',
  },
  paused: {
    label: 'PAUSED',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-100',
  },
  expired: {
    label: 'EXPIRED',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-100',
  },
  draft: {
    label: 'DRAFT',
    colorClass: 'text-gray-700',
    bgClass: 'bg-gray-100',
  },
  start_later: {
    label: 'START LATER',
    colorClass: 'text-gray-700',
    bgClass: 'bg-gray-100',
  },
  rejected: {
    label: 'REJECTED',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-100',
  },
  ready_to_publish: {
    label: 'READY TO PUBLISH',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-100',
  },
};
