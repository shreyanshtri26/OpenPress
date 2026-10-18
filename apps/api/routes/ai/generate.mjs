// The two AI endpoints the admin app calls, backed by Gemini (see lib/gemini.mjs).
//   POST /ai/normal_stream   { query, image?: {format, source:{bytes}}, attachments?: [{s3Bucket, s3Key, contentType}] }
//   POST /ai/stream_response { query, prompt? }  prompt may contain $search_results$, which is filled with DAM assets
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { desc } from 'drizzle-orm';
import { db } from '../../db/client.mjs';
import { assets } from '../../db/schema.mjs';
import { createS3Client } from '../../lib/storage.mjs';
import { generateText } from '../../lib/gemini.mjs';

const s3 = createS3Client();
const text = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body });

const run = (build) => async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    if (!String(body.query || '').trim()) return text(400, 'query is required');
    return text(200, await generateText(await build(body)));
  } catch (err) {
    console.error('AI request failed:', err);
    return text(502, err.message || 'AI request failed');
  }
};

async function attachmentPart({ s3Bucket, s3Key, contentType }) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
  const data = Buffer.from(await obj.Body.transformToByteArray()).toString('base64');
  return { inlineData: { mimeType: contentType || obj.ContentType || 'application/octet-stream', data } };
}

export const normalStream = run(async ({ query, image, attachments = [] }) => {
  const parts = [{ text: query }];
  if (image?.source?.bytes) parts.push({ inlineData: { mimeType: `image/${image.format === 'jpg' ? 'jpeg' : image.format || 'jpeg'}`, data: image.source.bytes } });
  for (const a of attachments) parts.push(await attachmentPart(a));
  return parts;
});

// ponytail: sends the 300 newest assets' metadata with the query; use embeddings if the library outgrows that
const candidates = async () =>
  JSON.stringify(
    (await db.select().from(assets).orderBy(desc(assets.createdAt)).limit(300)).map((a) => ({
      assetId: a.assetId, fileName: a.fileName, url: a.fileUrl, type: a.fileType,
      caption: a.caption, summary: a.summary, tags: a.tags, category: a.category,
      labels: a.metadata?.rekognitionAnalysis?.labels,
    })),
  );

export const streamResponse = run(async ({ query, prompt }) => {
  const base = prompt || query;
  return [{ text: base.includes('$search_results$') ? base.replace('$search_results$', await candidates()) : base }];
});
