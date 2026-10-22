import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3 = createS3Client({ region: process.env.STORAGE_REGION }); // ✅ Set STORAGE_REGION

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const { fileName, fileType } = body;

    const bucketName = process.env.DAM_BUCKET_NAME; // ✅ Replace with your bucket name

    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "fileName and fileType are required" }),
      };
    }

    // Ensure the S3 key is unique to prevent overwriting assets with the same name
    const uniqueKey = `${crypto.randomUUID()}-${fileName}`;

    // 1️⃣ Create upload command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueKey,
      ContentType: fileType,
    });

    // 2️⃣ Generate pre-signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // 3️⃣ Return both upload and public preview URLs
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl: signedUrl,                                  // Frontend uploads file here
        fileUrl: `${publicObjectUrl(bucketName, uniqueKey)}`, // Public file access
      }),
    };

  } catch (err) {
    console.error("S3 Upload Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
