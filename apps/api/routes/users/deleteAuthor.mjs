import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const { email } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email is required" }),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ Update: turn off author & remove author fields
    const [updated] = await db
      .update(users)
      .set({
        isAuthor: false,
        authorName: null,
        profilePic: null,
        bio: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, normalizedEmail))
      .returning();

    if (!updated) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Author removed successfully",
      }),
    };

  } catch (error) {
    console.error("Delete author error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};
