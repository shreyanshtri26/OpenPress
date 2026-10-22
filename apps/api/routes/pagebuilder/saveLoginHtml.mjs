import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({
  region: process.env.STORAGE_REGION
});

const BUCKET_NAME = process.env.WEBSITE_BUCKET_NAME;
const SITE_URL = process.env.SITE_URL;

export const handler = async (event) => {
  try {
    const startTime = Date.now();
    const body = JSON.parse(event.body || "{}");
    const { htmlContent } = body;

    if (!htmlContent) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required field: htmlContent"
        })
      };
    }

    const s3Key = "login.html";
    console.log(`🔧 Publishing LOGIN page to S3: ${BUCKET_NAME}/${s3Key}`);

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: htmlContent,
      ContentType: "text/html; charset=utf-8",
      CacheControl: "no-cache, no-store, must-revalidate",
      Expires: new Date(0),
      Metadata: {
        uploadedAt: new Date().toISOString(),
        pageType: "login"
      }
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Also upload to login/index.html for directory style URLs
    await s3Client.send(new PutObjectCommand({
      ...uploadParams,
      Key: "login/index.html"
    }));

    console.log("✅ Login page published successfully");
    console.log("⏱ Time taken:", Date.now() - startTime, "ms");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Login page published successfully",
        data: {
          s3Key,
          url: `${SITE_URL}/login`,
          baseUrl: `${publicObjectUrl(BUCKET_NAME, 'login.html')}`
        }
      })
    };
  } catch (error) {
    console.error("❌ Error publishing login page:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to publish login page",
        error: error.message
      })
    };
  }
};
