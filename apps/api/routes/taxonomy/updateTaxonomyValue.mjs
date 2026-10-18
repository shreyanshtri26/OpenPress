import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { taxonomyId, oldValue, newValue } = body;

    // 1️⃣ Validation
    if (!taxonomyId || !oldValue || !newValue) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "'taxonomyId', 'oldValue', and 'newValue' are required",
        }),
      };
    }

    // 2️⃣ Fetch existing taxonomy
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

    // 3️⃣ Validate that old value exists
    if (!existingValues.includes(oldValue)) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: `Old value '${oldValue}' not found in taxonomy.`,
        }),
      };
    }

    // 4️⃣ Prevent duplicate new value
    if (existingValues.includes(newValue)) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: `New value '${newValue}' already exists.`,
        }),
      };
    }

    // 5️⃣ Replace the value in the array
    const updatedValues = existingValues.map((v) => (v === oldValue ? newValue : v));
    const now = new Date();

    const [updated] = await db
      .update(taxonomies)
      .set({
        values: updatedValues,
        updatedAt: now,
      })
      .where(eq(taxonomies.taxonomyId, taxonomyId))
      .returning();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Value updated successfully",
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
        message: "Error updating taxonomy value",
        error: err.message,
      }),
    };
  }
};
