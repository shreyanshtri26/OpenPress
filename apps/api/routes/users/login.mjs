import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 🔑 JWT generator
const generateToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      userId: user.userId
    },
    process.env.JWT_SECRET,
    { expiresIn: "9h" }
  );
};

export const handler = async (event) => {

  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;


    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password required" }),
      };
    }

    // Fetch user from Postgres by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));


    if (!user || !user.password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid credentials" }),
      };
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid credentials" }),
      };
    }

    // Generate JWT
    const token = generateToken(user);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Login successful",
        user: {   
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          role: user.role.toLowerCase(),
          personalizeUserId: user.userId
        },
        token,
      }),
    };
  } catch (err) {
    console.error("Login error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};
