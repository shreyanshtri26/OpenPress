import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { taxonomyId } = body;

    if (!taxonomyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "taxonomyId is required",
        }),
      };
    }

    const [deleted] = await db
      .delete(taxonomies)
      .where(eq(taxonomies.taxonomyId, taxonomyId))
      .returning();

    if (!deleted) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Taxonomy not found",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Taxonomy deleted successfully",
        taxonomyId,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error deleting taxonomy",
        error: err.message,
      }),
    };
  }
};
