import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

const authorRoles = ["Reporter", "Editor", "Super User"];

export const handler = async (event) => {
  try {
    const { email, password, role, fullName, status } = JSON.parse(event.body || "{}");

    // ✅ Validate required fields
    if (!email || !password || !role || !fullName || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // ✅ Validate status value
    const validStatuses = ["active", "inactive", "pending"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: "Invalid status. Must be one of: active, inactive, pending" 
        }),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Email already in use" }),
      };
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Determine isAuthor flag
    const isAuthor = authorRoles.includes(role);

    // ✅ Check if author name already exists (case-insensitive)
    if (isAuthor) {
      const normalizedInput = fullName.trim().toLowerCase();
      const existingAuthors = await db
        .select({ authorName: users.authorName })
        .from(users)
        .where(sql`lower(${users.authorName}) = ${normalizedInput}`);

      if (existingAuthors.length > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            message: "Author name already exists",
          }),
        };
      }
    }

    const now = new Date();
    const newUser = {
      userId: crypto.randomUUID(),
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      role: role,
      isAuthor,
      authorName: isAuthor ? fullName : null,
      status: status.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(users).values(newUser);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "User created successfully",
        user: {
          userId: newUser.userId,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          isAuthor: newUser.isAuthor,
          status: newUser.status,
        },
      }),
    };
  } catch (error) {
    console.error("Add user error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message }),
    };
  }
};
