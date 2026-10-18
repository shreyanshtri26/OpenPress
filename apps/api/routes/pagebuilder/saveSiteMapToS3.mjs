import { and, eq, isNotNull } from "drizzle-orm";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../db/client.mjs";
import { stories, taxonomies } from "../../db/schema.mjs";
import { formatStory } from "../story/storyHelper.mjs";
import { createS3Client } from '../../lib/storage.mjs';

const s3Client = createS3Client({});

const BUCKET_NAME = process.env.S3_WEBSITE_BUCKET_NAME;
const BASE_URL = process.env.FRONTEND_WEBSITE_URL;

// Same slugify logic used in section upload
function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

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
    // 2️⃣ Fetch Section Values
    // ===============================
    const [taxonomy] = await db
      .select({ values: taxonomies.values })
      .from(taxonomies)
      .where(eq(taxonomies.name, "Section"))
      .limit(1);

    const sectionValues = Array.isArray(taxonomy?.values) ? taxonomy.values : [];
    console.log(`Found ${sectionValues.length} sections`);

    // ===============================
    // 3️⃣ Build XML
    // ===============================
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Home
    xml += `
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <priority>1.0</priority>
  </url>`;

    // About
    xml += `
  <url>
    <loc>${BASE_URL}/about</loc>
    <lastmod>${now}</lastmod>
    <priority>0.9</priority>
  </url>`;

    // Sections
    sectionValues.forEach((section) => {
      const slug = slugify(section);

      xml += `
  <url>
    <loc>${BASE_URL}/${escapeXml(slug)}</loc>
    <lastmod>${now}</lastmod>
    <priority>0.8</priority>
  </url>`;
    });

    // Blog stories
    storiesList.forEach((story) => {
      const lastMod =
        story.updatedAt ||
        story.createdAt ||
        now;

      xml += `
  <url>
    <loc>${escapeXml(story.publishUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>0.7</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    console.log("final sitemap.xml >>>", xml);
    // ===============================
    // 4️⃣ Upload to S3
    // ===============================
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "sitemap.xml",
        Body: xml,
        ContentType: "application/xml",
        CacheControl: "no-cache, no-store, must-revalidate",
      })
    );

    console.log("Sitemap uploaded successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Sitemap generated successfully",
        totalUrls:
          2 + sectionValues.length + storiesList.length,
      }),
    };
  } catch (error) {
    console.error("Sitemap Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error generating sitemap",
        error: error.message,
      }),
    };
  }
};
