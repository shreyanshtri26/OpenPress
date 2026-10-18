import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.AWS_OpenPress_REGION });

const BUCKET_NAME = process.env.S3_WEBSITE_BUCKET_NAME;
const FRONTEND_WEBSITE_URL = process.env.FRONTEND_WEBSITE_URL;

export const handler = async (event) => {
  try {
    const startTime = Date.now();

    const body = JSON.parse(event.body || "{}");
    const { htmlContent, surveyId } = body;

    if (!htmlContent || !surveyId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required fields: htmlContent or surveyId",
        }),
      };
    }

    // S3 key → surveys/{surveyId}.html  (same pattern as article pages: section/slug.html)
    // URL    → {FRONTEND_WEBSITE_URL}/surveys/{surveyId}.html
    //          e.g. https://openpress.com/surveys/survey_abc123.html
    const s3Key = `surveys/${surveyId}.html`;

    console.log(`🔧 Publishing SURVEY page: ${BUCKET_NAME}/${s3Key}`);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: htmlContent,
        ContentType: "text/html; charset=utf-8",
        CacheControl: "no-cache, no-store, must-revalidate",
        Expires: new Date(0),
        Metadata: {
          pageType: "survey",
          surveyId,
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    const duration = Date.now() - startTime;
    const pageUrl = `${FRONTEND_WEBSITE_URL}/surveys/${surveyId}.html`;

    console.log(`✅ Survey page published in ${duration}ms → ${pageUrl}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Survey page published successfully",
        bucket: BUCKET_NAME,
        key: s3Key,
        url: pageUrl,
        duration,
      }),
    };
  } catch (err) {
    console.error("❌ Error publishing survey page:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to publish survey page",
        error: err.message,
      }),
    };
  }
};
