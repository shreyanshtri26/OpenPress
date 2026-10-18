// fetchAsset.mjs
import { desc, eq, ilike, sql, and } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { assets } from "../../db/schema.mjs";

export function formatAsset(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.assetId,
    type: row.fileType,
    url: row.fileUrl,
    previewUrl: row.previewUrl || row.fileUrl,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

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
    const params = event.queryStringParameters || {};

    if (params.assetId) {
      const [asset] = await db
        .select()
        .from(assets)
        .where(eq(assets.assetId, params.assetId));

      if (!asset) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: "Asset not found" }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: "Asset retrieved successfully",
          data: formatAsset(asset),
        }),
      };
    }

    const conditions = [];

    if (params.type) {
      conditions.push(ilike(assets.fileType, `%${params.type}%`));
    }

    if (params.search) {
      conditions.push(
        sql`(${assets.name} ILIKE ${`%${params.search}%`} OR ${assets.fileName} ILIKE ${`%${params.search}%`} OR ${assets.description} ILIKE ${`%${params.search}%`} OR ${assets.summary} ILIKE ${`%${params.search}%`})`
      );
    }

    if (params.category) {
      conditions.push(eq(assets.category, params.category));
    }

    const limit = params.limit ? Math.min(Math.max(1, parseInt(params.limit)), 500) : 100;
    const offset = params.offset ? Math.max(0, parseInt(params.offset)) : 0;

    const query = db
      .select()
      .from(assets)
      .orderBy(desc(assets.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const rows = await query;
    const formatted = rows.map(formatAsset);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Assets retrieved successfully",
        data: formatted,
        count: formatted.length,
        pagination: {
          hasMore: false,
        },
        filters: params,
      }),
    };
  } catch (err) {
    console.error("Error fetching assets:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Server error while fetching assets",
        error: err.message,
      }),
    };
  }
};
