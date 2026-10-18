import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const { articleId, status, editorId } = JSON.parse(event.body || "{}");

    if (!articleId || !status) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "articleId and status are required" }),
      };
    }

    const conditions = [eq(articles.articleId, articleId)];
    if (editorId) {
      conditions.push(eq(articles.editorId, editorId));
    }

    const [existing] = await db
      .select({ articleId: articles.articleId })
      .from(articles)
      .where(and(...conditions))
      .limit(1);

    if (!existing) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Article not found or not accessible" }),
      };
    }

    const now = new Date();
    const [updated] = await db
      .update(articles)
      .set({
        status,
        updatedAt: now,
      })
      .where(eq(articles.articleId, articleId))
      .returning();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Article status updated successfully",
        data: updated,
      }),
    };
  } catch (error) {
    console.error("Error updating article status:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};
