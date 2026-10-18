import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { roles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const { roleId } = event.queryStringParameters || {};
    const { permissions } = JSON.parse(event.body || "{}");

    if (!roleId || !permissions) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "roleId and permissions are required",
        }),
      };
    }

    const [updated] = await db
      .update(roles)
      .set({ permissions, updatedAt: new Date() })
      .where(eq(roles.roleId, roleId))
      .returning();

    if (!updated) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Role not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Role updated successfully",
        role: {
          roleId: updated.roleId,
          permissions: updated.permissions,
          createdAt: updated.createdAt?.toISOString(),
          updatedAt: updated.updatedAt?.toISOString(),
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error updating role",
        error: err.message,
      }),
    };
  }
};
