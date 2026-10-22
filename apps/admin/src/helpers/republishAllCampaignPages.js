import apiFetch from "../utils/api";
import env from "../utils/env";
import { renderPageFromPuckJSON } from "@builder/helpers/blog/renderBlogPage";
import { publishHomePage } from "./publishHomePage";
import { renderHomePageFromPuckJSON } from "@builder/helpers/renderHomePageFromPuckJSON";
import { extractTextFromDescription, calculateReadTimeFromText } from './storyUtils';
import { toast } from "react-hot-toast";
import { mapBackendCampaignToFrontend } from "./campaignMapper";
import { getPublishableData } from "./publishedSnapshot";

function getFirstCategoryValue(value) {
    if (Array.isArray(value)) {
        const firstCategory = value.find((entry) => typeof entry === "string" && entry.trim().length > 0);
        return firstCategory ? firstCategory.trim() : "";
    }

    return typeof value === "string" ? value.trim() : "";
}

function getStoryTaxonomyCategory(story) {
    return (
        story.taxonomyCategory ||
        getFirstCategoryValue(story.Category) ||
        story.category ||
        getFirstCategoryValue(story.Section) ||
        story.section ||
        "General"
    ).trim();
}

async function processInBatches(items, batchSize, handler) {
    const safeBatchSize = Math.max(1, Number(batchSize) || 1);
    let successCount = 0;

    for (let i = 0; i < items.length; i += safeBatchSize) {
        const batch = items.slice(i, i + safeBatchSize);
        const results = await Promise.allSettled(
            batch.map((item, index) => handler(item, i + index))
        );

        successCount += results.filter((r) => r.status === "fulfilled" && r.value === true).length;
    }

    return successCount;
}

// Queues a backend publish job; it keeps running after this tab is closed.
async function startBackendRepublish(base, authHeaders, change) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        let giveUp;
        const stopWaiting = new Promise((resolve) => {
            giveUp = setTimeout(() => resolve("waiting"), 6000);
        });
        // The backend publishes inside this request, so it can stay open for minutes.
        const request = apiFetch(`${base}/pagestudio/republishAll`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify(change),
        });

        try {
            const res = await Promise.race([request, stopWaiting]);
            if (res === "waiting") {
                request.catch(() => {});
                return true;
            }
            const body = await res.json().catch(() => null);
            if (res.ok && body?.jobId) return true;
            // 409: a job is already running; ours is queued behind it or it just finished.
            if (res.status === 409 && body?.followUpQueued) return true;
            if (res.status !== 409) return false;
        } catch (e) {
            console.warn("Backend republish could not be started:", e);
            return false;
        } finally {
            clearTimeout(giveUp);
        }
    }
    return false;
}

const REPUBLISH_LABELS = {
    chrome: "Site-wide publish",
    campaign: "Campaign publish",
    story: "Story publish",
    blog: "Story pages publish",
};
const REPUBLISH_TOAST_ID = "republish-status";
let republishPoll = null;
let republishSeen = false;
let republishErrors = 0;
let republishLabelOverride = null;

