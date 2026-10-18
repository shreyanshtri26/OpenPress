import { db } from "../../db/client.mjs";
import { roles } from "../../db/schema.mjs";

export const handler = async () => {
  try {
    const roleItems = await db.select({ roleId: roles.roleId }).from(roles);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Roles fetched successfully",
        count: roleItems.length,
        roles: roleItems,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error fetching role list",
        error: err.message,
      }),
    };
  }
};
