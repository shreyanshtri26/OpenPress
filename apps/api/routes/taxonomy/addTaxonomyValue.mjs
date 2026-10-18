import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { taxonomyId, value } = body;

    // Validation
    if (!taxonomyId || !value) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "'taxonomyId' and 'value' are required",
        }),
      };
    }

    const [item] = await db
      .select()
      .from(taxonomies)
      .where(eq(taxonomies.taxonomyId, taxonomyId));

    if (!item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Taxonomy not found" }),
      };
    }

    const existingValues = Array.isArray(item.values) ? item.values : [];

    // Prevent duplicates
    if (existingValues.includes(value)) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Value already exists" }),
      };
    }

    const newValues = [...existingValues, value];
    const now = new Date();

    const [updated] = await db
      .update(taxonomies)
      .set({
        values: newValues,
        updatedAt: now,
      })
      .where(eq(taxonomies.taxonomyId, taxonomyId))
      .returning();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Value added successfully",
        taxonomy: {
          taxonomyId: updated.taxonomyId,
          name: updated.name,
          values: updated.values,
          permissions: updated.permissions,
          isMendatory: updated.isMendatory,
          createdAt: updated.createdAt?.toISOString(),
          updatedAt: updated.updatedAt?.toISOString(),
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error adding value",
        error: err.message,
      }),
    };
  }
};
