import { desc } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory } from "./storyHelper.mjs";

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const sectionValue = params.value;

    if (!sectionValue) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "value (section) is required" })
      };
    }

    // 1️⃣ Fetch stories ordered by createdAt desc
    const rows = await db
      .select()
      .from(stories)
      .orderBy(desc(stories.createdAt));

    const formattedStories = rows.map((r) => formatStory(r));

    // 2️⃣ Filter in JS (SAFE + CORRECT for both string and array section taxonomy)
    const matchedStories = formattedStories.filter((story) => {
      const sectionField = story.Section ?? story.section;

      if (!sectionField) return false;

      // string case
      if (typeof sectionField === "string") {
        return sectionField === sectionValue;
      }

      // array case
      if (Array.isArray(sectionField)) {
        return sectionField.includes(sectionValue);
      }

      return false;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Stories fetched by section",
        section: sectionValue,
        count: matchedStories.length,
        data: matchedStories
      })
    };

  } catch (err) {
    console.error("Error fetching stories by section:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: err.message
      })
    };
  }
};
