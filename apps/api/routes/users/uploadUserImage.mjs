import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3 = createS3Client({
  region: process.env.AWS_OpenPress_REGION,
});

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const { fileName, fileType } = body;

    const bucketName = process.env.S3_DAM_BUCKET_NAME;

    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "fileName and fileType are required",
        }),
      };
    }

    // Store inside userImages folder
    const key = `userImages/${fileName}`;

    // 1️⃣ Create upload command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    // 2️⃣ Generate pre-signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600,
    });

    // 3️⃣ Return upload + public URL
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl: signedUrl,
        fileUrl: `${publicObjectUrl(bucketName, key)}`,
      }),
    };

  } catch (err) {
    console.error("User Image Upload Error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
