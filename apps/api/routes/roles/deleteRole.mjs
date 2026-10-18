import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { roles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const { roleId } = event.queryStringParameters || {};

    if (!roleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "roleId is required in path parameters" }),
      };
    }

    const [deleted] = await db
      .delete(roles)
      .where(eq(roles.roleId, roleId))
      .returning();

    if (!deleted) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Role not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Role '${roleId}' deleted successfully` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error deleting role",
        error: err.message,
      }),
    };
  }
};
