import type { RenderContext } from './renderTypes';

export type AdProps = {
    id?: string;
    adId?: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
    desktopDimensions?: string;
    mobileDimensions?: string;
};

export function resolveAd(
    props: AdProps,
    ctx: RenderContext | undefined,
    defaultPlacement: string,
    fallbackKeywords: string[],
    placementName?: string
) {
    const now = new Date();
    const campaigns = ctx?.campaigns || [];
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]+/g, '-');
    const runningStatuses = ['start_now', 'active', 'running', 'start now'];

    let activeCampaign;
    let placement = placementName || defaultPlacement;

    if (props.adId && props.adId !== 'auto') {
        activeCampaign = campaigns.find(c => {
            if (!props.adId?.startsWith(c.campaignId + '-')) {
                if (!props.adId?.startsWith(c.campaignId)) return false;
            }
            const endStr = c.endTime || c.endDate;
            return (runningStatuses.includes(c.status?.toLowerCase())) &&
                (!c.startTime || new Date(c.startTime) <= now) &&
                (!endStr || new Date(endStr) >= now);
        });

        if (activeCampaign) {
            placement = props.adId.startsWith(activeCampaign.campaignId + '-')
                ? props.adId.replace(activeCampaign.campaignId + '-', '')
                : props.adId.replace(activeCampaign.campaignId, '');

            if (!activeCampaign.creatives?.[placement]) {
                activeCampaign = undefined;
            }
        }
    } else {
        // Find campaign that supports this specific placementName or fallback keywords
        const target = normalize(placementName || defaultPlacement);
        activeCampaign = campaigns.find(c =>
            (runningStatuses.includes(c.status?.toLowerCase())) &&
            (!c.startTime || new Date(c.startTime) <= now) &&
            (!(c.endTime || c.endDate) || new Date(c.endTime || c.endDate) >= now) &&
            (
                (c.type && normalize(c.type) === target) ||
                (c.type && fallbackKeywords.some(kw => normalize(c.type).includes(normalize(kw)))) ||
                (c.placements && c.placements.some((p: string) => {
                    if (target && normalize(p) === target) return true;
                    return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
                }))
            )
        );

        if (activeCampaign && activeCampaign.placements) {
            placement = activeCampaign.placements.find((p: string) => {
                if (target && normalize(p) === target) return true;
                return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
            }) || activeCampaign.placements[0] || placement;
        }
    }

    // Get the job for this placement. A campaign can accumulate more than one
    // job for the same placement over time (e.g. re-scheduled, or a previous
    // run that already ended) — picking whichever comes first in the array
    // used to mean a stale/expired job could mask a genuinely active one for
    // the same placement. Prefer a job that is both placement-matching AND
    // currently within its own time window; only fall back to the first
    // placement match (old behaviour) if none currently qualify.
    const placementJobs = (activeCampaign?.jobs || []).filter((j: any) =>
        normalize(j.placement) === normalize(placement) ||
        j.placement?.toLowerCase() === placement?.toLowerCase()
    );
    const isJobCurrentlyValid = (j: any) => {
        if (!j) return false;
        const jobEnd = j.endTime ? new Date(j.endTime) : null;
        const jobStart = j.startTime ? new Date(j.startTime) : null;
        return (!jobEnd || jobEnd >= now) && (!jobStart || jobStart <= now);
    };
    let activeJob = placementJobs.find(isJobCurrentlyValid) || placementJobs[0];

    // Helper to find the correct creative key even if there's a naming mismatch (dash vs space)
    const getCreative = (campaign: any, pName: string) => {
        const norm = normalize(pName);

        // 1. The job running now wins; campaign.creatives is keyed by placement only.
        if (activeJob?.creatives) {
            const desktopVal = activeJob.creatives.desktop?.[0]?.fileUrl || activeJob.creatives.desktop;
            const mobileVal = activeJob.creatives.mobile?.[0]?.fileUrl || activeJob.creatives.mobile;
            // Empty arrays are truthy; only a URL counts.
            const desktop = typeof desktopVal === 'string' ? desktopVal : '';
            const mobile = typeof mobileVal === 'string' ? mobileVal : '';
            if (desktop || mobile) {
                return { desktop, mobile };
            }
        }

        // 2. Fall back to top-level creatives (Backend/Legacy format)
        if (campaign?.creatives) {
            const keys = Object.keys(campaign.creatives);
            const exactKey = keys.find(k => k.toLowerCase() === pName.toLowerCase());
            if (exactKey) return campaign.creatives[exactKey];
            const normalizedKey = keys.find(k => normalize(k) === norm);
            if (normalizedKey) return campaign.creatives[normalizedKey];
        }

        return undefined;
    };

    let creative = getCreative(activeCampaign, placement);
    const target = normalize(placementName || defaultPlacement);
    const matchingCampaign = campaigns.find(c => 
        (c.type && normalize(c.type) === target) ||
        (c.type && fallbackKeywords.some(kw => normalize(c.type).includes(normalize(kw)))) ||
        (c.placements && c.placements.some((p: string) => {
            if (target && normalize(p) === target) return true;
            return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
        }))
    );

    // No `&& activeJob` guard: a campaign with jobs but none here is suppressed too.
    if (activeCampaign?.jobs?.length && !isJobCurrentlyValid(activeJob)) {
        activeCampaign = undefined;
        // Drop the non-running job's creative too, or it renders until the client hides it.
        creative = undefined;
        activeJob = undefined;
    }

    // Temporary diagnostic: shows exactly why an ad slot did/didn't resolve
    // content, without needing backend/S3 access to inspect. Safe to remove
    // once the leaderboard gap is confirmed fixed.
    console.log(`[adResolver] placement="${placement}" campaigns=${campaigns.length} matched=${!!activeCampaign} campaignId=${activeCampaign?.campaignId || activeCampaign?.id || 'none'} jobsForPlacement=${placementJobs.length} desktopUrl=${!!(props.desktopImageUrl || creative?.desktop)}`);

    return {
        activeCampaign,
        matchingCampaign,
        placement,
        desktopImageUrl: props.desktopImageUrl || creative?.desktop,
        mobileImageUrl: props.mobileImageUrl || creative?.mobile,
        thirdPartyTagDesktop: activeJob?.thirdPartyTagDesktop || creative?.thirdPartyTagDesktop || creative?.third_party_tag_desktop || activeCampaign?.thirdPartyTag || activeCampaign?.third_party_tag || '',
        thirdPartyTagMobile: activeJob?.thirdPartyTagMobile || creative?.thirdPartyTagMobile || creative?.third_party_tag_mobile || activeCampaign?.thirdPartyTagMobile || activeCampaign?.third_party_tag_mobile || '',
        desktopDimensions: creative?.desktopDimensions || creative?.desktop_dimensions || activeJob?.dimension?.desktop || activeJob?.dimension?.desktopDimensions || props.desktopDimensions,
        mobileDimensions: creative?.mobileDimensions || creative?.mobile_dimensions || activeJob?.dimension?.mobile || activeJob?.dimension?.mobileDimensions || props.mobileDimensions,
        // A job's own landing page URL wins over the campaign-level one, so a
        // single campaign can point each placement at a different destination.
        // Empty/absent falls through to the campaign URL, preserving existing
        // behaviour for every campaign authored before per-job URLs existed.
        linkUrl: props.linkUrl || activeJob?.landingPageURL || activeJob?.landing_page_url || activeCampaign?.landingPageURL || activeCampaign?.url || '#',
        altText: props.altText || activeCampaign?.campaignName || 'Advertisement',
        jobId: activeJob?.id || activeJob?.jobId || '',
    };
}
