import React, { useEffect, useState, useContext } from 'react';
import { initializeCampaigns, getLiveAd, findAdById } from '../campaignData';
import { getStories, initializeStories } from '../storyData';
import { AutoStoryIdContext } from './AutoStoryContext';
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext';

export type SidebarAdProps = {
    id?: string;
    adId?: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
    storyId?: string;
    fallbackBlock?: any;
};

export const SidebarAdBlock: React.FC<SidebarAdProps> = ({
    id = 'sidebar-ad',
    adId = 'auto',
    desktopImageUrl: initialDesktopImageUrl,
    mobileImageUrl: initialMobileImageUrl,
    linkUrl: initialLinkUrl = '#',
    altText: initialAltText = 'Advertisement',
    storyId,
    fallbackBlock,
}) => {
    // Current Ad state - initially populated from props (SSR/Static)
    const [currentAd, setCurrentAd] = useState({
        desktopImageUrl: initialDesktopImageUrl,
        mobileImageUrl: initialMobileImageUrl,
        linkUrl: initialLinkUrl,
        altText: initialAltText
    });

    const isDonorUser = () => {
        if (typeof window === 'undefined') return false;
        try {
            for (const key of ['website_user', 'auth_user', 'user']) {
                const val = localStorage.getItem(key);
                if (!val) continue;
                const u = JSON.parse(val);
                if (!u || typeof u !== 'object') continue;
                const status = String(u.subscriptionStatus || u.subscription_status || u.planStatus || u.plan_status || u.status || '').toLowerCase();
                const paidStatuses: Record<string, boolean> = {
                    active: true,
                    paid: true,
                    premium: true,
                    pro: true,
                    member: true,
                    donor: true
                };
                if (
                    u.isDonor === true ||
                    u.is_donor === true ||
                    u.suppressCampaigns === true ||
                    u.suppress_campaigns === true ||
                    u.adFree === true ||
                    u.ad_free === true ||
                    u.isPaid === true ||
                    u.is_paid === true ||
                    u.isMember === true ||
                    u.is_member === true ||
                    u.isPremium === true ||
                    u.is_premium === true ||
                    u.hasDonated === true ||
                    u.has_donated === true ||
                    Number(u.donationCount || u.donation_count || 0) > 0 ||
                    Number(u.donationTotalAmount || u.donation_total_amount || 0) > 0 ||
                    Number(u.lastDonationAmount || u.last_donation_amount || 0) > 0 ||
                    paidStatuses[status]
                ) {
                    return true;
                }
            }
        } catch (e) {}
        return false;
    };

    const isEditor = typeof document !== 'undefined' && (
      !!document.querySelector('.builder__workspace') ||
      !!document.querySelector('.puck') ||
      (typeof window !== 'undefined' && (
        window.location.search.includes('page=') ||
        window.location.hash.includes('page=') ||
        (window.parent !== window && (() => {
          try {
            return !!window.parent.document.querySelector('.builder__workspace') || !!window.parent.document.querySelector('.puck');
          } catch {
            return false;
          }
        })())
      ))
    );

    // Track if we should show the story fallback
    const [showFallback, setShowFallback] = useState(!initialDesktopImageUrl || (isDonorUser() && !isEditor));
    
    // Store stories in state to trigger re-renders when they load
    const [availableStories, setAvailableStories] = useState(getStories());

    // When inside an Automatic grid, prefer the injected story ID
    const autoStoryId = useContext(AutoStoryIdContext);
    const autoAssignments = useContext(AutoCardAssignmentsContext);
    const hasCardAssignment = Boolean(autoAssignments && id && Object.prototype.hasOwnProperty.call(autoAssignments.storyIdsByCardId, id));
    const assignedStoryId = hasCardAssignment && id ? autoAssignments?.storyIdsByCardId[id]?.[0] : undefined;
    const effectiveStoryId = hasCardAssignment ? assignedStoryId : autoStoryId || storyId;

    useEffect(() => {
        const checkAdStatus = async () => {
            // Re-initialize campaigns to get latest status
            await initializeCampaigns();

            let liveAd;
            if (adId === 'auto') {
                liveAd = getLiveAd('Sidebar');
            } else {
                liveAd = findAdById(adId || '');
            }

            if (!liveAd || (isDonorUser() && !isEditor)) {
                setShowFallback(true);
            } else {
                setCurrentAd({
                    desktopImageUrl: liveAd.desktopImageUrl,
                    mobileImageUrl: liveAd.mobileImageUrl,
                    linkUrl: liveAd.linkUrl,
                    altText: liveAd.altText
                });
                setShowFallback(false);
            }
        };

        checkAdStatus();

        const handleStorage = () => checkAdStatus();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [adId]);

    // Re-check for stories if they were empty initially (common on blog pages)
    useEffect(() => {
        const ensureStories = async () => {
            const current = getStories();
            if (current.length === 0) {
                console.log("SidebarAd: No stories in cache, fetching global stories for fallback...");
                await initializeStories({});
                setAvailableStories(getStories());
            }
        };

        if (showFallback && availableStories.length === 0) {
            ensureStories();
        }
    }, [showFallback, availableStories]);

    // In the editor, we always want to show the ad slot placeholder even if it's empty
    // so the user can see where the ad is placed and change its settings.
    // MODIFICATION: Always show placeholder in editor even if campaign is unpaused
    const isEmpty = true; // Always true for editor display

    return (
        <div id={id} className="w-full flex justify-center items-center py-4 bg-transparent">
            <div className="w-full max-w-[300px] flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.1em] mb-2 self-start px-1">
                    Advertisement
                </span>

                {isEmpty ? (
                    <div
                        className="w-full aspect-[300/250] border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-[9px] uppercase tracking-tighter font-bold p-4 text-center"
                    >
                        <span className="flex-col flex">
                            <span>Sidebar Ad</span>
                            <span>(300x250)</span>
                            {effectiveStoryId ? (
                                <span className="text-[8px] mt-2 text-blue-400">
                                    Fallback Story ID: {effectiveStoryId}
                                </span>
                            ) : fallbackBlock ? (
                                <span className="text-[8px] mt-2 text-blue-400">
                                    Fallback: {fallbackBlock.type}
                                </span>
                            ) : null}
                        </span>
                    </div>
                ) : (
                    <a href={currentAd.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full border border-gray-100 hover:opacity-95 transition-opacity">
                        <picture>
                            {currentAd.mobileImageUrl && (
                                <source media="(max-width: 768px)" srcSet={currentAd.mobileImageUrl} />
                            )}
                            <img
                                src={currentAd.desktopImageUrl}
                                alt={currentAd.altText}
                                className="w-full h-auto object-contain"
                                style={{ aspectRatio: '300 / 250' }}
                                loading="lazy"
                            />
                        </picture>
                    </a>
                )}
            </div>
        </div>
    );
};

export default SidebarAdBlock;

