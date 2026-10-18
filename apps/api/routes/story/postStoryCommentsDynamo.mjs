import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-role,x-user-id",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const storyId = body.storyId || event.queryStringParameters?.storyId || event.pathParameters?.storyId;
    const comment = body.comment;

    if (!storyId || storyId.trim() === "") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Story ID is required" }),
      };
    }

    if (!comment || typeof comment !== "object") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Comment object is required" }),
      };
    }

    const [story] = await db
      .select({ comments: stories.comments })
      .from(stories)
      .where(eq(stories.storyId, storyId));

    if (!story) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Story not found" }),
      };
    }

    const now = new Date().toISOString();
    const newComment = {
      ...comment,
      commentId: `${storyId}-${Date.now()}`,
      status: comment?.status || "pending",
      createdAt: now,
      updatedAt: now,
    };

    const updatedComments = [...(Array.isArray(story.comments) ? story.comments : []), newComment];

    await db
      .update(stories)
      .set({
        comments: updatedComments,
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, storyId));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Comment added successfully",
        data: newComment,
      }),
    };
  } catch (err) {
    console.error("postStoryComments error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: err.message }),
    };
  }
};
