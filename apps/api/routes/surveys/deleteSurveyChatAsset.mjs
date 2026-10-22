import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client } from '../../lib/storage.mjs';

const s3 = createS3Client({ region: process.env.STORAGE_REGION });

export const handler = async (event) => {
  try {
    const bucket = process.env.DAM_BUCKET_NAME;
    const body = JSON.parse(event.body || "{}");
    const s3Key = typeof body.s3Key === "string" ? body.s3Key.trim() : "";

    if (!bucket || !s3Key) {
      return { statusCode: 400, body: JSON.stringify({ message: "s3Key is required" }) };
    }
    if (!s3Key.startsWith("survey-chat/")) {
      return { statusCode: 400, body: JSON.stringify({ message: "Only survey chat assets can be deleted" }) };
    }

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
    return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
  } catch (error) {
    console.error("Delete survey chat asset error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Failed to delete survey chat asset" }) };
  }
};
