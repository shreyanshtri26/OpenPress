import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { assets } from "../../db/schema.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const assetId =
      event.pathParameters?.assetId || event.queryStringParameters?.assetId;

    if (!assetId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "assetId is required" }),
      };
    }

    const [asset] = await db.select().from(assets).where(eq(assets.assetId, assetId));

    if (!asset) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Asset not found" }),
      };
    }

    const isVideo = asset.fileType?.startsWith("video/");
    const isImage = asset.fileType?.startsWith("image/");

    const response = {
      assetId: asset.assetId,
      assetType: isVideo ? "video" : isImage ? "image" : "other",
      fileName: asset.fileName,
      url: asset.fileUrl,
      uploadedAt: asset.createdAt instanceof Date ? asset.createdAt.toISOString() : asset.createdAt,
      metadata: asset.metadata || null,
      status: "COMPLETED",
      processing: {
        upload: "COMPLETED",
        metadata: "COMPLETED",
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error("❌ Error checking asset status:", err);
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
