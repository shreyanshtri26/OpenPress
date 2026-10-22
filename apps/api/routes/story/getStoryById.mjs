import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory, lookupUsers } from "./storyHelper.mjs";

export const handler = async (event) => {
  try {
    const qsId = event.queryStringParameters?.storyId;
    let storyId = qsId;
    if (!storyId && event.body) {
      try {
        const body = JSON.parse(event.body || "{}");
        storyId = body.storyId;
      } catch {
        // ignore
      }
    }

    if (!storyId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Invalid or missing story ID" }),
      };
    }

    const [rawStory] = await db.select().from(stories).where(eq(stories.storyId, storyId));
    if (!rawStory) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Story not found" }),
      };
    }

    const story = formatStory(rawStory);

    const userIds = new Set();
    if (story.authorId) userIds.add(story.authorId);
    if (story.assignedTo) {
      if (Array.isArray(story.assignedTo)) story.assignedTo.forEach(uid => userIds.add(uid));
      else userIds.add(story.assignedTo);
    }

    const userMap = await lookupUsers(Array.from(userIds));

    const enhancedStory = {
      ...story,
      authorName: userMap.get(story.authorId) || `Unknown Author (${String(story.authorId || '').slice(0, 8)})`,
      assignedToName: story.assignedTo
        ? (userMap.get(story.assignedTo) || `Unknown User (${String(story.assignedTo || '').slice(0, 8)})`)
        : null
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Story retrieved successfully",
        data: enhancedStory
      }),
    };
  } catch (err) {
    console.error("❌ Error retrieving story:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error",
        error: err.message
      }),
    };
  }
};
