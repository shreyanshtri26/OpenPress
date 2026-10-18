import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory, lookupUsers } from "./storyHelper.mjs";

export const handler = async (event) => {
  try {
    const params = event?.queryStringParameters || {};
    const sectionValue = params.section;

    const rawStories = await db
      .select()
      .from(stories)
      .where(eq(stories.status, "published"))
      .orderBy(desc(stories.publishedAt), desc(stories.createdAt));

    let formattedStories = rawStories.map(formatStory);

    if (sectionValue) {
      formattedStories = formattedStories.filter((s) => {
        const sec = s.Section || s.section;
        return typeof sec === "string" && sec.toLowerCase() === sectionValue.toLowerCase();
      });
    }

    // Same enrichment as the original endpoint: author names and a site-relative redirectUrl.
    const userMap = await lookupUsers([
      ...new Set(formattedStories.flatMap((s) => [s.authorId, s.assignedTo]).filter((v) => typeof v === "string" && v)),
    ]);
    const label = (id) => userMap.get(id) || `Unknown (${id.slice(0, 8)})`;
    const siteUrl = process.env.FRONTEND_WEBSITE_URL?.replace(/\/+$/, "");
    const enriched = formattedStories.map((s) => ({
      ...s,
      redirectUrl: siteUrl && typeof s.publishUrl === "string" && s.publishUrl.startsWith(siteUrl) ? s.publishUrl.slice(siteUrl.length) : s.publishUrl,
      authorName: s.authorId ? label(s.authorId) : "Unknown Author",
      assignedToName: typeof s.assignedTo === "string" && s.assignedTo ? label(s.assignedTo) : null,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Published stories fetched successfully",
        count: enriched.length,
        data: enriched,
        stories: enriched,
        Items: enriched,
      }),
    };
  } catch (err) {
    console.error("fetchReadyToPublish error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};