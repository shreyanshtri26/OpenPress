import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { createS3Client } from '../../lib/storage.mjs';

const cloudfrontClient = new CloudFrontClient({
  region: process.env.AWS_OpenPress_REGION
});

const s3Client = createS3Client({
  region: process.env.AWS_OpenPress_REGION
});

const BUCKET_NAME = process.env.S3_WEBSITE_BUCKET_NAME;
const SITE_URL = process.env.SITE_URL;

/**
 * Saves all PWA static files to S3 in one go:
 *   - manifest.json
 *   - sw.js
 *   - pwa-screenshot-mobile.png  (base64)
 *   - pwa-screenshot-desktop.png (base64)
 *
 * Body shape:
 * {
 *   manifestJson:           string   // JSON string
 *   swJs:                   string   // JS string
 *   screenshotMobileBase64: string   // base64-encoded PNG  (optional)
 *   screenshotDesktopBase64:string   // base64-encoded PNG  (optional)
 * }
 */
export const handler = async (event) => {
  try {
    const startTime = Date.now();

    const body = JSON.parse(event.body || "{}");
    const {
      manifestJson,
      swJs,
      screenshotMobileBase64,
      screenshotDesktopBase64,
      icon192Base64,
      icon192MaskableBase64,
      icon512Base64,
      icon512MaskableBase64
    } = body;

    if (!manifestJson && !swJs && !screenshotMobileBase64 && !screenshotDesktopBase64 && !icon192Base64 && !icon192MaskableBase64 && !icon512Base64 && !icon512MaskableBase64) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "At least one PWA asset is required"
        })
      };
    }

    const uploaded = [];

    // ── 1. manifest.json ────────────────────────────────────────────────────
    if (manifestJson) {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "manifest.json",
        Body: manifestJson,
        ContentType: "application/manifest+json",
        CacheControl: "no-cache, no-store, must-revalidate",
        Expires: new Date(0),
        Metadata: { uploadedAt: new Date().toISOString() }
      }));
      console.log("✅ manifest.json uploaded");
      uploaded.push("manifest.json");
    }

    // ── 2. sw.js ─────────────────────────────────────────────────────────────
    if (swJs) {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "sw.js",
        Body: swJs,
        ContentType: "application/javascript",
        CacheControl: "no-cache, no-store, must-revalidate",
        Expires: new Date(0),
        Metadata: { uploadedAt: new Date().toISOString() }
      }));
      console.log("✅ sw.js uploaded");
      uploaded.push("sw.js");
    }

    // ── 3. pwa-screenshot-mobile.png ─────────────────────────────────────────
    if (screenshotMobileBase64) {
      const mobileBuffer = Buffer.from(screenshotMobileBase64, "base64");
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "pwa-screenshot-mobile.png",
        Body: mobileBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=86400",
        Metadata: { uploadedAt: new Date().toISOString() }
      }));
      console.log("✅ pwa-screenshot-mobile.png uploaded");
      uploaded.push("pwa-screenshot-mobile.png");
    }

    // ── 4. pwa-screenshot-desktop.png ────────────────────────────────────────
    if (screenshotDesktopBase64) {
      const desktopBuffer = Buffer.from(screenshotDesktopBase64, "base64");
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "pwa-screenshot-desktop.png",
        Body: desktopBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=86400",
        Metadata: { uploadedAt: new Date().toISOString() }
      }));
      console.log("✅ pwa-screenshot-desktop.png uploaded");
      uploaded.push("pwa-screenshot-desktop.png");
    }

    // ── 5. Icons ─────────────────────────────────────────────────────────────
    const iconUploads = [
      { key: "pwa-icon-192.png", data: icon192Base64 },
      { key: "pwa-icon-192-maskable.png", data: icon192MaskableBase64 },
      { key: "pwa-icon-512.png", data: icon512Base64 },
      { key: "pwa-icon-512-maskable.png", data: icon512MaskableBase64 }
    ];

    for (const icon of iconUploads) {
      if (icon.data) {
        const buffer = Buffer.from(icon.data, "base64");
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: icon.key,
          Body: buffer,
          ContentType: "image/png",
          CacheControl: "public, max-age=86400",
          Metadata: { uploadedAt: new Date().toISOString() }
        }));
        console.log(`✅ ${icon.key} uploaded`);
        uploaded.push(icon.key);
      }
    }

    
    // ── 6. CloudFront Invalidation ───────────────────────────────────────────
    if (uploaded.length > 0 && process.env.CLOUDFRONT_DISTRIBUTION_ID) {
      try {
        console.log(`🔄 Invalidating CloudFront cache for ${uploaded.length} PWA files...`);
        const invalidationParams = {
          DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
          InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: {
              Quantity: 1,
              Items: ["/*"]
            }
          }
        };
        await cloudfrontClient.send(new CreateInvalidationCommand(invalidationParams));
        console.log("✅ CloudFront invalidation triggered");
      } catch (cfErr) {
        console.error("⚠️ Failed to invalidate CloudFront cache (non-fatal):", cfErr);
      }
    }

    console.log("⏱ Time taken:", Date.now() - startTime, "ms");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "PWA files published successfully",
        data: {
          bucket: BUCKET_NAME,
          uploaded,
          urls: uploaded.map(key => `${SITE_URL}/${key}`)
        }
      })
    };

  } catch (err) {
    console.error("❌ Error publishing PWA files:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error saving PWA files",
        error: err.message
      })
    };
  }
};
