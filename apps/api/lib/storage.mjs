// One place for object storage settings, so any S3-compatible store works:
// AWS S3, Neon Object Storage (free tier) or RustFS/MinIO locally.
//   AWS_ENDPOINT_URL_S3  custom S3 endpoint (enables path-style addressing, which Neon and RustFS need)
//   PUBLIC_STORAGE_URL   base URL where public buckets are served, e.g. http://127.0.0.1:9000
import { S3Client } from '@aws-sdk/client-s3';

export function createS3Client(options = {}) {
  return new S3Client({
    ...options,
    region: options.region || process.env.AWS_REGION || 'ap-southeast-1',
    forcePathStyle: options.forcePathStyle ?? Boolean(process.env.AWS_ENDPOINT_URL_S3),
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
