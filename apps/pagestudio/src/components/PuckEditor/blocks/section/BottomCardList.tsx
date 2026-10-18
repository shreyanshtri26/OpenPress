import React, { useEffect, useState } from 'react';
import { getStories, type Story } from '../../storyData';
import { useActiveSection } from '../../ActiveSectionContext';
import BottomCard from './bottomcard';
import { findAuthorById } from '../../authorData';

export type BottomCardListProps = {
    id?: string;
};

export const BottomCardList: React.FC<BottomCardListProps> = ({ id }) => {
    const [sortedStories, setSortedStories] = useState<Story[]>([]);
    const [visibleCount, setVisibleCount] = useState(10);

    const { activeSection, activeAuthor } = useActiveSection();
    console.log("active section >>>", activeSection);
    console.log("active author >>>", activeAuthor);

    useEffect(() => {
        const stories = getStories();
        if (stories.length === 0) return;

        // 1. Filter by section or author
        let filtered = stories;

        if (activeAuthor) {
            const authorData = findAuthorById(activeAuthor);
            const normalizedAuthorName = (authorData?.name || '').trim().toLowerCase();

            filtered = filtered.filter((s: Story) => {
                // Match ONLY by normalized name in byLine array
                if (normalizedAuthorName) {
                    return s.byLine?.some(name => {
                        const byLineLower = name.trim().toLowerCase();
                        if (!byLineLower) return false;
                        // Match if Author Name includes ByLine (e.g., "Ravi Bajpai" includes "Ravi")
                        // Or if ByLine includes Author Name (e.g., "Ravi Bajpai (Guest)" includes "Ravi Bajpai")
                        return normalizedAuthorName.includes(byLineLower) || byLineLower.includes(normalizedAuthorName);
                    }) || false;
                }
                return false;
            });
        } else if (activeSection) {
            filtered = filtered.filter(s =>
                (s.kicker?.toUpperCase() === activeSection.toUpperCase()) ||
                (s.category?.toUpperCase() === activeSection.toUpperCase())
            );
        }

        // 2. Sort by proposedFilingDate (newest to oldest)
        const sorted = [...filtered].sort((a, b: Story) => {
            const dateA = new Date(a.proposedFilingDate || a.publishDate || a.publishedAt || a.createdAt || a.updatedAt || 0).getTime();
            const dateB = new Date(b.proposedFilingDate || b.publishDate || b.publishedAt || b.createdAt || b.updatedAt || 0).getTime();
            return dateB - dateA; // Newest first
        });

        setSortedStories(sorted);
    }, [activeSection, activeAuthor]); // remount key in PuckEditor handles stories.length reactivity

    const handleLoadMore = () => {
        setVisibleCount((prevCount: number) => prevCount + 10);
    };

    const visibleStories = sortedStories.slice(0, visibleCount);
    const hasMore = visibleCount < sortedStories.length;

    return (
        <div id={id} className="flex flex-col gap-6">
            {visibleStories.map((story: Story) => (
                <BottomCard
                    key={story.id}
                    storyId={story.id}
                />
            ))}
            {hasMore && (
                <button
                    onClick={handleLoadMore}
                    className="mt-1 px-4 h-[25px] font-share border border-gray-700 text-gray-700 font-semibold   transition-colors duration-200 self-center"
                >
                    LOAD MORE
                </button>
            )}
        </div>
    );
};

export default BottomCardList;
