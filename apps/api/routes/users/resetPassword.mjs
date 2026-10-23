import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, resetToken, newPassword } = body;

    // ✅ Validate required fields
    if (!email || !resetToken || !newPassword) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Email, reset token, and new password are required" 
        }),
      };
    }

    // ✅ Validate password strength
    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Password must be at least 8 characters long" 
        }),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid or expired reset token" }),
      };
    }

    // Check if reset token exists
    if (!user.resetToken || !user.resetExpiresAt) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Invalid or expired reset token" 
        }),
      };
    }

    // Check if token has expired
    const now = new Date();
    const expiryDate = new Date(user.resetExpiresAt);
    
    if (now > expiryDate) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Reset token has expired. Please request a new one." 
        }),
      };
    }

    // Verify token matches (Hashed comparison)
    const isTokenValid = await bcrypt.compare(resetToken, user.resetToken);
    if (!isTokenValid) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid reset token" }),
      };
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, normalizedEmail));


    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Password has been reset successfully",
        email: normalizedEmail
      }),
    };

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to reset password",
        details: error.message
      }),
    };
  }
};