// Shows the backend publish job's progress until it ends. Safe to call repeatedly.
export function watchRepublishJob(token, justStarted = false, label = null) {
    if (!token) return;
    if (justStarted) {
        republishSeen = true;
        republishLabelOverride = label;
    }
    if (republishPoll) return;

    const stop = () => {
        clearInterval(republishPoll);
        republishPoll = null;
        republishSeen = false;
        republishErrors = 0;
        republishLabelOverride = null;
    };

    const check = async () => {
        try {
            const res = await apiFetch(`${env.backendApi}/pagestudio/republishAll/status`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { job } = await res.json();
            republishErrors = 0;
            const runningLabel = REPUBLISH_LABELS[job?.reason] || "Publish";
            const label = republishLabelOverride || runningLabel;

            if (job?.isActive) {
                republishSeen = true;
                const progress = job.total ? `: ${job.done} of ${job.total} pages` : "";
                // While queued, the pass that is running is someone else's; name it as what it is.
                const queued = job.queuedByMe
                    ? ` Your ${republishLabelOverride ? republishLabelOverride.toLowerCase() : "change"} is queued next.`
                    : "";
                toast.loading(`${job.queuedByMe ? runningLabel : label} in progress${progress}.${queued}`, { id: REPUBLISH_TOAST_ID });
                return;
            }

            if (republishSeen && job?.status === "completed") {
                toast.success(`${label} finished. The site is up to date.`, { id: REPUBLISH_TOAST_ID });
            } else if (republishSeen && job?.status === "completed_with_errors") {
                toast.error(`${label} finished, but ${job.failedCount} page(s) failed.`, { id: REPUBLISH_TOAST_ID });
            } else if (republishSeen && job?.status === "failed") {
                toast.error(`${label} failed${job.error ? `: ${job.error}` : "."}`, { id: REPUBLISH_TOAST_ID });
            } else {
                toast.dismiss(REPUBLISH_TOAST_ID);
            }
            stop();
        } catch (e) {
            console.warn("Could not read publish status:", e);
            // A single failed read is not the end of the job; give up after three in a row.
            republishErrors += 1;
            if (republishErrors < 3) return;
            toast.dismiss(REPUBLISH_TOAST_ID);
            stop();
        }
    };

    republishPoll = setInterval(check, 5000);
    check();
}

// Queues the backend rebuild of Home and the section, author and story pages after a story publish.
export async function republishStoryPages(token, story) {
    const authHeaders = { Authorization: token ? `Bearer ${token}` : "" };
    const started = await startBackendRepublish(env.backendApi, authHeaders, { reason: "story", story });
    if (started) watchRepublishJob(token, true);
    return started;
}

/**
 * Republishes all campaigns across all pages:
 * 1. Updates Home Page
 * 2. Updates all "Ready to Publish" stories with latest campaign data
 *    - Uses shared Blog page template for fast bulk re-render
 *    - Pushes story HTML in concurrent batches
 * 
 * @param {string} token - Auth token
 * @param {string} [label] - Status toast label when this is not a campaign change
 * @returns {Promise<void>}
 */
export async function republishAllCampaignPages(token, label = null) {
    try {
        const base = env.backendApi;
        const authHeaders = {
            Authorization: token ? `Bearer ${token}` : "",
        };

        // Preferred path: one backend job covers every page type.
        if (await startBackendRepublish(base, authHeaders, { reason: "campaign" })) {
            watchRepublishJob(token, true, label);
            return;
        }
        console.warn("Backend republish unavailable; falling back to in-browser sync (home, sections, stories only).");

        // 1. Start Home sync immediately while loading shared data in parallel.
        console.log("Syncing Home Page...");
        const homeSyncPromise = publishHomePage(token);

        // 2. Fetch all shared inputs in parallel.
        const [
            campaignsResult,
            sectionsResult,
            authorsResult,
            blogTemplateResult,
            storiesResult,
        ] = await Promise.allSettled([
            apiFetch(`${base}/getCampaigns`, { headers: authHeaders }),
            apiFetch(`${base}/taxonomy/section/values`, { headers: authHeaders }),
            apiFetch(`${base}/getAuthors`, { headers: authHeaders }),
            apiFetch(`${base}/pagestudio/page?pageType=Blog`, { headers: authHeaders }),
            apiFetch(`${base}/story/fetchReadyToPublish`, { headers: authHeaders }),
        ]);

        let campaigns = [];
        if (campaignsResult.status === "fulfilled" && campaignsResult.value.ok) {
            const campData = await campaignsResult.value.json();
            campaigns = (campData.campaigns || []).map(mapBackendCampaignToFrontend);
        } else {
            console.warn("Failed to fetch campaigns for batch sync");
        }

        let sectionsList = [];
        if (sectionsResult.status === "fulfilled" && sectionsResult.value.ok) {
            const sectionsData = await sectionsResult.value.json();
            sectionsList = sectionsData.values || [];
        } else {
            console.warn("Failed to fetch sections for batch sync");
        }

        let authorsList = [];
        if (authorsResult.status === "fulfilled" && authorsResult.value.ok) {
            const authorsData = await authorsResult.value.json();
            const rawAuthors = Array.isArray(authorsData)
                ? authorsData
                : (authorsData.authors || authorsData.data || []);
            authorsList = rawAuthors.map((dbAuthor, index) => ({
                id: dbAuthor.userId || dbAuthor.id || `author-${index}`,
                name: dbAuthor.authorName || dbAuthor.fullName || "",
                authorId: dbAuthor.userId || dbAuthor.id || "",
            }));
        } else {
            console.warn("Failed to fetch authors for batch sync");
        }

        let blogTemplate = null;
        if (blogTemplateResult.status === "fulfilled" && blogTemplateResult.value.ok) {
            blogTemplate = await blogTemplateResult.value.json();
        } else {
            console.warn("Failed to fetch Blog template");
        }

        if (storiesResult.status !== "fulfilled" || !storiesResult.value.ok) {
            throw new Error("Failed to fetch stories for batch sync");
        }
        const storiesData = await storiesResult.value.json();
        const allStories = storiesData.data || [];

        await homeSyncPromise;

        console.log(`Starting bulk re-render for ${allStories.length} stories...`);

        // Build storiesById map for recommendations
        const storiesById = {};
        allStories.forEach((story) => {
            const storyId = story.storyId || story.id || story.slug;
            if (storyId) {
                const extractedText = extractTextFromDescription(story.description) || "";
                const computedReadTime = calculateReadTimeFromText(extractedText);

                storiesById[storyId] = {
                    id: storyId,
                    storyId: storyId,
                    title: story.title,
                    headline: story.title,
                    summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || "",
                    category: getStoryTaxonomyCategory(story),
                    taxonomyCategory: getStoryTaxonomyCategory(story),
                    section: story.section,
                    Section: story.Section || story.section,
                    Category: story.Category || story.category,
                    author: story.authorName || "Unknown Author",
                    authorName: story.authorName || "Unknown Author",
                    authorId: story.authorId || "",
                    byLine: story.byline || [],
                    // Keep the full date fallback chain used by card/sort renderers (see renderBottomCard/List).
                    proposedFilingDate: story.proposedFilingDate || story.publishDate || '',
                    publishDate: story.proposedFilingDate || story.publishDate || undefined,
                    socialImage: story.socialImage || "",
                    socialHeadline: story.socialHeadline || "",
                    description: story.description || {},
                    fullDescription: extractedText,
                    storySummary: story.storySummary || "",
                    image: story.image || story.imageUrl || '',
                    imageUrl: story.image || story.imageUrl || '',
                    publishUrl: story.redirectUrl || story.publishUrl || '',
                    slug: story.slug || '',
                    updatedAt: story.updatedAt,
                    createdAt: story.createdAt,
                    publishedAt: story.publishedAt || null,
                    caption: story.mediaCaption || story.caption || story.imageDescription || "",
                    mediaCaption: story.mediaCaption || story.caption || story.imageDescription || "",
                    altText: story.mediaAltText || story.altText || "",
                    mediaAltText: story.mediaAltText || story.altText || "",
                    readTime: story.readTime || story.READ_TIME || computedReadTime || "",
                };
            }
        });

        // 3. Re-publish all section pages in concurrent batches.
        const sectionsToSync = sectionsList.length > 0 ? sectionsList : ["New Zealand", "World", "Politics", "Culture", "Immigration", "Entertainment", "Sport", "Business", "Opinion"];
        await processInBatches(sectionsToSync, 12, async (section) => {
            try {
                const resolvedPageType = `Section-${section}`;
                let sectionPageJson = null;
                const sectionPageRes = await apiFetch(`${base}/pagestudio/page?pageType=${encodeURIComponent(resolvedPageType)}`, {
                    headers: authHeaders,
                });
                if (sectionPageRes.ok) {
                    sectionPageJson = await sectionPageRes.json();
                }

                if (sectionPageJson && sectionPageJson.data) {
                    const htmlContent = renderHomePageFromPuckJSON({
                        pageType: sectionPageJson.pageType || resolvedPageType,
                        data: getPublishableData(sectionPageJson.data),
                        storiesById: storiesById,
                        sections: sectionsList,
                        activeSection: section,
                        campaigns: campaigns,
                        authors: authorsList,
                    });

                    await apiFetch(`${base}/pagestudio/saveSectionHtml`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...authHeaders,
                        },
                        body: JSON.stringify({
                            htmlContent,
                            sectionValue: section,
                        }),
                    });
                    console.log(`Successfully synced section: ${section}`);
                    return true;
                }
            } catch (err) {
                console.warn(`Failed to sync section ${section}:`, err);
            }
            return false;
        });

        const extractRichTextFromDescription = (description) => {
            if (!description) return "";
            if (typeof description === "string") {
                try {
                    const parsed = JSON.parse(description);
                    if (parsed && typeof parsed === "object") return extractRichTextFromDescription(parsed);
                } catch (e) { }
                return description;
            }
            const maybeBlocks = description?.blocks;
            if (Array.isArray(maybeBlocks)) {
                return maybeBlocks
                    .map((block) => {
                        const data = block.data || {};
                        if (block.type === "image") {
                          const imgUrl = data.file?.url || data.url || "";
                          const rawCaption = data.caption || data.file?.caption || data.text || data.title || "";
                          const caption = (rawCaption && !rawCaption.startsWith("Image contains:")) ? rawCaption : "";
                          return `<div class="w-full mb-2"><img src="${imgUrl}" alt="${caption || ""}" style="display: block; max-width: 100%; width: auto; height: auto; object-fit: contain;" loading="lazy"/>${caption ? `<div class="story-caption" style="text-align: left; width: 100%; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${caption}</div>` : ''}</div>`;
                        }
                        else if (block.type === "caption") {
                          const trimmedText = (data.text || "").trim();
                          if (!trimmedText) return "";
                          return `<div class="story-caption" style="text-align: left; width: 100%; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedText}</div>`;
                        }
                        else if (block.type === "paragraph" && typeof data.text === "string") return `<p>${data.text}</p>`;
                        else if (block.type === "header") {
                          const level = data.level || 2;
                          return `<h${level}>${data.text || ""}</h${level}>`;
                        }
                        else if (block.type === "list") {
                          const style = data.style === "ordered" ? "ol" : "ul";
                          const items = Array.isArray(data.items) 
                            ? data.items.map(item => `<li>${typeof item === 'string' ? item : item.content || ""}</li>`).join("") 
                            : "";
                          return `<${style}>${items}</${style}>`;
                        }
                        else if (block.type === "quote") {
                          const text = data.text || "";
                          const alignment = data.alignment || "left";
                          const caption = data.caption ? `<cite>${data.caption}</cite>` : "";
                          return `<blockquote style="text-align: ${alignment};">${text}${caption}</blockquote>`;
                        }
                        else if (block.type === "embed" || block.type === "youtube" || block.type === "instagram" || block.type === "soundcloud") {
                          const embedUrl = data.embed || data.source;
                          if (embedUrl) {
                            let captionMaxWidth = '800px';
                            if (data.service === 'instagram' || block.type === 'instagram') {
                              captionMaxWidth = '550px';
                            }
                            const trimmedCaption = (data.caption || "").trim();
                            const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: ${captionMaxWidth}; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
                            let style = 'width: 100%; border: none; margin: 0 auto; display: block;';
                            let height = data.height || 400;
                            let width = data.width || '100%';
                            
                            if (data.service === 'instagram') {
                              style += ' max-width: 550px; height: 700px;';
                            } else if (data.service === 'soundcloud') {
                              style += ' height: 300px;';
                            } else if (data.service === 'youtube') {
                              style += ' aspect-ratio: 16/9; max-width: 800px;';
                            }
                            
                          return `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${embedUrl}" style="${style}" height="${height}" width="${width}" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
                          }
                          return "";
                        }
                        else if (block.type === "facebook") {
                          const embedUrl = data.url || data.embed || data.source;
                          if (embedUrl) {
                            const trimmedCaption = (data.caption || "").trim();
                            const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 800px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
                            const encodedUrl = encodeURIComponent(embedUrl);
                            const fbSrc = `https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=false&width=500`;
                            return `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${fbSrc}" style="width: 100%; border: none; margin: 0 auto; display: block;" height="497" width="100%" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
                          }
                          return "";
                        }
                        else if (block.type === "twitter") {
                          const tweetHtml = (data.html || '').replace(/\n/g, '');
                          const trimmedCaption = (data.caption || "").trim();
                          const tweetCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 550px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
                          return `<div class="twitter-embed-wrapper mb-2 w-full flex flex-col items-center">${tweetHtml}${tweetCaption}</div>`;
                        }
                        return data.text || data.caption || data.content || block.text || "";
                    })
                    .join("");
            }
            return "";
        };

        // 4. Re-publish all blog stories in concurrent batches using shared Blog template.
        if (!blogTemplate || !blogTemplate.data) {
            console.warn("Skipping blog sync because Blog template is unavailable");
        } else {
            const processedCount = await processInBatches(allStories, 25, async (story) => {
                try {
                    const pageJsonToUse = blogTemplate;

                    const fullDescription = extractTextFromDescription(story.description);

                    const resolvedStoryId = story.storyId || story.id || story.slug;
                    const currentStory = {
                        id: resolvedStoryId,
                        storyId: resolvedStoryId,
                        title: story.title,
                        slug: story.slug,
                        publishUrl: story.redirectUrl || story.publishUrl,
                        headline: story.title || "Untitled Story",
                        summary: story.storySummary || (fullDescription ? fullDescription.slice(0, 200) + '...' : ''),
                        fullDescription: fullDescription,
                        description: story.description,
                        category: story.section || story.category || "General",
                        section: story.section || story.category || "General",
                        author: story.authorName || "OpenPress Staff",
                        authorName: story.authorName,
                        authorId: story.authorId,
                        readTime: calculateReadTimeFromText(fullDescription),
                        imageUrl: story.image || story.imageUrl,
                        socialImage: story.socialImage || story.image,
                        imageAlt: story.title || "Story image",
                        caption: story.mediaCaption || story.caption || story.imageDescription || "",
                        mediaCaption: story.mediaCaption || story.caption || story.imageDescription || "",
                        altText: story.mediaAltText || story.altText || "",
                        mediaAltText: story.mediaAltText || story.altText || "",
                        keywords: story.keywords || [],
                        byLine: story.byline || [],
                        publishDate: story.publishedAt || story.proposedFilingDate || story.createdAt || null,
                        publishedAt: story.publishedAt || null,
                        updatedAt: story.updatedAt || null,
                    };

                    // Render HTML with campaigns
                    const htmlCode = renderPageFromPuckJSON(
                        { ...pageJsonToUse, data: getPublishableData(pageJsonToUse.data), storiesById },
                        {
                            sections: sectionsList,
                            currentStory: currentStory,
                            campaigns: campaigns,
                            authors: authorsList,
                        }
                    );

                    // Save to S3
                    await apiFetch(`${base}/pagestudio/saveHtml`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...authHeaders,
                        },
                        body: JSON.stringify({
                            htmlContent: htmlCode,
                            slug: story.slug,
                            section: story.section || "General",
                            socialImage: story.socialImage || story.image || ""
                        }),
                    });
                    return true;

                } catch (err) {
                    console.error(`Failed to sync campaign to story ${story.slug}:`, err);
                }
                return false;
            });

            console.log(`Blog sync completed. Success: ${processedCount}/${allStories.length}`);
        }

        toast.success(`syncing completed`);
        console.log("Global campaign sync complete!");
    } catch (error) {
        toast.error("Campaign sync failed. Check console.");
        console.error("Global campaign sync failed:", error);
        throw error;
    }
}
