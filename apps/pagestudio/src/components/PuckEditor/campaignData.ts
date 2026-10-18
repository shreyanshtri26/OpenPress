// src/components/PuckEditor/campaignData.ts
import { fetchCampaigns, fetchPlacements, type ApiCampaign, type ApiPlacement } from './apiService';

export type Creative = {
    id: string; // unique ID (e.g. 'tg-leaderboard-creative')
    placement: string; // Dynamic placement name (e.g. 'sidebar rectangle')
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    desktopDimensions?: string;
    mobileDimensions?: string;
    altText: string;
    jobStartTime?: string; // this placement's own job start — not the campaign-level date
    jobEndTime?: string;
};

export type Campaign = {
    id: string;
    name: string; // "Campaign name"
    advertiserName: string; // "Advertiser name"
    status: 'Run now' | 'Start later' | 'Paused';
    type?: string;
    placements: string[]; // ['Leaderboard', 'In-Story']
    priority: 'Direct' | 'Ad Sense' | 'Direct + Ad Sense';
    startDate?: string;
    endDate?: string;
    frequencyCapEnabled: boolean;
    frequencyCapLimit: number;
    frequencyCapPeriod: 'hour' | 'day' | 'week' | 'session' | 'campaign';
    linkUrl: string;
    creatives: Creative[];
};

let liveCampaigns: Campaign[] = [];
let livePlacements: ApiPlacement[] = [];

// Global, session-scoped data — not page-specific and nothing invalidates it
// mid-session — so skip re-fetching once populated, and dedupe concurrent
// calls (avoids firing this again if a second page switch happens before
// the first fetch resolves).
let placementsInFlight: Promise<ApiPlacement[]> | null = null;

export const initializePlacements = async (): Promise<ApiPlacement[]> => {
    if (livePlacements.length > 0) return livePlacements;
    if (placementsInFlight) return placementsInFlight;

    placementsInFlight = fetchPlacements()
        .then((placements) => {
            livePlacements = placements;
            console.log("Placements initialized:", livePlacements.length);
            return livePlacements;
        })
        .catch((error) => {
            console.error("Failed to initialize placements:", error);
            return livePlacements;
        })
        .finally(() => {
            placementsInFlight = null;
        });
    return placementsInFlight;
};

export const getPlacements = () => livePlacements;

let campaignsInFlight: Promise<Campaign[]> | null = null;

export const initializeCampaigns = async (): Promise<Campaign[]> => {
    if (liveCampaigns.length > 0) return liveCampaigns;
    if (campaignsInFlight) return campaignsInFlight;

    campaignsInFlight = fetchCampaigns()
        .then((apiCampaigns) => {
            liveCampaigns = apiCampaigns.map(transformApiCampaign);
            console.log("Campaigns initialized:", liveCampaigns.length);
            return liveCampaigns;
        })
        .catch((error) => {
            console.error("Failed to initialize campaigns:", error);
            return liveCampaigns;
        })
        .finally(() => {
            campaignsInFlight = null;
        });
    return campaignsInFlight;
};

const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]+/g, '-');

const transformApiCampaign = (api: ApiCampaign): Campaign => {
    const creatives: Creative[] = [];

    // Map based on placements array to ensure options show up even if creative URLs are missing in API response
    if (api.placements && Array.isArray(api.placements)) {
        api.placements.forEach(p => {
            // Find the placement name from livePlacements if possible, otherwise use as is
            const normalizedP = normalize(p);
            const placementInfo = livePlacements.find(lp => 
                normalize(lp.type) === normalizedP || 
                normalize(lp.name) === normalizedP || 
                normalize(lp.placementId) === normalizedP
            );
            const placementName = placementInfo ? placementInfo.name : p;

            const urls = api.creatives?.[p] || {};
            
            // Find job for this placement to get dimensions
            const job = api.jobs?.find(j => j.placement === p);
            const desktopDimensions = job?.dimension?.desktop;
            const mobileDimensions = job?.dimension?.mobile;

            creatives.push({
                id: `${api.campaignId}-${p}`,
                placement: placementName,
                desktopImageUrl: urls.desktop,
                mobileImageUrl: urls.mobile,
                desktopDimensions,
                mobileDimensions,
                altText: api.campaignName,
                jobStartTime: job?.startTime,
                jobEndTime: job?.endTime
            });
        });
    }

    const runningStatuses = ['start_now', 'active', 'running', 'start now'];
    const isRunning = runningStatuses.includes(api.status?.toLowerCase());

    return {
        id: api.campaignId,
        name: api.campaignName,
        advertiserName: api.advertiserName,
        status: isRunning ? 'Run now' : 'Paused',
        type: api.type,
        placements: (api.placements ?? []).map(p => {
            const normalizedP = normalize(p);
            const placementInfo = livePlacements.find(lp => 
                normalize(lp.type) === normalizedP || 
                normalize(lp.name) === normalizedP || 
                normalize(lp.placementId) === normalizedP
            );
            return placementInfo ? placementInfo.name : p;
        }),
        priority: api.priority === 'direct' ? 'Direct' : 'Ad Sense',
        startDate: api.startTime,
        endDate: api.endTime,
        frequencyCapEnabled: api.frequencyCap?.enabled || false,
        frequencyCapLimit: api.frequencyCap?.maxImpressions || 0,
        frequencyCapPeriod: (api.frequencyCap?.per as any) || 'day',
        linkUrl: api.landingPageURL || api.thirdPartyTag || '#',
        creatives
    };
};

export type ResolvedAd = {
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    desktopDimensions?: string;
    mobileDimensions?: string;
    linkUrl: string;
    altText: string;
};

