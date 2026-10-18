import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";

export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
  };

  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const storyId = event.queryStringParameters?.storyId;
    const commentId = event.queryStringParameters?.commentId;

    if (!storyId || !commentId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "storyId and commentId are required" }) };
    }

    const storyKey = String(storyId);

    // 🔹 Fetch story
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.storyId, storyKey))
      .limit(1);

    if (!story) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Story not found" }) };
    }

    const currentComments = Array.isArray(story.comments) ? story.comments : [];
    const commentIndex = currentComments.findIndex((c) => c.commentId === commentId);
    if (commentIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Comment not found" }) };
    }

    const comment = currentComments[commentIndex];
    const deletedCommentInfo = {
      commentId: comment.commentId,
      field: comment.field,
      commentText: comment.commentText,
      createdBy: comment.createdBy,
    };

    const remainingComments = currentComments.filter((c) => c.commentId !== commentId);
    const now = new Date().toISOString();

    await db
      .update(stories)
      .set({
        comments: remainingComments,
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, storyKey));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Comment deleted successfully",
        data: {
          storyId: storyKey,
          deletedComment: deletedCommentInfo,
          remainingCommentsCount: remainingComments.length,
        },
      }),
    };
  } catch (err) {
    console.error("Error deleting comment:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
