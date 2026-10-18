import { renderHomePageFromPuckJSON } from "./renderHomePageFromPuckJSON";
import { extractTextFromDescription, calculateReadTimeFromText } from './storyUtils';
import { renderPageFromPuckJSON } from "../../lib/renderBlogPage";
import apiFetch from "../utils/api";
import env from "../utils/env";
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

/**
 * Publishes the Home page by:
 * 1. Fetching sections
 * 2. Fetching Home page data
 * 3. Fetching stories ready to publish
 * 4. Rendering to HTML
 * 5. Saving the HTML to the backend
 * 6. Saving the sitemap
 * 
 * @param {string} token - Auth token
 * @param {{ section?: string | string[], authors?: string[] }} [options] - Limit to one section page and these authors' story pages (ids or names)
 * @returns {Promise<void>}
 */
export async function publishHomePage(token, { section, authors } = {}) {
  try {
    const base = env.backendApi;
    const onlySection = getFirstCategoryValue(section).toLowerCase();
    const inOnlySection = (value) =>
      [].concat(value || []).some((entry) => String(entry).trim().toLowerCase() === onlySection);
    const onlyAuthors = [].concat(authors || []).map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean);
    const byOnlyAuthors = (story) =>
      [story.authorId, story.authorName].concat(story.byLine || []).some((entry) => onlyAuthors.includes(String(entry || "").trim().toLowerCase()));

    // 1. Fetch campaigns
    let campaigns = [];
    try {
      const campRes = await apiFetch(`${base}/getCampaigns`, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (campRes.ok) {
        const campData = await campRes.json();
        campaigns = (campData.campaigns || []).map(mapBackendCampaignToFrontend);
      }
    } catch (error) {
      console.warn("Failed to fetch campaigns:", error);
    }


    // 1. Fetch sections for navbar
    let sectionsList = [];
    try {
      const sectionsRes = await apiFetch(`${base}/taxonomy/section/values`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        if (Array.isArray(sectionsData.values)) {
          sectionsList = sectionsData.values;
        }
      }
    } catch (error) {
      console.warn("Failed to fetch sections, using empty list:", error);
    }

    // Fetch authors
    let authorsList = [];
    try {
      const authorsRes = await apiFetch(`${base}/getAuthors`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (authorsRes.ok) {
        const authorsData = await authorsRes.json();
        const rawAuthors = Array.isArray(authorsData) ? authorsData : (authorsData.authors || authorsData.data || []);
        authorsList = rawAuthors.map((dbAuthor, index) => ({
          id: dbAuthor.userId || dbAuthor.id || `author-${index}`,
          name: dbAuthor.authorName || dbAuthor.fullName || "",
          authorId: dbAuthor.userId || dbAuthor.id || "",
        }));
      }
    } catch (error) {
      console.warn("Failed to fetch authors, using empty list:", error);
    }

    // 2. Fetch latest page data from API
    const url = `${base}/pagestudio/page?pageType=Home`;

    const res = await apiFetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch page data: HTTP ${res.status}`);
    }

    const pageJson = await res.json();

    // 3. Fetch stories with publishUrl using the proper API
    const storiesRes = await apiFetch(`${base}/story/fetchReadyToPublish`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    });
    let storiesById = {};

    if (storiesRes.ok) {
      const storiesData = await storiesRes.json();
      const stories = storiesData.data || [];

      // Build storiesById map with all story fields including publishUrl
      stories.forEach((story) => {
        if (story.storyId) {
          const extractedText = extractTextFromDescription(story.description) || "";
          const computedReadTime = calculateReadTimeFromText(extractedText);

          storiesById[story.storyId] = {
            id: story.storyId,
            title: story.title,
            headline: story.title,
            summary:
              story.storySummary ||
              story.description?.blocks?.[0]?.data?.text ||
              "",
            category: getStoryTaxonomyCategory(story),
            taxonomyCategory: getStoryTaxonomyCategory(story),
            section: story.section,
            Section: story.Section || story.section,
            Category: story.Category || story.category,
            author: story.authorName || "Unknown Author",
            authorName: story.authorName || "Unknown Author",
            image: story.image || "",
            imageUrl: story.image || "",
            publishUrl: story.redirectUrl || "",
            slug: story.slug || "",
            updatedAt: story.updatedAt,
            createdAt: story.createdAt,
            authorId: story.authorId || "",
            byLine: story.byline || [],
            // Keep the full date fallback chain used by card/sort renderers (see renderBottomCard/List).
            proposedFilingDate: story.proposedFilingDate || story.publishDate || '',
            publishDate: story.proposedFilingDate || story.publishDate || undefined,
            publishedAt: story.publishedAt,
            socialImage: story.socialImage || "",
            socialHeadline: story.socialHeadline || "",
            description: story.description || {},
            fullDescription: extractedText,
            storySummary: story.storySummary || "",
            caption: story.mediaCaption || story.caption || "",
            altText: story.mediaAltText || story.altText || "",
            readTime: story.readTime || story.READ_TIME || computedReadTime || "",
          };
        }
      });
    }

    // 5. Render to HTML using the renderer
    const htmlContent = renderHomePageFromPuckJSON({
      pageType: pageJson.pageType || "Home",
      data: getPublishableData(pageJson.data),
      storiesById: storiesById,
      sections: sectionsList,
      activeSection: "HOME",
      campaigns: campaigns,
      authors: authorsList,
    });

    // 6. Call the API to save HTML
    console.log("Saving Home Page HTML...");
    const response = await apiFetch(`${base}/pagestudio/saveHomeHtml`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        htmlContent,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.message || "Failed to upload HTML");
    }

    // 6.5. NEW: Republish Section & Blog Landing Pages
    // A story publish passes its section, so only that section's page is rebuilt.
    const landingPages = onlySection
      ? sectionsList.filter(inOnlySection).map(s => ({ type: `Section-${s}`, activeSection: s, isSection: true }))
      : [
        ...sectionsList.map(s => ({ type: `Section-${s}`, activeSection: s, isSection: true })),
        { type: 'Blog', activeSection: 'Blog', isSection: false }
      ];

    console.log(`Starting sub-pages republish for ${landingPages.length} landing pages...`);

    // Fetch Blog Template if needed
    let blogTemplate = null;
    try {
      const blogRes = await apiFetch(`${base}/pagestudio/page?pageType=Blog`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (blogRes.ok) blogTemplate = await blogRes.json();
    } catch (e) {
      console.warn("Failed to fetch Blog template:", e);
    }

    for (const pageInfo of landingPages) {
      try {
        const pageRes = await apiFetch(`${base}/pagestudio/page?pageType=${encodeURIComponent(pageInfo.type)}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (pageRes.ok) {
          const pageJson = await pageRes.json();
          if (pageJson && pageJson.data) {
            console.log(`Republishing landing page: ${pageInfo.type}`);
            const html = renderHomePageFromPuckJSON({
              pageType: pageJson.pageType || pageInfo.type,
              data: getPublishableData(pageJson.data),
              storiesById: storiesById,
              sections: sectionsList,
              activeSection: pageInfo.activeSection,
              campaigns: campaigns,
              authors: authorsList,
            });

            const saveUrl = pageInfo.isSection
              ? `${base}/pagestudio/saveSectionHtml`
              : `${base}/pagestudio/saveSectionHtml`; // Backend slugifies sectionValue, 'blog' -> blog/index.html

            await apiFetch(saveUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : "",
              },
              body: JSON.stringify({
                htmlContent: html,
                sectionValue: pageInfo.activeSection
              }),
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to republish ${pageInfo.type}:`, err);
      }
    }

    // 6.6. NEW: Background trigger for all stories
    (async () => {
      try {
        console.log("Triggering background site-wide story sync...");

        // Helper to extract text for read time/summary
        const extractText = (desc) => {
          if (!desc) return "";
          if (typeof desc === 'string') return desc;
          return (desc.blocks || []).map(b => b.data?.text || "").join(" ");
        };

        // A story publish rebuilds only its authors' story pages.
        const allStories = Object.values(storiesById).filter(
          (story) => (!onlySection && !onlyAuthors.length) || byOnlyAuthors(story)
        );
        const batchSize = 5;

        for (let i = 0; i < allStories.length; i += batchSize) {
          const batch = allStories.slice(i, i + batchSize);
          await Promise.all(batch.map(async (story) => {
            try {
              // Fetch individual layout
              const individualPageRes = await apiFetch(`${base}/pagestudio/page?id=${story.id}&pageType=Blog`, {
                headers: { Authorization: token ? `Bearer ${token}` : "" },
              });

              const storyPuckJson = individualPageRes.ok ? await individualPageRes.json() : null;
              const pageJsonToUse = (storyPuckJson && storyPuckJson.data) ? storyPuckJson : blogTemplate;

              if (!pageJsonToUse) return;

              const fullDesc = extractText(story.description || {});
              const currentStory = {
                ...story,
                headline: story.title,
                fullDescription: fullDesc,
                readTime: calculateReadTimeFromText(extractTextFromDescription(story.description))
              };

              const htmlCode = renderPageFromPuckJSON(
                { ...pageJsonToUse, data: getPublishableData(pageJsonToUse.data), storiesById },
                {
                  sections: sectionsList,
                  currentStory: currentStory,
                  campaigns: campaigns,
                  authors: authorsList,
                }
              );

              await apiFetch(`${base}/pagestudio/saveHtml`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({
                  htmlContent: htmlCode,
                  slug: story.slug,
                  section: story.section || "General",
                  socialImage: story.socialImage || story.image || ""
                }),
              });
            } catch (storyErr) {
              console.warn(`Background sync failed for ${story.slug}:`, storyErr);
            }
          }));
        }
        console.log("Background site-wide story sync completed successfully.");
      } catch (err) {
        console.error("Critical error in background stories sync:", err);
      }
    })();

    // 7. Save sitemap
    try {
      await apiFetch(`${base}/pagestudio/saveSiteMap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      await apiFetch(`${base}/pagestudio/saveNewsSiteMap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
    } catch (error) {
      console.error("Error saving sitemap:", error);
    }

    return result;
  } catch (error) {
    console.error("Failed to publish home page:", error);
    throw error;
  }
}
