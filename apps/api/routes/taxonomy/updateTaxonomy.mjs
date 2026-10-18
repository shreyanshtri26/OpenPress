import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { taxonomyId, newName } = body;

    if (!taxonomyId || !newName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "taxonomyId and newName are required",
        }),
      };
    }

    const [updated] = await db
      .update(taxonomies)
      .set({ name: newName.trim(), updatedAt: new Date() })
      .where(eq(taxonomies.taxonomyId, taxonomyId))
      .returning();

    if (!updated) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Taxonomy not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Taxonomy name updated successfully",
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
        message: "Error updating taxonomy name",
        error: err.message,
      }),
    };
  }
};
