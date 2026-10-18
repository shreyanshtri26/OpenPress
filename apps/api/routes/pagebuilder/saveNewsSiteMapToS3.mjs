import { and, eq, isNotNull } from "drizzle-orm";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory } from "../story/storyHelper.mjs";
import { createS3Client } from '../../lib/storage.mjs';

const s3Client = createS3Client({});

const BUCKET_NAME = process.env.S3_WEBSITE_BUCKET_NAME;
const BASE_URL = process.env.FRONTEND_WEBSITE_URL;

// Escape XML special characters
function escapeXml(unsafe) {
  return unsafe
    ?.replace(/&/g, "&amp;")
    ?.replace(/</g, "&lt;")
    ?.replace(/>/g, "&gt;")
    ?.replace(/"/g, "&quot;")
    ?.replace(/'/g, "&apos;");
}

export const handler = async () => {
  try {
    // ===============================
    // 1️⃣ Fetch Published Stories
    // ===============================
    const rawStories = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.status, "published"),
          isNotNull(stories.publishUrl)
        )
      );

    const storiesList = rawStories.map(formatStory);
    console.log(`Found ${storiesList.length} published stories`);

    // ===============================
    // 2️⃣ Filter stories from the last 2 days (48 hours)
    // ===============================
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const newsStories = storiesList.filter((story) => {
      const pubDate = new Date(story.updatedAt || story.createdAt || story.proposedFilingDate);
      return pubDate >= fortyEightHoursAgo;
    });

    console.log(`Filtered down to ${newsStories.length} news stories from the last 48 hours`);

    // ===============================
    // 3️⃣ Build News XML
    // ===============================
    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`;

    newsStories.forEach((story) => {
      const pubDate = (story.updatedAt || story.createdAt || story.proposedFilingDate || new Date().toISOString()).split("T")[0];
      const title = story.title || "Untitled Article";

      xml += `
  <url>
    <loc>${escapeXml(story.publishUrl)}</loc>
    <news:news>
      <news:publication>
        <news:name>OpenPress</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(title)}</news:title>
    </news:news>
  </url>`;
    });

    xml += `\n</urlset>`;

    console.log("final news-sitemap.xml >>>", xml);

    // ===============================
    // 4️⃣ Upload to S3
    // ===============================
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "news-sitemap.xml",
        Body: xml,
        ContentType: "application/xml",
        CacheControl: "no-cache, no-store, must-revalidate",
      })
    );

    console.log("News Sitemap uploaded successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "News-Sitemap generated successfully",
        totalUrls: newsStories.length,
      }),
    };
  } catch (error) {
    console.error("News Sitemap Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error generating news sitemap",
        error: error.message,
      }),
    };
  }
};
