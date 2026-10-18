import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { articles, users } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { slug } = body;

    if (!slug) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Slug is required in body" }),
      };
    }

    const [rawArticle] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);

    if (!rawArticle) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Article not found" }),
      };
    }

    const article = { ...rawArticle };

    if (article.author) {
      try {
        const [authorUser] = await db
          .select({
            userId: users.userId,
            username: users.fullName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.userId, article.author))
          .limit(1);

        if (authorUser) {
          article.author = {
            userId: authorUser.userId,
            username: authorUser.username,
            email: authorUser.email,
          };
        }
      } catch (authorError) {
        console.warn("Could not fetch author details:", authorError);
      }
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
    console.error("Error fetching article:", error);
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
