import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { createS3Client, clientConfig } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.STORAGE_REGION });
const cdnClient = new CloudFrontClient({ ...clientConfig(),});
const BUCKET_NAME = process.env.WEBSITE_BUCKET_NAME;

export const handler = async (event) => {
  try {
    const icon192 = Buffer.from("`cat /tmp/192.b64`", "base64");
    const icon512 = Buffer.from("`cat /tmp/512.b64`", "base64");

    const uploads = [
      { key: "pwa-icon-192.png", data: icon192 },
      { key: "pwa-icon-192-v4.png", data: icon192 },
      { key: "pwa-icon-192-maskable.png", data: icon192 },
      { key: "pwa-icon-192-maskable-v4.png", data: icon192 },
      { key: "pwa-icon-192x192.png", data: icon192 },
      { key: "pwa-icon-192x192-maskable.png", data: icon192 },
      { key: "pwa-192x192.png", data: icon192 },
      { key: "pwa-192-maskable.png", data: icon192 },
      { key: "pwa-192x192-maskable.png", data: icon192 },

      { key: "pwa-icon-512.png", data: icon512 },
      { key: "pwa-icon-512-v4.png", data: icon512 },
      { key: "pwa-icon-512-maskable.png", data: icon512 },
      { key: "pwa-icon-512-maskable-v4.png", data: icon512 },
      { key: "pwa-icon-512x512.png", data: icon512 },
      { key: "pwa-icon-512x512-maskable.png", data: icon512 },
      { key: "pwa-512x512.png", data: icon512 },
      { key: "pwa-512-maskable.png", data: icon512 },
      { key: "pwa-512x512-maskable.png", data: icon512 },
    ];

    for (const u of uploads) {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: u.key,
        Body: u.data,
        ContentType: "image/png",
        CacheControl: "public, max-age=86400",
        Metadata: { uploadedAt: new Date().toISOString() }
      }));
    }

    if (process.env.CDN_DISTRIBUTION_ID) {
      await cdnClient.send(new CreateInvalidationCommand({
        DistributionId: process.env.CDN_DISTRIBUTION_ID,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: { Quantity: 1, Items: ["/*"] }
        }
      }));
    }

    return { statusCode: 200, body: "Icons updated and cache invalidated!" };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
