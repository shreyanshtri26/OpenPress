import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-role,x-user-id",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json"
  };

  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    let storyId = event.pathParameters?.storyId;
    if (!storyId && event.rawPath) {
      const m = event.rawPath.match(/\/api\/stories\/([^\/]+)\/comments/);
      if (m && m[1]) storyId = m[1];
    }
    if (!storyId && event.queryStringParameters?.storyId) {
      storyId = event.queryStringParameters.storyId;
    }
    if (!storyId && event.body) {
      try { storyId = JSON.parse(event.body || "{}").storyId; } catch {}
    }

    if (!storyId) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid or missing story ID" }) };
    }

    const [story] = await db
      .select({ comments: stories.comments })
      .from(stories)
      .where(eq(stories.storyId, storyId));

    if (!story) {
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Story not found", storyId }) };
    }

    const comments = Array.isArray(story.comments) ? story.comments : [];
    return { statusCode: 200, headers, body: JSON.stringify({ message: "Comments retrieved", data: comments }) };
  } catch (err) {
    console.error("getStoryComments error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal server error", message: err.message }) };
  }
};
