import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { roles } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { roleId } = body;

    if (!roleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "roleId is required" }),
      };
    }

    const [existing] = await db.select().from(roles).where(eq(roles.roleId, roleId));
    if (existing) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Role already exists" }),
      };
    }

    const now = new Date();
    const newRole = {
      roleId,
      permissions: {
        editorial: {},
        library: {},
      },
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(roles).values(newRole);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Role created successfully",
        role: {
          ...newRole,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating role",
        error: err.message,
      }),
    };
  }
};
