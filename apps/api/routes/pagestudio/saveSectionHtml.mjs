import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({
  region: process.env.STORAGE_REGION,
});

const BUCKET_NAME = process.env.WEBSITE_BUCKET_NAME;
const FRONTEND_WEBSITE_URL = process.env.FRONTEND_WEBSITE_URL;

// Utility: normalize section value → URL-safe slug. Same rule as saveHtml so a section index and its stories share a folder.
function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const handler = async (event) => {
  try {
    const startTime = Date.now();

    // ✅ Parse request
    const body = JSON.parse(event.body || "{}");
    const { htmlContent, sectionValue } = body;

    // ✅ Validate
    if (!htmlContent || !sectionValue) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required fields: htmlContent or sectionValue",
        }),
      };
    }

    // ✅ Normalize section
    const sectionSlug = slugify(sectionValue);

    // ✅ S3 key → /section/{value}/index.html
    const s3Key = `${sectionSlug}/index.html`;


    // ✅ Upload (overwrite)
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: htmlContent,
        ContentType: "text/html; charset=utf-8",

        // 🔥 Disable caching (same as home)
        CacheControl: "no-cache, no-store, must-revalidate",
        Expires: new Date(0),

        Metadata: {
          pageType: "section",
          sectionValue,
          uploadedAt: new Date().toISOString(),
        },
      })
    );


    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Section page HTML published successfully",
        data: {
          bucket: BUCKET_NAME,
          key: s3Key,
          url: `${FRONTEND_WEBSITE_URL}/${sectionSlug}`,
          baseUrl: `${publicObjectUrl(BUCKET_NAME, s3Key)}`
},
      }),
    };
  } catch (err) {
    console.error("❌ Error publishing section HTML:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error saving section HTML",
        error: err.message,
      }),
    };
  }
};
