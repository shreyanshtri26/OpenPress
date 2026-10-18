import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

const MENDATORY_DEFAULT_PERMISSIONS = {
  "Raise a story": true,
  "Ideas": true,
  "In progress": true,
  "In review": true,
  "Ready to publish": true,
  "Published": true,
  "More Story Card": true,
  "Thumbnail Grid": true,
  "Selection": "single"
};

const DEFAULT_PERMISSIONS = {
  "Raise a story": false,
  "Ideas": false,
  "In progress": false,
  "In review": false,
  "Ready to publish": false,
  "Published": false,
  "More Story Card": false,
  "Thumbnail Grid": false,
  "Selection": "single"
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { name, isMendatory=false } = body;

    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "name is required" }),
      };
    }

    const trimmedName = name.trim();
    const [existing] = await db
      .select()
      .from(taxonomies)
      .where(eq(taxonomies.name, trimmedName));

    if (existing) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Taxonomy already exists" }),
      };
    }

    const now = new Date();
    const isMendatoryBool = typeof isMendatory === "boolean" ? isMendatory : false;
    const permissions = isMendatoryBool ? MENDATORY_DEFAULT_PERMISSIONS : DEFAULT_PERMISSIONS;

    const newItem = {
      taxonomyId: crypto.randomUUID(),
      name: trimmedName,
      values: [],
      permissions,
      isMendatory: isMendatoryBool,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(taxonomies).values(newItem);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Taxonomy created successfully",
        taxonomy: {
          ...newItem,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating taxonomy",
        error: err.message,
      }),
    };
  }
};
