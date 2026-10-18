import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { taxonomyId, permissions } = body;

    // 1️⃣ Validation
    if (!taxonomyId || !permissions) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "'taxonomyId' and 'permissions' are required",
        }),
      };
    }

    const [updated] = await db
      .update(taxonomies)
      .set({
        permissions,
        updatedAt: new Date(),
      })
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
        message: "Permissions updated successfully",
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
    console.error("❌ Error updating taxonomy permissions:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error updating taxonomy permissions",
        error: err.message,
      }),
    };
  }
};
