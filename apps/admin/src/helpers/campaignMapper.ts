export const placementMapping: Record<string, string> = {
    'leaderboard': 'Leaderboard',
    'sidebar-rectangle': 'Sidebar Rectangle',
    'in-story': 'In story',
    'instory-ad': 'In story'
};

export const mapBackendCampaignToFrontend = (cp: any) => {
    console.log("🔍 DEBUG - RAW BACKEND CAMPAIGN:", cp);
    let jobs = [];

    const getAssetUrl = (jobVal: any, legacyVal: any) => {
        if (jobVal && typeof jobVal === 'string' && jobVal.trim().length > 0) return jobVal;
        if (legacyVal && typeof legacyVal === 'string' && legacyVal.trim().length > 0) return legacyVal;
        return '';
    };

    const extractTag = (job: any, cp: any, normP: string, displayP: string, isMobile: boolean) => {
        // Priority 1: Directly on the job object (Try all common field names)
        const fromJob = isMobile
            ? (job.thirdPartyTagMobile || job.third_party_tag_mobile || job.third_party_tag_mobile_tag || job.tagMobile || job.mobile_tag)
            : (job.thirdPartyTagDesktop || job.third_party_tag_desktop || job.tagDesktop || job.desktop_tag);
        if (fromJob && typeof fromJob === 'string' && fromJob.trim().length > 0) return fromJob;

        // Priority 2: In the creatives map (Checking multiple possible key formats: "leaderboard", "Leaderboard", etc.)
        const creatives = cp.creatives || {};
        const snakeP = normP.replace(/-/g, '_'); // "sidebar_rectangle"

        // Potential keys order: normalized hyphenated, original display name, snake_case
        const keys = [normP, displayP, snakeP];

        for (const key of keys) {
            const pData = creatives[key];
            if (!pData) continue;

            const fromCreatives = isMobile
                ? (pData.thirdPartyTagMobile || pData.third_party_tag_mobile || pData.third_party_tag_mobile_tag || pData.tagMobile || pData.mobile_tag || pData.mobile)
                : (pData.thirdPartyTagDesktop || pData.third_party_tag_desktop || pData.tagDesktop || pData.desktop_tag || pData.desktop);

            // Pro-Developer Safety: Only capture it as a tag if it starts with an HTML tag or is a long string.
            // Avoid capturing image URLs as tags.
            if (fromCreatives && typeof fromCreatives === 'string' && fromCreatives.trim().length > 0) {
                const trimmed = fromCreatives.trim();
                if (trimmed.startsWith('<') || trimmed.includes('\n')) return fromCreatives;
            }
        }

        return '';
    };

    if (cp.jobs && Array.isArray(cp.jobs) && cp.jobs.length > 0) {
        jobs = cp.jobs.map((job: any, index: number) => {
            const placementVal = job.placement || 'Leaderboard';
            const normalizedP = placementVal.toLowerCase().replace(/\s+/g, '-');
            const placement = placementMapping[normalizedP] || placementVal || 'Leaderboard';

            const rawPlacement = job.placement || 'leaderboard';

            // Robust extraction for creatives and tags (checks both new job object and legacy cp.creatives)
            const desktopUrl = getAssetUrl(job.creatives?.desktop, cp.creatives?.[normalizedP]?.desktop || cp.creatives?.[rawPlacement]?.desktop || cp.creatives?.[placement]?.desktop);
            const mobileUrl = getAssetUrl(job.creatives?.mobile, cp.creatives?.[normalizedP]?.mobile || cp.creatives?.[rawPlacement]?.mobile || cp.creatives?.[placement]?.mobile);

            let tagDesktop = extractTag(job, cp, normalizedP, placement, false);
            let tagMobile = extractTag(job, cp, normalizedP, placement, true);

            // Priority 3: Global fallback for first job only
            if (index === 0) {
                if (!tagDesktop) tagDesktop = cp.thirdPartyTag || cp.third_party_tag || cp.third_party_tag_desktop || cp.thirdPartyTagDesktop || '';
                if (!tagMobile) tagMobile = cp.thirdPartyTagMobile || cp.third_party_tag_mobile || cp.third_party_tag_mobile_tag || '';
            }

            return {
                id: job.jobId || job.id || `job-${index}-${Date.now()}`,
                placement: placement,
                startTime: job.startTime || cp.startTime,
                endTime: job.endTime || cp.endTime,
                // Per-job click-through URL. Left empty when unset so the
                // renderers fall back to the campaign-level URL.
                landingPageURL: job.landingPageURL || job.landing_page_url || '',
                thirdPartyTagDesktop: tagDesktop,
                thirdPartyTagMobile: tagMobile,
                dimension: job.dimension || job.dimensions || null,
                spotlightMobileImages: (() => {
                    const arr = job.spotlightMobileImages || job.spotlight_mobile_images
                        || job.creatives?.spotlightMobileImages || job.creatives?.spotlight_mobile_images;
                    return Array.isArray(arr) ? arr.filter(Boolean) : [];
                })(),
                spotlightFallbackIndex: (() => {
                    const idx = job.spotlightFallbackIndex ?? job.spotlight_fallback_index;
                    return Number.isFinite(Number(idx)) ? Number(idx) : 0;
                })(),
                adFormat: (() => {
                    const explicit = job.adFormat || job.ad_format;
                    if (explicit) return explicit;
                    // Infer from presence of spotlight images (backend may not return adFormat field)
                    const imgs = job.spotlightMobileImages || job.spotlight_mobile_images
                        || job.creatives?.spotlightMobileImages || job.creatives?.spotlight_mobile_images;
                    return (Array.isArray(imgs) && imgs.filter(Boolean).length >= 2) ? 'spotlight' : 'conventional';
                })(),
                afterParagraph: job.afterParagraph || job.after_paragraph || '',
                repeatAd: job.repeatAd !== undefined ? job.repeatAd : (job.repeat_ad !== undefined ? job.repeat_ad : true),
                // Popup Ad fields — preserved as-is (both casings accepted) so
                // resolveActivePopupCampaign()/buildPopupAdHtml() in the renderer
                // can find them on the mapped job. Without these, a "popup"
                // adFormat job would map through with no creative/trigger data
                // and the ad would silently never render.
                popupTrigger: job.popupTrigger || job.popup_trigger || 'immediate',
                popupTriggerVal: job.popupTriggerVal !== undefined ? job.popupTriggerVal : (job.popup_trigger_val !== undefined ? job.popup_trigger_val : 0),
                popupCapDays: job.popupCapDays !== undefined ? job.popupCapDays : (job.popup_cap_days !== undefined ? job.popup_cap_days : 7),
                popupHideOnConvert: job.popupHideOnConvert !== undefined ? job.popupHideOnConvert : (job.popup_hide_on_convert !== undefined ? job.popup_hide_on_convert : true),
                popupDesktopImage: job.popupDesktopImage || job.popup_desktop_image || '',
                popupMobileImage: job.popupMobileImage || job.popup_mobile_image || '',
                popupCtaText: job.popupCtaText || job.popup_cta_text || '',
                clicks: job.clicks || 0,
                impressions: job.impressions || 0,
                ctr: job.ctr || (job.impressions && job.impressions > 0 ? ((job.clicks / job.impressions) * 100).toFixed(2) + '%' : '0%'),
                creatives: {
                    desktop: desktopUrl ? [{ fileUrl: desktopUrl, name: 'Existing desktop asset', preview: desktopUrl }] : [],
                    mobile: mobileUrl ? [{ fileUrl: mobileUrl, name: 'Existing mobile asset', preview: mobileUrl }] : []
                }
            };
        });
    } else if (cp.placements && Array.isArray(cp.placements) && cp.placements.length > 0) {
        jobs = cp.placements.map((p: string, index: number) => {
            const normalizedP = p.toLowerCase().replace(/\s+/g, '-');
            const placement = placementMapping[normalizedP] || p;

            const desktopUrl = cp.creatives?.[normalizedP]?.desktop || cp.creatives?.[placement]?.desktop || '';
            const mobileUrl = cp.creatives?.[normalizedP]?.mobile || cp.creatives?.[placement]?.mobile || '';

            let tagDesktop = extractTag({}, cp, normalizedP, placement, false);
            let tagMobile = extractTag({}, cp, normalizedP, placement, true);

            if (index === 0) {
                if (!tagDesktop) tagDesktop = cp.thirdPartyTag || cp.third_party_tag || cp.third_party_tag_desktop || cp.thirdPartyTagDesktop || '';
                if (!tagMobile) tagMobile = cp.thirdPartyTagMobile || cp.third_party_tag_mobile || cp.third_party_tag_mobile_tag || '';
            }

            return {
                id: `legacy-${index}-${cp.campaignId}`,
                placement: placement,
                startTime: cp.startTime,
                endTime: cp.endTime,
                // Legacy campaigns predate per-job URLs, so these always fall
                // back to the campaign-level URL.
                landingPageURL: '',
                thirdPartyTagDesktop: tagDesktop,
                thirdPartyTagMobile: tagMobile,
                afterParagraph: cp.afterParagraph || cp.after_paragraph || '',
                repeatAd: cp.repeatAd !== undefined ? cp.repeatAd : (cp.repeat_ad !== undefined ? cp.repeat_ad : true),
                clicks: cp.clicks || 0,
                impressions: cp.impressions || 0,
                ctr: cp.ctr || '0%',
                creatives: {
                    desktop: desktopUrl ? [{ fileUrl: desktopUrl, name: 'Existing desktop asset', preview: desktopUrl }] : [],
                    mobile: mobileUrl ? [{ fileUrl: mobileUrl, name: 'Existing mobile asset', preview: mobileUrl }] : []
                }
            };
        });
    }

    if (jobs.length === 0) {
        jobs = [{
            id: `new-job-${Date.now()}`,
            placement: 'Leaderboard',
            startTime: null,
            endTime: null,
            thirdPartyTagDesktop: '',
            thirdPartyTagMobile: '',
            afterParagraph: '',
            repeatAd: true,
            creatives: { desktop: [], mobile: [] }
        }];
    }

    const totalClicks = jobs.reduce((sum: number, j: any) => sum + (Number(j.clicks) || 0), 0);
    const totalImpressions = jobs.reduce((sum: number, j: any) => sum + (Number(j.impressions) || 0), 0);

    const campaignLandingPageUrl =
        cp.landingPageURL || cp.landingPageUrl || cp.url || cp.landing_page_url || cp.URL ||
        jobs.find((job: any) => job.landingPageURL || job.landing_page_url)?.landingPageURL ||
        jobs.find((job: any) => job.landingPageURL || job.landing_page_url)?.landing_page_url || '';

    return {
        id: cp.campaignId || cp.id,
        campaignId: cp.campaignId || cp.id,
        campaignName: cp.campaignName || cp.name || '',
        name: cp.campaignName || cp.name || '',
        advertiserName: cp.advertiserName || cp.advertiser || '',
        advertiser: cp.advertiserName || cp.advertiser || '',
        status: cp.status ? (cp.status.charAt(0).toUpperCase() + cp.status.slice(1).replace('_', ' ')) : 'Unknown',
        url: campaignLandingPageUrl,
        frequencyCapEnabled: cp.frequencyCap?.enabled || false,
        frequencyCapMax: cp.frequencyCap?.maxImpressions || 0,
        frequencyCapPeriod: cp.frequencyCap?.per ? (cp.frequencyCap.per.charAt(0).toUpperCase() + cp.frequencyCap.per.slice(1)) : 'Session',
        jobs: jobs,
        startDate: (jobs.length > 0 && jobs.some((j: any) => j.startTime))
            ? jobs.filter((j: any) => j.startTime).map((j: any) => new Date(j.startTime)).reduce((min: Date, d: Date) => d < min ? d : min).toISOString()
            : (cp.startTime || cp.start_date || null),
        endDate: (jobs.length > 0 && jobs.some((j: any) => j.endTime))
            ? jobs.filter((j: any) => j.endTime).map((j: any) => new Date(j.endTime)).reduce((max: Date, d: Date) => d > max ? d : max).toISOString()
            : (cp.endTime || cp.end_date || null),
        placements: Array.from(new Set(jobs.map((j: any) => j.placement))).filter(Boolean),
        type: cp.type || 'standard',
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: totalImpressions > 0
            ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%'
            : '0%',
    };
};