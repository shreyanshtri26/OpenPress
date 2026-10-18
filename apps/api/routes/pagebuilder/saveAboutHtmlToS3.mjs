import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({
  region: process.env.AWS_OpenPress_REGION
});

const BUCKET_NAME = process.env.S3_WEBSITE_BUCKET_NAME;
const SITE_URL = process.env.SITE_URL;

export const handler = async (event) => {
  try {
    const startTime = Date.now();

    // ✅ Parse request body
    const body = JSON.parse(event.body || "{}");
    const { htmlContent } = body;

    // ✅ Validate input
    if (!htmlContent) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required field: htmlContent"
        })
      };
    }

    // ✅ Fixed key for ABOUT page
    const s3Key = "about/index.html";

    console.log(`🔧 Publishing ABOUT page to S3: ${BUCKET_NAME}/${s3Key}`);

    // ✅ Upload to S3 (overwrite)
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: htmlContent,
      ContentType: "text/html; charset=utf-8",

      // 🔥 Disable ALL caching
      CacheControl: "no-cache, no-store, must-revalidate",
      Expires: new Date(0),

      Metadata: {
        uploadedAt: new Date().toISOString(),
        pageType: "about"
      }
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    console.log("✅ About page published successfully");

    console.log("⏱ Time taken:", Date.now() - startTime, "ms");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "About page HTML published successfully",
        data: {
          bucket: BUCKET_NAME,
          key: s3Key,
          url: `${SITE_URL}/about.html`,
          baseUrl: `${publicObjectUrl(BUCKET_NAME, 'about.html')}`
        }
      })
    };

  } catch (err) {
    console.error("❌ Error publishing about HTML:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error saving about HTML",
        error: err.message
      })
    };
  }
};
