import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Invalid JSON body" }),
    };
  }

  const { id, remarks, action } = data;

  if (!id || !remarks || !remarks.trim()) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Article ID and remarks are required" }),
    };
  }

  // Determine status based on action
  let newStatus = "under-review";
  switch (action) {
    case "submit-for-review":
      newStatus = "in_review";
      break;
    case "approve":
      newStatus = "published";
      break;
    case "reject":
      newStatus = "rejected";
      break;
  }

  try {
    const [existing] = await db
      .select({ articleId: articles.articleId })
      .from(articles)
      .where(eq(articles.articleId, id))
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
        status: newStatus,
        remarks,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(articles.articleId, id))
      .returning();

    let message;
    switch (action) {
      case "submit-for-review":
        message = "Article sent back to journalist for revision";
        break;
      case "approve":
        message = "Article approved successfully";
        break;
      case "reject":
        message = "Article rejected";
        break;
      default:
        message = "Article review updated successfully";
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        data: updated,
      }),
    };
  } catch (err) {
    console.error("Error reviewing article:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Server error",
        error: err.message,
      }),
    };
  }
};
