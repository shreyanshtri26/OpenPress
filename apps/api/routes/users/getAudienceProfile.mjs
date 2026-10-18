import { getAudienceUserByEmail, toAudienceClientUser } from "./audienceProfileHelpers.mjs";

export const handler = async (event) => {
  try {
    const email = event.user?.email;

    if (!email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }

    const user = await getAudienceUserByEmail(email);

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Audience profile not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: toAudienceClientUser(user),
      }),
    };
  } catch (error) {
    console.error("Get audience profile error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message }),
    };
  }
};