// listStorageObjects.mjs - Debug what's in S3
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3 = createS3Client({ region: process.env.STORAGE_REGION });
const BUCKET_NAME = process.env.DAM_BUCKET_NAME;

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const prefix = body.prefix || '';
    
    console.log(`🔍 Listing S3 objects with prefix: "${prefix}"`);
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 100
    });

    const result = await s3.send(command);
    
    const objects = result.Contents || [];
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "S3 objects listed successfully",
        bucket: BUCKET_NAME,
        prefix: prefix,
        totalObjects: objects.length,
        objects: objects.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          url: `${publicObjectUrl(BUCKET_NAME, obj.Key)}`
        }))
      })
    };
    
  } catch (error) {
    console.error("❌ Error listing S3 objects:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to list S3 objects",
        details: error.message
      })
    };
  }
};
