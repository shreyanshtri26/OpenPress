import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3 = createS3Client({
  region: process.env.STORAGE_REGION,
});

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const { campaignId, placement, device, fileType } = body;

    const bucketName = process.env.DAM_BUCKET_NAME;

    if (!campaignId || !placement || !device || !fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "campaignId, placement, device and fileType are required",
        }),
      };
    }

    // Normalize placement
    const normalizedPlacement = placement
      .toLowerCase()
      .replace(/\s+/g, "-");

    // Validate device
    if (!["desktop", "mobile"].includes(device)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "device must be 'desktop' or 'mobile'",
        }),
      };
    }

    // Extract extension safely
    const extension = fileType.split("/")[1];

    if (!extension) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid fileType",
        }),
      };
    }

    const fileName = `${device}.${extension}`;

    const key = `ads/${campaignId}/${normalizedPlacement}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl: signedUrl,
        fileUrl: `${publicObjectUrl(bucketName, key)}`,
      }),
    };

  } catch (err) {
    console.error("Campaign Ad Upload Error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};