import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

const authorRoles = ["Reporter", "Editor", "Super User"];

export const handler = async (event) => {
  try {
    const {
      email,
      fullName,
      password,
      role,
      status,
      authorName,
      profilePic,
      bio,
    } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email is required to edit user" }),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!existingUser) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    // ✅ Case-insensitive author name uniqueness check
    if (authorName) {
      const normalizedInput = authorName.trim().toLowerCase();
      const duplicateAuthors = await db
        .select({ email: users.email })
        .from(users)
        .where(sql`lower(${users.authorName}) = ${normalizedInput} AND ${users.email} != ${normalizedEmail}`);

      if (duplicateAuthors.length > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            message: "Author name already exists",
          }),
        };
      }
    }

    const updates = {};

    if (fullName) {
      updates.fullName = fullName;
    }

    if (role) {
      updates.role = role;
      const isAuthor = authorRoles.includes(role);
      updates.isAuthor = isAuthor;
      if (!isAuthor) {
        updates.authorName = null;
        updates.profilePic = null;
        updates.bio = null;
      }
    }

    if (status) {
      updates.status = status.toLowerCase();
    }

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (authorName !== undefined) {
      updates.authorName = authorName;
    }

    if (profilePic !== undefined) {
      updates.profilePic = profilePic;
    }

    if (bio !== undefined) {
      updates.bio = bio;
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No fields provided to update" }),
      };
    }

    updates.updatedAt = new Date();

    await db
      .update(users)
      .set(updates)
      .where(eq(users.email, normalizedEmail));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User updated successfully",
      }),
    };

  } catch (error) {
    console.error("Edit user error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message }),
    };
  }
};
