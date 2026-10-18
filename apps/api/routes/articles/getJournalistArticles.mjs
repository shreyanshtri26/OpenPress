import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const qs = event.queryStringParameters || {};
    const requestHeaders = event.headers || {};
    const userRole = requestHeaders["x-user-role"] || "reader";

    const conditions = [];

    // Status filtering
    let status = body.status || qs.status;
    if (userRole === "reader") status = "published";

    if (status) {
      conditions.push(eq(articles.status, status));
    }

    // Author filtering
    const author = body.author || qs.author;
    if (author) {
      conditions.push(eq(articles.author, author));
    }

    // Category filtering
    const category = body.cate || qs.cate;
    if (category) {
      conditions.push(ilike(articles.cate, `${category}%`));
    }

    let query = db.select().from(articles);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(desc(articles.createdAt));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Articles retrieved successfully",
        count: rows.length,
        data: rows,
      }),
    };
  } catch (err) {
    console.error("Error fetching articles:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Server error",
        error: err.message,
      }),
    };
  }
};
