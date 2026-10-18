import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({
  region: process.env.AWS_OpenPress_REGION,
});

const BUCKET_NAME = process.env.S3_WEBSITE_BUCKET_NAME;
const FRONTEND_WEBSITE_URL = process.env.FRONTEND_WEBSITE_URL;

export const handler = async (event) => {
  try {
    const startTime = Date.now();

    // ✅ Parse request
    const body = JSON.parse(event.body || "{}");
    const { htmlContent } = body;

    // ✅ Validate
    if (!htmlContent) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required field: htmlContent",
        }),
      };
    }

    // ✅ Fixed S3 key → /authors/index.html
    const s3Key = `authors/index.html`;

    console.log(
      `🔧 Publishing AUTHORS page: ${BUCKET_NAME}/${s3Key}`
    );

    // ✅ Upload (overwrite existing)
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: htmlContent,
        ContentType: "text/html; charset=utf-8",

        // 🔥 Disable caching (same as section + home)
        CacheControl: "no-cache, no-store, must-revalidate",
        Expires: new Date(0),

        Metadata: {
          pageType: "authors",
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    console.log("✅ Authors page published successfully");

    console.log("⏱ Time taken:", Date.now() - startTime, "ms");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Authors page HTML published successfully",
        data: {
          bucket: BUCKET_NAME,
          key: s3Key,
          url: `${FRONTEND_WEBSITE_URL}/authors`,
          baseUrl: `${publicObjectUrl(BUCKET_NAME, s3Key)}`
},
      }),
    };
  } catch (err) {
    console.error("❌ Error publishing authors HTML:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error saving authors HTML",
        error: err.message,
      }),
    };
  }
};
