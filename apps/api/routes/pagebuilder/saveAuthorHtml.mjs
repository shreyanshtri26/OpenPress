import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({
  region: process.env.STORAGE_REGION,
});

const BUCKET_NAME = process.env.WEBSITE_BUCKET_NAME;
const FRONTEND_WEBSITE_URL = process.env.FRONTEND_WEBSITE_URL;

// Utility: slugify name
function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export const handler = async (event) => {
  try {
    const startTime = Date.now();

    const body = JSON.parse(event.body || "{}");
    const { htmlContent, authorName, userId } = body;

    if (!htmlContent || !authorName || !userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required fields: htmlContent, authorName or userId",
        }),
      };
    }

    // ✅ Generate unique slug
    const baseSlug = slugify(authorName);
    // const uniqueSuffix = userId.slice(-4); // last 4 chars
    const authorSlug = `${baseSlug}`;

    // ✅ S3 key → authors/{authorSlug}/index.html
    const s3Key = `authors/${authorSlug}/index.html`;

    console.log(`🔧 Publishing AUTHOR page: ${BUCKET_NAME}/${s3Key}`);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: htmlContent,
        ContentType: "text/html; charset=utf-8",
        CacheControl: "no-cache, no-store, must-revalidate",
        Expires: new Date(0),
        Metadata: {
          pageType: "author",
          authorName,
          userId,
          authorSlug,
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    console.log("✅ Author page published successfully");

    console.log("⏱ Time taken:", Date.now() - startTime, "ms");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Author page HTML published successfully",
        data: {
          bucket: BUCKET_NAME,
          key: s3Key,
          slug: authorSlug,
          url: `${FRONTEND_WEBSITE_URL}/authors/${authorSlug}`,
          baseUrl: `${publicObjectUrl(BUCKET_NAME, s3Key)}`
},
      }),
    };
  } catch (err) {
    console.error("❌ Error publishing author HTML:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error saving author HTML",
        error: err.message,
      }),
    };
  }
};
