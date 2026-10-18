import { db } from "../../db/client.mjs";
import { roles } from "../../db/schema.mjs";

export const handler = async () => {
  try {
    const allRoles = await db.select().from(roles);
    const items = allRoles.map((r) => ({
      roleId: r.roleId,
      permissions: r.permissions,
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All roles fetched successfully",
        count: items.length,
        roles: items,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error fetching roles",
        error: err.message,
      }),
    };
  }
};
