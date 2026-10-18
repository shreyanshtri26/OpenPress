import React from 'react';

export type InStoryAdProps = {
    id?: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
    storyId?: string;
    fallbackBlock?: any;
};

export const InStoryAdBlock: React.FC<InStoryAdProps> = ({
    id = 'instory-ad',
    desktopImageUrl,
    mobileImageUrl,
    linkUrl = '#',
    altText = 'Advertisement',
    fallbackBlock,
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
    
    // In the editor, we always want to show the ad slot placeholder even if it's empty
    // so the user can see where the ad is placed and change its settings.
    // MODIFICATION: Always show placeholder in editor even if campaign is unpaused
    const isEmpty = true; // Always true for editor display


    return (
        <div id={id} className="w-full flex justify-center items-center py-6 bg-transparent">
            <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.1em] mb-2">
                    Advertisement
                </span>
                {isEmpty ? (
                    <div className="w-[300px] h-[250px] border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-[10px] uppercase tracking-widest font-bold p-4 text-center">
                        <span>In-Story Ad Slot</span>
                        {fallbackBlock && (
                            <span className="text-[8px] mt-2 text-blue-400 normal-case tracking-normal">
                                Fallback: {fallbackBlock.type}
                            </span>
                        )}
                    </div>
                ) : (
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block w-[300px] shadow-sm border border-gray-100">
                        <picture>
                            {mobileImageUrl && (
                                <source media="(max-width: 768px)" srcSet={mobileImageUrl} />
                            )}
                            <img
                                src={desktopImageUrl}
                                alt={altText}
                                className="w-[300px] h-[250px] object-cover"
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

export default InStoryAdBlock;
