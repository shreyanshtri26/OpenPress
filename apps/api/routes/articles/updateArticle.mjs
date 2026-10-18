import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const articleId = body.id || body.articleId;
    const headers = event.headers || {};
    const userRole = headers["x-user-role"];
    const userId = headers["x-user-id"];

    if (!articleId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Article ID is required" }),
      };
    }

    // Get the existing article
    const [existing] = await db
      .select()
      .from(articles)
      .where(eq(articles.articleId, articleId));

    if (!existing) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Article not found" }),
      };
    }

    // Allow only journalist to update their own articles
    if (userRole === "journalist" && (!existing.author || existing.author !== userId)) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "You can only edit your own articles" }),
      };
    }

    // Optional: Convert comma-separated tags string to array
    if (body.tags && typeof body.tags === "string") {
      body.tags = body.tags.split(",").map((tag) => tag.trim());
    }

    delete body.id;
    delete body.articleId;

    const updates = { ...body, updatedAt: new Date() };
    if (updates.date !== undefined && updates.date !== null) {
      updates.date = new Date(updates.date);
    }

    const [updated] = await db
      .update(articles)
      .set(updates)
      .where(eq(articles.articleId, articleId))
      .returning();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Article updated successfully",
        data: updated,
      }),
    };
  } catch (err) {
    console.error("Error updating article:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error",
        error: err.message,
      }),
    };
  }
};
