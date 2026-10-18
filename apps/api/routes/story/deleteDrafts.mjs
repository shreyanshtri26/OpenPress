import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-role,x-user-id',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let storyId = event.queryStringParameters?.storyId;
    if (!storyId && event.body) {
      try {
        const body = JSON.parse(event.body);
        storyId = body.storyId;
      } catch {}
    }

    if (!storyId || storyId.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "storyId is required" }),
      };
    }

    const [deleted] = await db
      .delete(stories)
      .where(eq(stories.storyId, storyId))
      .returning();

    if (!deleted) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: `Story with ID ${storyId} not found` }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Draft deleted successfully",
        storyId,
      }),
    };
  } catch (err) {
    console.error("deleteDrafts error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
