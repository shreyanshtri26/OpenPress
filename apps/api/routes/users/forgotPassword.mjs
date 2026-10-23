import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";

const POWER_AUTOMATE_WEBHOOK_URL = process.env.POWER_AUTOMATE_WEBHOOK_URL;

export const handler = async (event) => {
  try {
    let FRONTEND_URL = event.headers?.referer || event.headers?.Referer;
    FRONTEND_URL = FRONTEND_URL?.replace(/\/$/, '') || process.env.FRONTEND_URL || 'http://localhost:5173';

    const body = JSON.parse(event.body || "{}");
    const { email } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "If an account with that email exists, a reset link will be sent"
        }),
      };
    }

    // Rate Limiting: 60 seconds
    if (user.updatedAt) {
      const lastUpdate = new Date(user.updatedAt);
      const now = new Date();
      if (now - lastUpdate < 60000) {
        return {
          statusCode: 429,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Please wait a minute before requesting another reset link." }),
        };
      }
    }


    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const hashedToken = await bcrypt.hash(resetToken, 10);

    await db
      .update(users)
      .set({
        resetToken: hashedToken,
        resetExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.email, normalizedEmail));


    const resetLink = `${FRONTEND_URL}/auth/forgot-password/?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    if (POWER_AUTOMATE_WEBHOOK_URL) {
      try {
        await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, resetLink })
        });
      } catch (paError) {
        console.error(`❌ Power Automate error:`, paError.message);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Password reset link sent to your email",
        email: normalizedEmail,
        expiresIn: "30 minutes"
      }),
    };
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to process password reset",
        details: error.message
      }),
    };
  }
};
