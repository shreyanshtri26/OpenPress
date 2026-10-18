import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

export const handler = async () => {
  try {
    const [section] = await db
      .select()
      .from(taxonomies)
      .where(eq(taxonomies.name, "Section"));

    if (!section) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Section taxonomy not found",
        }),
      };
    }

    const values = section.values || [];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taxonomy: section.name,
        count: values.length,
        values,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Error fetching Section values",
        error: err.message,
      }),
    };
  }
};
