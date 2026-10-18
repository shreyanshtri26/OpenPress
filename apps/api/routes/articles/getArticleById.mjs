import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { id } = body;

    if (!id) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "ID is required in body" }),
      };
    }

    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.articleId, id))
      .limit(1);

    if (!article) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Article not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Article retrieved successfully",
        data: article,
      }),
    };
  } catch (error) {
    console.error("Get Article By ID Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};
