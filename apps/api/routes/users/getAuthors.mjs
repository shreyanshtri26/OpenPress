import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

export const handler = async () => {
  try {
    const authorUsers = await db
      .select()
      .from(users)
      .where(eq(users.isAuthor, true));

    const authors = authorUsers.map((item) => ({
      userId: item.userId,
      fullName: item.fullName,
      email: item.email,
      role: item.role,
      status: item.status,
      createdAt: item.createdAt?.toISOString(),
      isAuthor: item.isAuthor,
      authorName: item.authorName || null,
      profilePic: item.profilePic || null,
      bio: item.bio || null,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Authors fetched successfully",
        count: authors.length,
        authors,
      }),
    };
  } catch (error) {
    console.error("Fetch authors error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};
