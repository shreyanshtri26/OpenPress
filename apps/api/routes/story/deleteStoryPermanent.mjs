import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { canDeleteStory, forbiddenDelete } from "./storyHelper.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-role,x-user-id",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    let body = {};
    if (typeof event.body === "string" && event.body.trim()) {
      try { body = JSON.parse(event.body); } catch {}
    } else if (typeof event.body === "object" && event.body) {
      body = event.body;
    }

    const storyId = body.storyId || event.queryStringParameters?.storyId || event.pathParameters?.storyId;
    if (!storyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Story ID is required" })
      };
    }

    const [existing] = await db.select().from(stories).where(eq(stories.storyId, storyId));
    if (!existing) {
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Story not found", storyId }) };
    }
    if (!canDeleteStory(event.user, existing)) return forbiddenDelete(headers);

    const [deleted] = await db
      .delete(stories)
      .where(eq(stories.storyId, storyId))
      .returning();

    if (!deleted) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Story not found", storyId })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Story permanently deleted successfully",
        storyId,
      })
    };
  } catch (err) {
    console.error("Delete story permanent error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: err.message })
    };
  }
};
