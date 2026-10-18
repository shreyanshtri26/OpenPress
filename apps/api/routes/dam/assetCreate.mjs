import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { assets } from "../../db/schema.mjs";
import { formatAsset } from "./fetchAsset.mjs";

function generatePreviewUrl(fileUrl, fileType, isVideo) {
  if (isVideo) {
    return fileUrl;
  }
  return fileUrl;
}

export const handler = async (event) => {
  const startTime = Date.now();

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    const { assetId } = body;

    const isUpdateMode = !!assetId;

    if (isUpdateMode) {
      return await handleUpdate(body, startTime);
    }

    return await handleCreate(body, startTime);
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error("❌ Error in assetCreate:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error",
        error: err.message,
        timestamp: new Date().toISOString(),
        processingTime: `${elapsed}ms`,
      }),
    };
  }
};

async function handleCreate(body, startTime) {
  const { fileName, fileType, fileUrl, userId, uploadedBy, previewUrl, subtype, summary } = body;

  if (!fileName || !fileType || !fileUrl) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "fileName, fileType, and fileUrl are required",
      }),
    };
  }

  const assetId = randomUUID();
  const timestamp = new Date();
  const isVideo = fileType.startsWith("video/");
  const isImage = fileType.startsWith("image/");
  const finalPreviewUrl = previewUrl || generatePreviewUrl(fileUrl, fileType, isVideo);

  const assetRecord = {
    assetId,
    name: fileName,
    fileName,
    fileType,
    fileUrl,
    previewUrl: finalPreviewUrl,
    s3Key: fileName,
    userId: userId || null,
    uploadedBy: uploadedBy || userId || null,
    description: body.description || "",
    summary: summary || null,
    caption: body.caption || "",
    tags: Array.isArray(body.tags) ? body.tags : subtype ? [subtype] : [],
    category: body.category || subtype || "uncategorized",
    location: body.location || null,
    licensing: body.licensing || null,
    creator: body.creator || null,
    videoMetadata: isVideo ? { hasAutoThumbnail: false, selectedThumbnail: finalPreviewUrl } : {},
    metadata: {
      extractionStatus: "pending",
      note: "Use /api/extractMetadata to extract file metadata",
    },
    status: "ready",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const [inserted] = await db.insert(assets).values(assetRecord).returning();
  const formatted = formatAsset(inserted);

  const elapsed = Date.now() - startTime;

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Asset created successfully",
      assetId,
      data: formatted,
      processingTime: `${elapsed}ms`,
    }),
  };
}

async function handleUpdate(body, startTime) {
  const {
    assetId,
    fileName,
    description,
    tags,
    category,
    location,
    licensing,
    creator,
    summary,
    caption,
  } = body;

  const [existing] = await db.select().from(assets).where(eq(assets.assetId, assetId));

  if (!existing) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Asset not found" }),
    };
  }

  const updates = {
    updatedAt: new Date(),
  };

  if (fileName !== undefined) {
    updates.name = fileName;
    updates.fileName = fileName;
  }
  if (description !== undefined) updates.description = description;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [tags];
  if (category !== undefined) updates.category = category;
  if (location !== undefined) updates.location = location;
  if (licensing !== undefined) updates.licensing = licensing;
  if (creator !== undefined) updates.creator = creator;
  if (summary !== undefined) updates.summary = summary;
  if (caption !== undefined) updates.caption = caption;

  const [updated] = await db.update(assets).set(updates).where(eq(assets.assetId, assetId)).returning();
  const formatted = formatAsset(updated);

  const elapsed = Date.now() - startTime;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Asset updated successfully",
      assetId,
      data: formatted,
      processingTime: `${elapsed}ms`,
    }),
  };
}
