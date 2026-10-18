import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { roles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const roleId = event.queryStringParameters?.roleId;
    if (!roleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "roleId is required" }),
      };
    }

    const [role] = await db.select().from(roles).where(eq(roles.roleId, roleId));
    if (!role) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Role '${roleId}' not found` }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Role fetched successfully",
        role: role.roleId,
        permissions: role.permissions || {},
      }),
    };
  } catch (err) {
    console.error("Error fetching role:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error fetching role",
        error: err.message,
      }),
    };
  }
};
