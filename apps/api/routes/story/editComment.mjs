import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-role,x-user-id",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { storyId, commentId, commentText } = JSON.parse(event.body || "{}");

    // Validation
    if (!storyId || !commentId || !commentText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "storyId, commentId, and commentText are required",
        }),
      };
    }

    // 1️⃣ Fetch the story
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.storyId, String(storyId)))
      .limit(1);

    if (!story) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Story not found" }),
      };
    }

    const comments = Array.isArray(story.comments) ? [...story.comments] : [];

    // 2️⃣ Find the specific comment
    const index = comments.findIndex((c) => c.commentId === commentId);
    if (index === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Comment not found" }),
      };
    }

    // 3️⃣ Update the comment in memory
    const now = new Date().toISOString();
    comments[index] = {
      ...comments[index],
      commentText: commentText.trim(),
      updatedAt: now,
      actions: [
        ...(comments[index].actions || []),
        {
          actionType: "update",
          actionText: "Comment text was edited",
          actionDate: now,
          performedBy: event.headers?.["x-user-role"] || "editor",
        },
      ],
    };

    // 4️⃣ Save back to Postgres
    await db
      .update(stories)
      .set({
        comments,
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, String(storyId)));

    const updatedComment = comments[index];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Comment updated successfully",
        data: {
          storyId,
          commentId,
          updatedComment,
        },
      }),
    };
  } catch (err) {
    console.error("❌ Error editing comment:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: err.message,
      }),
    };
  }
};
