/**
 * Fetch stories from the API and transform them for use in render functions.
 * Mirroring the logic from Pagebuilder's apiService.ts and storyData.ts.
 */

import apiFetch from '../../src/utils/api';
import { extractTextFromDescription, calculateReadTimeFromText } from '../../src/helpers/storyUtils';

function calculateReadTime(text = "") {
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    return `${minutes} min read`;
}

export async function fetchReadyToPublishStories(apiUrl, token) {
    try {
        console.log("Fetching stories from:", `${apiUrl}/story/fetchReadyToPublish`);
        const response = await apiFetch(`${apiUrl}/story/fetchReadyToPublish`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch stories: ${response.status}`);
        }

        const data = await response.json();
        const apiStories = data.data || [];

        // Transform stories to match the internal Story type used by render functions
        const transformedStories = apiStories.map(story => {
            if (!story.storyId) return null;

            let descriptionObj = story.description;
            if (typeof descriptionObj === 'string') {
                try {
                    const parsed = JSON.parse(descriptionObj.trim());
                    if (Array.isArray(parsed)) {
                        descriptionObj = { blocks: parsed };
                    } else if (parsed && typeof parsed === 'object') {
                        if (Array.isArray(parsed.blocks)) {
                            descriptionObj = parsed;
                        } else {
                            descriptionObj = { blocks: [parsed] };
                        }
                    }
                } catch (e) {
                    // Not JSON
                }
            } else if (Array.isArray(descriptionObj)) {
                descriptionObj = { blocks: descriptionObj };
            }

            // Extract summary and full description from blocks
            let summary = story.storySummary || '';
            let fullDescription = '';

            if (descriptionObj?.blocks && Array.isArray(descriptionObj.blocks)) {
                const textBlocks = descriptionObj.blocks
                    .filter(block => block?.data?.text)
                    .map(block => block.data.text);

                fullDescription = textBlocks.join('\n\n');
                if (!summary && textBlocks.length > 0) {
                    summary = textBlocks[0].substring(0, 200);
                }
            }

            const computedReadTime = calculateReadTimeFromText(extractTextFromDescription(descriptionObj));

            return {
                id: story.storyId,
                title: story.title,
                headline: story.title,
                summary: summary,
                storySummary: story.storySummary || summary,
                description: descriptionObj,
                category: story.category || story.section || 'General',
                section: story.section,
                author: story.authorName || 'Unknown Author',
                authorName: story.authorName || 'Unknown Author',
                authorId: story.authorId || '',
                image: story.image || '',
                imageUrl: story.image || '',
                publishUrl: story.redirectUrl || '',
                slug: story.slug || '',
                updatedAt: story.updatedAt,
                createdAt: story.createdAt,
                proposedFilingDate: story.proposedFilingDate || story.publishDate || '',
                publishDate: story.proposedFilingDate || story.publishDate || undefined,
                publishedAt: story.publishedAt,
                byLine: story.byline || [],
                fullDescription: fullDescription,
                readTime: story.readTime || story.READ_TIME || computedReadTime,
                imageAuthor: story.imageAuthor || 'Staff Photo',
                imageAlt: story.imageAlt || story.title || 'Story image',
                kicker: story.kicker || story.section,
                imageDescription: story.imageDescription || '',
                socialImage: story.socialImage || story.image || '',
                socialHeadline: story.socialHeadline || story.title || '',
                caption: story.mediaCaption || story.caption || '',
                altText: story.mediaAltText || story.altText || '',
                imageFocalPoint: story.imageFocalPoint || { x: 50, y: 50 }
            };
        }).filter(Boolean);

        // Convert array to a map indexed by storyId
        const storiesById = {};
        transformedStories.forEach(story => {
            storiesById[story.id] = story;
        });

        return storiesById;
    } catch (error) {
        console.error("Error fetching stories in storyService:", error);
        return {};
    }
}
