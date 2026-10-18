import React from 'react';

export type LeaderboardAdProps = {
    id?: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
    fallbackBlock?: any;
    desktopDimensions?: string;
    mobileDimensions?: string;
};

export const LeaderboardAdBlock: React.FC<LeaderboardAdProps> = ({
    id = 'leaderboard-ad',
    desktopImageUrl,
    mobileImageUrl,
    linkUrl = '#',
    altText = 'Advertisement',
    fallbackBlock,
    desktopDimensions = '',
    mobileDimensions = '',
}) => {
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

    const [isDonor, setIsDonor] = React.useState(() => isDonorUser() && !isEditor);
    React.useEffect(() => {
        setIsDonor(isDonorUser() && !isEditor);
        const handleStorage = () => setIsDonor(isDonorUser() && !isEditor);
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    if (isDonor) return null;

    // MODIFICATION: Always show placeholder in editor even if campaign is unpaused
    const isEmpty = true; // Always true for editor display

    const parseDim = (dim: string) => {
        const parts = (dim || '').replace(/\s+/g, '').replace('x', '*').split('*').map(Number);
        return { w: parts[0] || 0, h: parts[1] || 0 };
    };

    const d = parseDim(desktopDimensions);
    const m = parseDim(mobileDimensions);

    const finalDw = d.w || 728;
    const finalDh = d.h || 90;
    const finalMw = m.w || 320;
    const finalMh = m.h || 50;

    // In the editor, we always want to show the ad slot placeholder even if it's empty
    // so the user can see where the ad is placed and change its settings.

    return (
        <div id={id} className="w-full flex justify-center items-center pt-2 pb-4 bg-transparent">
            <style dangerouslySetInnerHTML={{
                __html: `
                #${id} .ad-link {
                    width: 100%;
                    max-width: ${finalDw}px;
                    height: ${isEmpty ? `${finalDh}px` : 'auto'};
                }
                #${id} .ad-desktop-img {
                    aspect-ratio: ${finalDw} / ${finalDh};
                }
                @media (max-width: 768px) {
                    #${id} .ad-link {
                        max-width: ${finalMw}px;
                        height: ${isEmpty ? `${finalMh}px` : 'auto'};
                    }
                    #${id} .ad-desktop-img {
                        aspect-ratio: ${finalMw} / ${finalMh};
                    }
                }
            `}} />
            <div className="w-full px-4 md:px-8 xl:px-0 flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-[0.1em] mb-2 self-start md:self-center">
                    Advertisement
                </span>
                {isEmpty ? (
                    <div className="w-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[10px] uppercase tracking-widest font-bold ad-link">
                        <div className="flex flex-col items-center">
                            <span>Empty Leaderboard Ad Slot</span>
                            {desktopDimensions && (
                                <span className="text-[8px] mt-1 normal-case tracking-normal">
                                    Size: {desktopDimensions} (Desktop) / {mobileDimensions} (Mobile)
                                </span>
                            )}
                            {fallbackBlock && (
                                <span className="text-[8px] mt-1 text-blue-400 normal-case tracking-normal">
                                    Fallback: {fallbackBlock.type}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full mx-auto ad-link">
                        <picture>
                            {mobileImageUrl && (
                                <source media="(max-width: 768px)" srcSet={mobileImageUrl} />
                            )}
                            <img
                                src={desktopImageUrl}
                                alt={altText}
                                className="w-full h-auto object-contain ad-desktop-img"
                                loading="lazy"
                            />
                        </picture>
                    </a>
                )}
            </div>
        </div>
    );
};

export default LeaderboardAdBlock;
