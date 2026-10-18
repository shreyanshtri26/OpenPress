import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { articleId, remarks } = body;

    if (!articleId || typeof articleId !== "string" || articleId.trim() === "") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Invalid article ID" }),
      };
    }

    if (!remarks || typeof remarks !== "string") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Remarks are required and must be a string" }),
      };
    }

    const [existing] = await db
      .select({ articleId: articles.articleId })
      .from(articles)
      .where(eq(articles.articleId, articleId))
      .limit(1);

    if (!existing) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Article not found" }),
      };
    }

    const now = new Date();
    const [updated] = await db
      .update(articles)
      .set({
        remarks,
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
        message: "Remarks updated successfully",
        articleId: articleId,
        updatedRemarks: remarks,
        updatedAt: updated.updatedAt,
      }),
    };
  } catch (error) {
    console.error("❌ Error updating remarks:", error);
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
