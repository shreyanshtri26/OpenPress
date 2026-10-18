import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { taxonomyId, value } = body;

    // 1) Validation
    if (!taxonomyId || !value) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "'taxonomyId' and 'value' are required",
        }),
      };
    }

    // 2) Read existing item
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

    // 3) Check if value exists
    if (!existingValues.includes(value)) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Value not found in taxonomy" }),
      };
    }

    // 4) Remove the value from the array
    const updatedList = existingValues.filter((v) => v !== value);
    const now = new Date();

    // 5) Update Postgres
    const [updated] = await db
      .update(taxonomies)
      .set({
        values: updatedList,
        updatedAt: now,
      })
      .where(eq(taxonomies.taxonomyId, taxonomyId))
      .returning();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Value deleted successfully",
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
        message: "Error deleting value",
        error: err.message,
      }),
    };
  }
};
