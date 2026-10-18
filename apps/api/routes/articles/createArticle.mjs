import { randomUUID } from "crypto";
import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    // Extract fields from body
    const {
      title,
      excerpt,
      content,
      cate,
      tags = [],
      status = "draft",
      postFormat = "standard",
      slug = title?.toLowerCase().replace(/\s+/g, "-"),
      cate_bg,
      cate_img,
      featureImg,
      date,
      post_views,
      post_share,
      author,
      author_email,
      author_name,
      author_desg,
      author_img,
      author_bio,
      author_social = [],
      media = [],
      remarks = "",
    } = body;

    // Validate required fields
    if (!title || !excerpt || !content || !cate) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Missing required fields: title, excerpt, content, and cate are required",
        }),
      };
    }

    const articleId = randomUUID();
    const now = new Date();
    const processedDate = date ? new Date(date) : now;

    const newArticle = {
      articleId,
      postFormat,
      title,
      excerpt,
      content,
      cate,
      tags: Array.isArray(tags) ? tags : [],
      status,
      slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
      cate_bg: cate_bg || null,
      cate_img: cate_img || null,
      featureImg: featureImg || null,
      date: processedDate,
      post_views: Number(post_views) || 0,
      post_share: Number(post_share) || 0,
      author: author || null,
      author_email: author_email || null,
      author_name: author_name || null,
      author_desg: author_desg || null,
      author_img: author_img || null,
      author_bio: author_bio || null,
      author_social: Array.isArray(author_social) ? author_social : [],
      media: Array.isArray(media) ? media : [],
      remarks,
      createdAt: now,
      updatedAt: now,
    };

    const [inserted] = await db.insert(articles).values(newArticle).returning();

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Article created successfully",
        data: inserted,
        articleId,
      }),
    };
  } catch (error) {
    console.error("Create Article Error:", error);
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
