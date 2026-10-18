import { eq, or } from "drizzle-orm";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../db/client.mjs";
import { assets } from "../../db/schema.mjs";
import { createS3Client } from "../../lib/storage.mjs";

const BUCKET_NAME = process.env.S3_DAM_BUCKET_NAME;
const s3 = createS3Client({ region: process.env.AWS_OpenPress_REGION });

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    let assetId, fileName, s3Key;

    if (event.pathParameters?.assetId) {
      assetId = event.pathParameters.assetId;
    } else if (event.queryStringParameters?.assetId) {
      assetId = event.queryStringParameters.assetId;
    } else if (event.body) {
      const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
      assetId = body.assetId;
      fileName = body.fileName || body.name;
      s3Key = body.s3Key;
    }

    if (!assetId && !fileName && !s3Key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Either assetId, fileName, or s3Key is required",
        }),
      };
    }

    // Find asset in Postgres
    let condition;
    if (assetId) {
      condition = eq(assets.assetId, assetId);
    } else if (fileName) {
      condition = or(eq(assets.fileName, fileName), eq(assets.name, fileName));
    } else if (s3Key) {
      condition = eq(assets.s3Key, s3Key);
    }

    const [existing] = await db.select().from(assets).where(condition);

    if (existing) {
      await db.delete(assets).where(eq(assets.assetId, existing.assetId));

      const keyToDelete = existing.s3Key || existing.fileName;
      if (keyToDelete && BUCKET_NAME) {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: keyToDelete,
            })
          );
        } catch (s3Err) {
          console.warn("Could not delete from S3 (ignoring):", s3Err.message);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: "Asset deleted successfully",
          deletedAssetId: existing.assetId,
        }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: "Asset not found" }),
    };
  } catch (err) {
    console.error("❌ Error deleting asset:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Server error",
        error: err.message,
      }),
    };
  }
};
