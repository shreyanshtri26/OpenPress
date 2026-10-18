import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory } from "./storyHelper.mjs";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-role,x-user-id",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // 1️⃣ Validate storyId (query param / injected / path param)
    const storyId =
      event.storyId ||
      event.queryStringParameters?.storyId ||
      event.pathParameters?.storyId;

    if (!storyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "storyId is required" }),
      };
    }

    // 2️⃣ Parse body
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    const { publishUrl } = body || {};

    if (!publishUrl || typeof publishUrl !== "string") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "publishUrl is required and must be a string",
        }),
      };
    }

    // 3️⃣ Fetch existing story
    const [existingStory] = await db
      .select()
      .from(stories)
      .where(eq(stories.storyId, String(storyId)))
      .limit(1);

    if (!existingStory) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Story not found" }),
      };
    }

    // 4️⃣ No-op check
    if (existingStory.publishUrl === publishUrl) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: "Publish URL already up to date",
          publishUrl,
          storyId,
        }),
      };
    }

    // 5️⃣ Update publishUrl
    const [updatedStory] = await db
      .update(stories)
      .set({
        publishUrl,
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, String(storyId)))
      .returning();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Publish URL saved successfully",
        publishUrl,
        data: formatStory(updatedStory),
        storyId,
      }),
    };
  } catch (error) {
    console.error("Error saving publishUrl:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server error",
        message: error.message,
      }),
    };
  }
};
