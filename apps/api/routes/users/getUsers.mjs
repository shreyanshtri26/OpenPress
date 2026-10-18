import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

export const handler = async (event) => {
  console.log("getUsers event:", event);

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
        message: "Users retrieved successfully",
        data: mappedUsers,
      }),
    };
  } catch (err) {
    console.error("Error retrieving users:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: err.message,
      }),
    };
  }
};
