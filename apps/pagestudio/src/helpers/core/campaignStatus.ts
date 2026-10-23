// Campaign statuses that must never serve an ad. Anything else (start_now, active, start_later with a past start date…) is
// decided by the campaign's own start/end dates.
export const INACTIVE_CAMPAIGN_STATUSES = new Set([
  'paused', 'pause', 'draft', 'stopped', 'ended', 'cancelled', 'canceled',
  'expired', 'rejected', 'ready_to_publish', 'decision_awaited', 'on_hold',
])

export const isCampaignStatusServing = (status: unknown): boolean =>
  !INACTIVE_CAMPAIGN_STATUSES.has(String(status || '').toLowerCase().replace(/[\s_-]+/g, '_'))

// The campaigns a published page may carry in its inline script: serving ones only, so drafts, rejected and expired
// campaigns (advertiser names, landing URLs, creatives) never end up in public HTML.
export const publicCampaignsJson = (campaigns: any[] | undefined): string =>
  JSON.stringify((campaigns || []).filter((c) => isCampaignStatusServing(c?.status))).replace(/</g, '\u003c')
