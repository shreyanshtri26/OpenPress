import { and, eq, ne, or } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const journalistId = event.queryStringParameters?.journalistId;
    const editorId = event.queryStringParameters?.editorId;

    if (!journalistId && !editorId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "journalistId or editorId is required" }),
      };
    }

    let items = [];

    if (journalistId) {
      items = await db
        .select()
        .from(articles)
        .where(
          and(
            or(eq(articles.author, journalistId), eq(articles.author_email, journalistId)),
            ne(articles.status, "draft")
          )
        );
    } else {
      items = await db
        .select()
        .from(articles)
        .where(
          and(
            eq(articles.editorId, editorId),
            ne(articles.status, "draft")
          )
        );
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Articles retrieved successfully",
        count: items.length,
        data: items,
      }),
    };
  } catch (error) {
    console.error("Error fetching articles:", error);
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
