import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const { email } = JSON.parse(event.body || "{}");

    // ✅ Validate input
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email is required to delete a user" }),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ Delete user
    const [deleted] = await db
      .delete(users)
      .where(eq(users.email, normalizedEmail))
      .returning();

    if (!deleted) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User deleted successfully",
        email: normalizedEmail,
      }),
    };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message }),
    };
  }
};