export const getLiveAd = (placementName: string): ResolvedAd | undefined => {
    const now = new Date();
    const target = normalize(placementName);

    const priorityRank: Record<string, number> = {
        'Direct': 10,
        'Direct + Ad Sense': 7,
        'Ad Sense': 5
    };

    const winningCampaign = liveCampaigns
        .filter(camp => {
            if (camp.status === 'Paused') return false;

            // Robust placement check
            const hasPlacement = camp.placements.some(p => normalize(p) === target) || (camp.type && normalize(camp.type) === target);

            if (!hasPlacement) return false;

            // Campaign-level dates are only the overall span across all of the
            // campaign's jobs — each placement's own job start/end (checked below)
            // is what actually gates visibility.
            if (camp.startDate && new Date(camp.startDate) > now) return false;
            if (camp.endDate && new Date(camp.endDate) < now) return false;

            // Must have a creative for this specific placement
            // If matched by type, we might not have a specific placement entry in creatives,
            // so we handle that by checking if any creative exists or if it's matched by type
            const matchedCreative = camp.creatives.find(c => normalize(c.placement) === target);
            const hasCreative = !!matchedCreative || (camp.type && normalize(camp.type) === target && camp.creatives.length > 0);
            if (!hasCreative) return false;

            // This placement's own job must be within its own start/end window.
            const dateCreative = matchedCreative || camp.creatives[0];
            if (dateCreative?.jobStartTime && new Date(dateCreative.jobStartTime) > now) return false;
            if (dateCreative?.jobEndTime && new Date(dateCreative.jobEndTime) < now) return false;

            return true;
        })
        .sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))[0];

    if (!winningCampaign) return undefined;

    let creative = winningCampaign.creatives.find(c => normalize(c.placement) === target);
    
    // Fallback if matched by type but no exact placement creative found
    if (!creative && winningCampaign.type && normalize(winningCampaign.type) === target) {
        creative = winningCampaign.creatives[0];
    }


    if (!creative) return undefined;

    return {
        desktopImageUrl: creative.desktopImageUrl,
        mobileImageUrl: creative.mobileImageUrl,
        desktopDimensions: creative.desktopDimensions,
        mobileDimensions: creative.mobileDimensions,
        linkUrl: winningCampaign.linkUrl,
        altText: creative.altText
    };
};

export const getAdOptions = (placementName: string) => {
    const now = new Date();
    const options = [{ label: 'Auto (Dynamic Delivery)', value: 'auto' }];
    const target = normalize(placementName);
    
    liveCampaigns
        .filter(camp => {
            if (camp.status === 'Paused') return false;
            if (camp.startDate && new Date(camp.startDate) > now) return false;
            if (camp.endDate && new Date(camp.endDate) < now) return false;
            
            // Check if campaign has this placement or type
            const hasPlacement = camp.placements.some(p => normalize(p) === target) || (camp.type && normalize(camp.type) === target);
            
            return hasPlacement;
        })
        .forEach(camp => {
            // Add an option for each creative that matches the placement
            camp.creatives.forEach(c => {
                 const match = normalize(c.placement) === target;
                 if (!match) return;

                 // Only offer this placement's own job while it's within its own window.
                 if (c.jobStartTime && new Date(c.jobStartTime) > now) return;
                 if (c.jobEndTime && new Date(c.jobEndTime) < now) return;

                 options.push({
                    label: `${camp.advertiserName} — ${camp.name}`,
                    value: c.id
                 });
            });
        });
    return options;
};

export const getLeaderboardAdOptions = () => getAdOptions('Leaderboard');
export const getSidebarAdOptions = () => getAdOptions('Sidebar');
export const getInStoryAdOptions = () => getAdOptions('In-Story');

export const getSpotlightAdOptions = () => {
    const now = new Date();
    const options = [{ label: 'Auto (Dynamic Delivery)', value: 'auto' }];
    liveCampaigns
        .filter(camp => {
            if (camp.status === 'Paused') return false;
            if (camp.startDate && new Date(camp.startDate) > now) return false;
            if (camp.endDate && new Date(camp.endDate) < now) return false;
            // Check for spotlight type or placement name
            const hasSpotlight =
                (camp.type && normalize(camp.type).includes('spotlight')) ||
                camp.placements.some(p => normalize(p).includes('spotlight'));
            return hasSpotlight;
        })
        .forEach(camp => {
            options.push({
                label: `${camp.advertiserName} — ${camp.name}`,
                value: camp.id
            });
        });
    return options;
};

export function findAdById(creativeId: string): ResolvedAd | undefined {
    const now = new Date();
    for (const camp of liveCampaigns) {
        const creative = camp.creatives.find(c => c.id === creativeId);
        if (creative) {
            // Check status and dates
            if (camp.status === 'Paused') return undefined;
            if (camp.startDate && new Date(camp.startDate) > now) return undefined;
            if (camp.endDate && new Date(camp.endDate) < now) return undefined;
            // This creative's own job must be within its own start/end window.
            if (creative.jobStartTime && new Date(creative.jobStartTime) > now) return undefined;
            if (creative.jobEndTime && new Date(creative.jobEndTime) < now) return undefined;

            return {
                desktopImageUrl: creative.desktopImageUrl,
                mobileImageUrl: creative.mobileImageUrl,
                desktopDimensions: creative.desktopDimensions,
                mobileDimensions: creative.mobileDimensions,
                linkUrl: camp.linkUrl,
                altText: creative.altText
            };
        }
    }
    return undefined;
}

export const getPlacementDimensions = (placementName: string) => {
    const target = normalize(placementName);
    const placement = livePlacements.find(lp => 
        normalize(lp.type) === target || 
        normalize(lp.name) === target || 
        normalize(lp.placementId) === target
    );
    return {
        desktopDimensions: placement?.desktopDimensions,
        mobileDimensions: placement?.mobileDimensions
    };
};

