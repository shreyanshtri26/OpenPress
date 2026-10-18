import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { assets } from "../../db/schema.mjs";
import { formatAsset } from "./fetchAsset.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    const { assetId, summary, caption, title, customTags, description, category, licensing, creator, location } = body;

    if (!assetId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "assetId is required" }),
      };
    }

    const [existing] = await db.select().from(assets).where(eq(assets.assetId, assetId));
    if (!existing) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Asset not found" }),
      };
    }

    const updates = {
      updatedAt: new Date(),
    };

    if (summary !== undefined) updates.summary = summary;
    if (caption !== undefined) updates.caption = caption;
    if (title !== undefined) updates.name = title;
    if (customTags !== undefined) updates.tags = Array.isArray(customTags) ? customTags : [customTags];
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (licensing !== undefined) updates.licensing = licensing;
    if (creator !== undefined) updates.creator = creator;
    if (location !== undefined) updates.location = location;

    const [updated] = await db.update(assets).set(updates).where(eq(assets.assetId, assetId)).returning();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Asset updated successfully",
        assetId,
        data: formatAsset(updated),
        asset: formatAsset(updated),
      }),
    };
  } catch (err) {
    console.error("❌ Error updating asset:", err);
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
