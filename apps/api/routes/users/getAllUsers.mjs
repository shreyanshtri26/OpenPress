import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

export const handler = async () => {
  try {
    const allUsers = await db.select().from(users);

    const mappedUsers = allUsers.map((u) => ({
      userId: u.userId,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      isAuthor: u.isAuthor,
      authorName: u.authorName,
      profilePic: u.profilePic,
      bio: u.bio,
      mobile: u.mobile,
      createdAt: u.createdAt?.toISOString(),
      updatedAt: u.updatedAt?.toISOString(),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All users fetched successfully",
        count: mappedUsers.length,
        users: mappedUsers,
        data: mappedUsers,
      }),
    };
  } catch (error) {
    console.error("Get all users error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};
