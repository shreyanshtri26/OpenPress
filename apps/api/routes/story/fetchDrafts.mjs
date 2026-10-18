import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory } from "./storyHelper.mjs";

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId;
    const draftSource = event.queryStringParameters?.draftSource;

    const conditions = [
      sql`(${stories.status} = 'raise_a_story' OR ${stories.status} = 'draft')`
    ];

    if (userId) {
      conditions.push(eq(stories.authorId, userId));
    }

    if (draftSource) {
      conditions.push(sql`${stories.fields}->>'draftSource' = ${draftSource}`);
    }

    const rawStories = await db
      .select()
      .from(stories)
      .where(and(...conditions))
      .orderBy(desc(stories.createdAt));

    const formattedStories = rawStories.map(formatStory);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Drafts fetched successfully",
        count: formattedStories.length,
        data: formattedStories,
        Items: formattedStories,
      }),
    };
  } catch (err) {
    console.error("fetchDrafts error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
