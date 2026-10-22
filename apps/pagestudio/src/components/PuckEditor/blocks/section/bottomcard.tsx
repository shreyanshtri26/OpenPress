import React, { useEffect, useState } from 'react';
import { findStoryById, type Story } from '../../storyData';
import { readTimeFromDescription } from '../../storyOverride';

// Utility function to format date as "Jan 12, 2026"
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Jan 12, 2025';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Jan 12, 2025';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        return `${month} ${day}, ${year}`;
    } catch {
        return 'Jan 12, 2025';
    }
};

export type BottomCardProps = {
    id?: string;
    storyId?: string;
    imageUrl?: string;
    title?: string;
    description?: string;
    date?: string;
    readTime?: string;
};

export const BottomCard: React.FC<BottomCardProps> = ({
    storyId,
    imageUrl: fallbackImage,
    title: fallbackTitle,
    description: fallbackDescription,
    date: fallbackDate,
    readTime: fallbackReadTime,
}) => {
    const [story, setStory] = useState<Story | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        if (!storyId) {
            setStory(null);
            return;
        }

        const found = findStoryById(storyId);
        setStory(found || null);

        if (found?.imageUrl) {
            const img = new Image();
            img.src = found.imageUrl;
            img.onload = () => setImageLoaded(true);
        } else {
            setImageLoaded(true);
        }
    }, [storyId]);

    const displayImage = story?.imageUrl || fallbackImage || '/openpress-share.png';
    const displayTitle = fallbackTitle || story?.headline || 'Featured story';
    const displayDescription = fallbackDescription || story?.storySummary || 'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque elit quisque faucibus.';

    const html = (displayDescription || "")
        .split(/(<[^>]+>)/g)
        .map((part: string) =>
            part.startsWith('<')
                ? part
                : part.replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>')
        )
        .join('');

    const normalizedDescription = html
        .replace(/&nbsp;/g, ' ')
        .replace(/\u00A0/g, ' ');
    const displayDate = formatDate(fallbackDate || story?.proposedFilingDate || story?.publishDate || story?.publishedAt || story?.createdAt || story?.updatedAt);

    const displayReadTime = story
        ? readTimeFromDescription(story.description || story.fullDescription)
        : (fallbackReadTime || '1 min read');

    // Get publishUrl from story
    const publishUrl = story?.publishUrl;

    // Handle click to navigate
    const handleClick = () => {
        if (publishUrl) {
            window.open(publishUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div
            className={`flex flex-col lg:flex-row gap-4 bg-white border-b border-gray-200 pb-4 ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity`}
            onClick={handleClick}
            role={publishUrl ? "button" : undefined}
            tabIndex={publishUrl ? 0 : undefined}
            onKeyDown={(e) => {
                if (publishUrl && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            {/* Image Section - Stack on mobile, Left on desktop */}
            <div className="flex-shrink-0 w-full lg:w-[250px] h-auto aspect-video lg:h-[170px] overflow-hidden">
                <img
                    key={displayImage}
                    src={displayImage}
                    alt={displayTitle}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    loading="lazy"
                />
            </div>

            {/* Content Section - Right Side */}
            <div className="flex-1 flex flex-col justify-between py-1">
                {/* Title */}
                <h3 className="text-[22px] font-extrabold font-libre text-black leading-tight mb-2">
                    {displayTitle}
                </h3>

                {/* Description */}
                <p
                    className="text-m text-gray-700  font-[Merriweather]  mb-3"
                    dangerouslySetInnerHTML={{ __html: normalizedDescription }}
                />

                {/* Meta Information */}
                <div className="flex items-center gap-2 font-share text-[12px] text-black">
                    <span>{displayDate}</span>
                    <span>|</span>
                    <span>{displayReadTime}</span>
                </div>
            </div>
        </div>
    );
};

export default BottomCard;
