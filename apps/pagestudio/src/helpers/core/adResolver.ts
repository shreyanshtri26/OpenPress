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

    // A job serves only inside its own start/end window.
    const isJobRunning = (job: any) => {
        if (!job) return false;
        if (job.startTime && new Date(job.startTime) > now) return false;
        if (job.endTime && new Date(job.endTime) < now) return false;
        return true;
    };

    // Jobs can share a placement; pick the one running now, not the first.
    const getJobForPlacement = (campaign: any, pName: string) => {
        const matches = (campaign?.jobs || []).filter((j: any) =>
            normalize(j.placement) === normalize(pName) ||
            j.placement?.toLowerCase() === pName?.toLowerCase()
        );
        if (matches.length === 0) return undefined;
        return matches.find(isJobRunning) || matches[0];
    };

    // Campaigns with jobs need one running on this placement; jobless ones don't.
    const hasRunningJobFor = (campaign: any, pName: string) => {
        if (!campaign?.jobs?.length) return true;
        return isJobRunning(getJobForPlacement(campaign, pName));
    };

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
        const matchesPlacement = (c: any) => {
            if (target && c.placements) {
                const matched = c.placements.find((p: string) => {
                    if (target && normalize(p) === target) return true;
                    return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
                });
                if (matched) return matched;
            }
            if (c.type && normalize(c.type) === target) return placement;
            if (c.type && fallbackKeywords.some(kw => normalize(c.type).includes(normalize(kw)))) return placement;
            return undefined;
        };

        activeCampaign = campaigns.find(c => {
            if (!runningStatuses.includes(c.status?.toLowerCase())) return false;
            if (c.startTime && new Date(c.startTime) > now) return false;
            const endStr = c.endTime || c.endDate;
            if (endStr && new Date(endStr) < now) return false;

            const matchedPlacement = matchesPlacement(c);
            if (!matchedPlacement) return false;

            // Checked here, not after selection, so a bad campaign doesn't blank the slot.
            return hasRunningJobFor(c, matchedPlacement);
        });

        if (activeCampaign && activeCampaign.placements) {
            placement = activeCampaign.placements.find((p: string) => {
                if (target && normalize(p) === target) return true;
                return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
            }) || placement;
        }
    }

    // Handles dash/space key mismatches. Job creatives win: campaign.creatives is
    // keyed by placement only.
    const getCreative = (campaign: any, pName: string) => {
        const job = getJobForPlacement(campaign, pName);
        if (job?.creatives) {
            const desktopVal = job.creatives.desktop?.[0]?.fileUrl || job.creatives.desktop;
            const mobileVal = job.creatives.mobile?.[0]?.fileUrl || job.creatives.mobile;
            const jobCreative = {
                desktop: typeof desktopVal === 'string' ? desktopVal : '',
                mobile: typeof mobileVal === 'string' ? mobileVal : '',
                thirdPartyTagDesktop: job.thirdPartyTagDesktop || job.creatives.thirdPartyTagDesktop || job.creatives.third_party_tag_desktop || '',
                thirdPartyTagMobile: job.thirdPartyTagMobile || job.creatives.thirdPartyTagMobile || job.creatives.third_party_tag_mobile || '',
                spotlightMobileImages: job.creatives.spotlightMobileImages || job.creatives.spotlight_mobile_images,
            };
            if (jobCreative.desktop || jobCreative.mobile || jobCreative.thirdPartyTagDesktop || jobCreative.thirdPartyTagMobile) {
                return jobCreative;
            }
        }

        if (!campaign?.creatives) return undefined;
        const norm = normalize(pName);
        const keys = Object.keys(campaign.creatives);
        const exactKey = keys.find(k => k.toLowerCase() === pName.toLowerCase());
        if (exactKey) return campaign.creatives[exactKey];
        const normalizedKey = keys.find(k => normalize(k) === norm);
        return normalizedKey ? campaign.creatives[normalizedKey] : undefined;
    };

    const creative = getCreative(activeCampaign, placement);
    const target = normalize(placementName || defaultPlacement);
    const matchingCampaign = campaigns.find(c => 
        (c.type && normalize(c.type) === target) ||
        (c.type && fallbackKeywords.some(kw => normalize(c.type).includes(normalize(kw)))) ||
        (c.placements && c.placements.some((p: string) => {
            if (target && normalize(p) === target) return true;
            return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
        }))
    );

    // Dimensions come from the job running now.
    const activeJob = getJobForPlacement(activeCampaign, placement);

    // If campaign has jobs, this placement must have its own matching job and that
    // job must be within its own start/end window — otherwise treat as no active
    // campaign (same behaviour as paused). Fallback logic downstream is unchanged.
    if (activeCampaign?.jobs?.length && !isJobRunning(activeJob)) {
        activeCampaign = undefined;
    }

    return {
        activeCampaign,
        matchingCampaign,
        placement,
        desktopImageUrl: props.desktopImageUrl || creative?.desktop,
        mobileImageUrl: props.mobileImageUrl || creative?.mobile,
        thirdPartyTagDesktop: activeJob?.thirdPartyTagDesktop || creative?.thirdPartyTagDesktop || creative?.third_party_tag_desktop || activeCampaign?.thirdPartyTag || activeCampaign?.third_party_tag || '',
        thirdPartyTagMobile: activeJob?.thirdPartyTagMobile || creative?.thirdPartyTagMobile || creative?.third_party_tag_mobile || activeCampaign?.thirdPartyTagMobile || activeCampaign?.third_party_tag_mobile || '',
        desktopDimensions: activeJob?.dimension?.desktop || activeJob?.dimension?.desktopDimensions || props.desktopDimensions,
        mobileDimensions: activeJob?.dimension?.mobile || activeJob?.dimension?.mobileDimensions || props.mobileDimensions,
        linkUrl: props.linkUrl || activeCampaign?.landingPageURL || activeCampaign?.url || '#',
        altText: props.altText || activeCampaign?.campaignName || 'Advertisement',
        adFormat: (activeJob?.adFormat || activeJob?.ad_format || 'conventional') as 'conventional' | 'spotlight',
        spotlightImages: (() => {
            const raw = activeJob?.spotlightMobileImages || activeJob?.spotlight_mobile_images
                || creative?.spotlightMobileImages || creative?.spotlight_mobile_images;
            const arr: string[] = Array.isArray(raw)
                ? raw.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
                : [];
            return arr.length >= 2 ? arr : undefined;
        })(),
    };
}
