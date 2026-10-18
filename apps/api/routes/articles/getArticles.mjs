import { db } from "../../db/client.mjs";
import { articles } from "../../db/schema.mjs";

export const handler = async () => {
  try {
    const items = await db
      .select({
        articleId: articles.articleId,
        postFormat: articles.postFormat,
        title: articles.title,
        excerpt: articles.excerpt,
        cate: articles.cate,
        tags: articles.tags,
        status: articles.status,
        slug: articles.slug,
        cate_bg: articles.cate_bg,
        cate_img: articles.cate_img,
        featureImg: articles.featureImg,
        date: articles.date,
        post_views: articles.post_views,
        post_share: articles.post_share,
        author: articles.author,
        author_email: articles.author_email,
        author_name: articles.author_name,
        author_desg: articles.author_desg,
        author_img: articles.author_img,
        author_bio: articles.author_bio,
        author_social: articles.author_social,
        media: articles.media,
        remarks: articles.remarks,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Articles fetched successfully",
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
        message: "Error fetching articles",
        error: error.message,
      }),
    };
  }
};
