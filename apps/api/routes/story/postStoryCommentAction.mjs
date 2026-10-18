import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory } from "./storyHelper.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-role,x-user-id",
    "Content-Type": "application/json",
  };

  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const body = JSON.parse(event.body || "{}");
    const { storyId, commentId, actionType, actionText, actionDate, performedBy } = body;

    if (!storyId || !commentId || !actionType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "storyId, commentId, and actionType are required" }),
      };
    }

    // 🔹 Fetch the story
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.storyId, String(storyId)))
      .limit(1);

    if (!story) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Story not found" }) };
    }

    const comments = Array.isArray(story.comments) ? [...story.comments] : [];
    const commentIndex = comments.findIndex((c) => c.commentId === commentId);
    if (commentIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Comment not found" }) };
    }

    // 🔹 Build action
    const newAction = {
      actionType,
      actionText,
      actionDate: actionDate || new Date().toISOString(),
      performedBy: performedBy || "system",
    };

    // 🔹 Determine new status
    let newStatus = comments[commentIndex].status || "pending";
    if (actionType === "resolve") newStatus = "resolve";
    if (actionType === "reopen") newStatus = "reopen";
    if (actionType === "added") newStatus = "pending";
    if (actionType === "update") newStatus = "update";

    const now = new Date().toISOString();
    comments[commentIndex] = {
      ...comments[commentIndex],
      actions: [...(comments[commentIndex].actions || []), newAction],
      status: newStatus,
      updatedAt: now,
    };

    const [updated] = await db
      .update(stories)
      .set({
        comments,
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, String(storyId)))
      .returning();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: "Action for the comment taken successfully",
        data: formatStory(updated),
      }),
    };
  } catch (err) {
    console.error("Error taking action on comment:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
