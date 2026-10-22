import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { createS3Client } from '../../lib/storage.mjs';

const s3 = createS3Client({ region: process.env.STORAGE_REGION });
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getSurveyId(event) {
  return (event.rawPath || event.path || "").split("/").filter(Boolean)[1];
}

function safeFileName(fileName) {
  return String(fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}

export const handler = async (event) => {
  try {
    const bucket = process.env.DAM_BUCKET_NAME;
    const region = process.env.STORAGE_REGION || "us-east-1";
    const surveyId = getSurveyId(event);
    const body = JSON.parse(event.body || "{}");
    const fileName = safeFileName(body.fileName);
    const fileType = typeof body.fileType === "string" ? body.fileType : "";
    const fileSize = Number(body.fileSize);
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!bucket || !surveyId || !sessionId || !fileType || !Number.isInteger(fileSize)) {
      return { statusCode: 400, body: JSON.stringify({ message: "fileName, fileType, fileSize, and sessionId are required" }) };
    }
    if (!ALLOWED_TYPES.has(fileType)) {
      return { statusCode: 400, body: JSON.stringify({ message: "Only JPEG, PNG, WebP, PDF, TXT, CSV, Markdown, HTML, DOC, DOCX, XLS, and XLSX files are supported" }) };
    }
    if (fileSize < 1 || fileSize > MAX_FILE_SIZE) {
      return { statusCode: 400, body: JSON.stringify({ message: "Files must be smaller than 10 MB" }) };
    }

    const assetId = crypto.randomUUID();
    const key = `survey-chat/${surveyId}/${sessionId}/${assetId}-${fileName}`;
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 900 });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset: { assetId, fileName, contentType: fileType, size: fileSize, s3Bucket: bucket, s3Key: key, url: downloadUrl, region }, uploadUrl }),
    };
  } catch (error) {
    console.error("Create survey chat asset upload error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Failed to prepare survey chat upload" }) };
  }
};
