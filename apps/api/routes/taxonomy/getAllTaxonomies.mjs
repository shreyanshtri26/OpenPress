import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async () => {
  try {
    const allTaxonomies = await db.select().from(taxonomies);

    const items = allTaxonomies.map((t) => ({
      taxonomyId: t.taxonomyId,
      name: t.name,
      values: t.values || [],
      permissions: t.permissions || {},
      isMendatory: t.isMendatory,
      createdAt: t.createdAt?.toISOString(),
      updatedAt: t.updatedAt?.toISOString(),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All taxonomies fetched successfully",
        count: items.length,
        taxonomies: items,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error fetching taxonomies",
        error: err.message,
      }),
    };
  }
};
