import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client } from "../../lib/storage.mjs";

// Uploads the brand files that published pages load from the site root (/openpress-logo-full.png, favicon, PWA icons).
// Source of truth for the files is apps/admin/public (copied from /brand).
const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../admin/public");
const FILES = [
  "openpress-logo-full.png",
  "openpress-logo-full-nobg.png",
  "openpress-logo-full-nobg-trim.png",
  "openpress-quill-nobg.png",
  "openpress-quill-nobg-trim.png",
  "openpress-logo.png",
  "openpress-quill.png",
  "openpress-favicon-32.png",
  "favicon.ico",
  "apple-touch-icon.png",
  "pwa-icon-192.png",
  "pwa-icon-192-maskable.png",
  "pwa-icon-512.png",
  "pwa-icon-512-maskable.png",
];
const TYPES = { ".png": "image/png", ".ico": "image/x-icon" };

export async function seedSiteAssets() {
  const bucket = process.env.S3_WEBSITE_BUCKET_NAME;
  if (!bucket) throw new Error("S3_WEBSITE_BUCKET_NAME is not set");
  const s3 = createS3Client({ region: process.env.AWS_REGION });
  for (const name of FILES) {
    const body = await readFile(path.join(PUBLIC_DIR, name));
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: name,
      Body: body,
      ContentType: TYPES[path.extname(name)] || "application/octet-stream",
      CacheControl: "public, max-age=3600",
    }));
    console.log(`  ✓ ${name}`);
  }
  console.log(`Successfully uploaded ${FILES.length} site assets to ${bucket}.`);
}

if (process.argv[1]?.endsWith("site-assets.mjs")) {
  try {
    await seedSiteAssets();
  } catch (err) {
    console.error("Site asset upload failed:", err);
    process.exit(1);
  }
}
