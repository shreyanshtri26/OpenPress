import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client } from '../../lib/storage.mjs';

const s3Client = createS3Client({
  region: process.env.STORAGE_REGION
});

const BUCKET_NAME = process.env.WEBSITE_BUCKET_NAME;

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

    // ✅ Fixed key for CONTACT US page
    const s3Key = "contact-us/index.html";


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
        pageType: "contact-us"
      }
    };

    await s3Client.send(new PutObjectCommand(uploadParams));



    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Contact Us page HTML published successfully",
        data: {
          bucket: BUCKET_NAME,
          key: s3Key
        }
      })
    };
  } catch (error) {
    console.error("❌ Fatal error publishing Contact Us page:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Internal server error during Contact Us publication",
        error: error.message
      })
    };
  }
};
