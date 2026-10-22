// One place for object storage settings, so any S3-compatible store works:
// Neon Object Storage (free tier), a hosted bucket, or RustFS/MinIO locally.
//   STORAGE_ENDPOINT_URL  custom endpoint (enables path-style addressing, which Neon and RustFS need)
//   PUBLIC_STORAGE_URL    base URL where public buckets are served, e.g. http://127.0.0.1:9000
import { S3Client } from '@aws-sdk/client-s3';

// Region and credentials shared by every storage/media client, read from STORAGE_* settings.
export function clientConfig(options = {}) {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  return {
    ...(accessKeyId && secretAccessKey && { credentials: { accessKeyId, secretAccessKey } }),
    ...options,
    region: options.region || process.env.STORAGE_REGION || 'ap-southeast-1',
  };
}

export function createS3Client(options = {}) {
  const endpoint = process.env.STORAGE_ENDPOINT_URL;
  return new S3Client({
    ...clientConfig(options),
    ...(endpoint && { endpoint }),
    forcePathStyle: options.forcePathStyle ?? Boolean(endpoint),
  });
}

export function publicObjectUrl(bucket, key) {
  const cleanKey = String(key ?? '').replace(/^\/+/, '');
  const base = process.env.PUBLIC_STORAGE_URL?.replace(/\/+$/, '');
  return base ? `${base}/${bucket}/${cleanKey}` : `/${bucket}/${cleanKey}`;
}

// Object key from any URL this app produced (path-style, virtual-host or a CDN in front of the bucket).
export function keyFromObjectUrl(url, bucket) {
  const path = decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
  return bucket && path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
}
