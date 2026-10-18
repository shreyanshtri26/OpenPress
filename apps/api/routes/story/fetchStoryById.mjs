import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory, lookupUsers } from "./storyHelper.mjs";

export const handler = async (event) => {
  try {
    const startTime = Date.now();
    const params = event.queryStringParameters || {};
    const storyId = params.storyId || event.pathParameters?.storyId;

    if (!storyId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: 'Missing storyId parameter',
          error: 'storyId is required'
        })
      };
    }

    const [rawStory] = await db.select().from(stories).where(eq(stories.storyId, storyId));
    if (!rawStory) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: 'Story not found',
          error: `No story found with ID: ${storyId}`
        })
      };
    }

    const story = formatStory(rawStory);

    const userIds = new Set();
    if (story.authorId) userIds.add(story.authorId);
    if (story.assignedTo) {
      if (Array.isArray(story.assignedTo)) story.assignedTo.forEach(uid => userIds.add(uid));
      else userIds.add(story.assignedTo);
    }
    if (story.Reporter) {
      if (Array.isArray(story.Reporter)) story.Reporter.forEach(uid => userIds.add(uid));
      else userIds.add(story.Reporter);
    }

    const userMap = await lookupUsers(Array.from(userIds));

    const mapUserId = (userId) => {
      if (!userId) return null;
      return userMap.has(userId) ? userMap.get(userId) : `Unknown User (${String(userId).slice(0, 8)})`;
    };

    const enhancedStory = {
      ...story,
      authorName: story.authorId ? mapUserId(story.authorId) : null,
      assignedToName: story.assignedTo
        ? Array.isArray(story.assignedTo)
          ? story.assignedTo.map(mapUserId)
          : mapUserId(story.assignedTo)
        : null,
      reporterNames: story.Reporter
        ? Array.isArray(story.Reporter)
          ? story.Reporter.map(mapUserId)
          : [mapUserId(story.Reporter)]
        : story.reporter
        ? Array.isArray(story.reporter)
          ? story.reporter.map(mapUserId)
          : [mapUserId(story.reporter)]
        : []
    };

    const responseTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: 'Story retrieved successfully',
        data: enhancedStory,
        performance: {
          queryTime: responseTime,
          userLookupStats: {
            totalUserIds: userIds.size,
            resolvedNames: userMap.size
          }
        }
      })
    };
  } catch (err) {
    console.error('❌ Error retrieving story:', err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: 'Server error',
        error: err.message
      })
    };
  }
};
