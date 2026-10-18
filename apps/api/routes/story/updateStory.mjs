import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory, extractStoryFields } from "./storyHelper.mjs";

function normalizeStatus(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : "";
}

function shouldSkipDuplicateCheck(title) {
  if (!title || title.trim() === "") return true;
  const normalized = title.trim().toLowerCase();
  const skipPatterns = [
    /^untitled\s*draft$/i,
    /^draft\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/i,
    /^draft\s*-\s*\d{4}-\d{2}-\d{2}$/i,
    /^new\s*story$/i,
    /^untitled$/i,
  ];
  return skipPatterns.some(pattern => pattern.test(normalized));
}

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-role,x-user-id",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    let updatedData = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    const storyId = event.storyId || event.pathParameters?.storyId || event.queryStringParameters?.storyId || updatedData.storyId;

    if (!storyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Story ID is required" }),
      };
    }

    const [existing] = await db.select().from(stories).where(eq(stories.storyId, storyId));
    if (!existing) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Story not found" }),
      };
    }

    const effectiveStatus = updatedData.status !== undefined
      ? normalizeStatus(updatedData.status)
      : normalizeStatus(existing.status);

    const isPublishingUpdate = effectiveStatus === "published";
    const skipDuplicateCheck = updatedData.skipDuplicateCheck === true;

    if (isPublishingUpdate && !skipDuplicateCheck) {
      const newTitle = (updatedData.title !== undefined ? updatedData.title : existing.title)?.trim();
      if (newTitle && !shouldSkipDuplicateCheck(newTitle)) {
        const normalizedTitle = newTitle.toLowerCase();
        const duplicates = await db
          .select({ storyId: stories.storyId })
          .from(stories)
          .where(sql`lower(${stories.title}) = ${normalizedTitle} AND ${stories.status} = 'published' AND ${stories.storyId} != ${storyId}`);

        if (duplicates.length > 0) {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              message: "Duplicate title",
              error: "A story with this title already exists. Please choose a different title.",
              field: "title",
              existingStoryId: duplicates[0].storyId,
            }),
          };
        }
      }
    }

    const { staticFields, dynamicFields } = extractStoryFields(updatedData);
    delete staticFields.storyId;

    const updates = {
      updatedAt: new Date(),
    };

    if (staticFields.title !== undefined) updates.title = staticFields.title;
    if (staticFields.description !== undefined) {
      updates.description = typeof staticFields.description === "string" ? staticFields.description : (staticFields.description ? JSON.stringify(staticFields.description) : "");
    }
    if (staticFields.proposedFilingDate !== undefined) {
      updates.proposedFilingDate = staticFields.proposedFilingDate ? new Date(staticFields.proposedFilingDate) : null;
    } else if (dynamicFields["Publish Date"] !== undefined) {
      updates.proposedFilingDate = dynamicFields["Publish Date"] ? new Date(dynamicFields["Publish Date"]) : null;
      delete dynamicFields["Publish Date"];
    }
    if (staticFields.assignedTo !== undefined) {
      updates.assignedTo = Array.isArray(staticFields.assignedTo) ? JSON.stringify(staticFields.assignedTo) : staticFields.assignedTo;
    } else if (dynamicFields["Editor"] !== undefined) {
      updates.assignedTo = Array.isArray(dynamicFields["Editor"]) ? JSON.stringify(dynamicFields["Editor"]) : dynamicFields["Editor"];
      delete dynamicFields["Editor"];
    }
    if (staticFields.authorId !== undefined) {
      updates.authorId = staticFields.authorId;
    } else if (dynamicFields["Reporter"] !== undefined) {
      updates.authorId = dynamicFields["Reporter"];
      delete dynamicFields["Reporter"];
    }
    if (staticFields.slug !== undefined) updates.slug = staticFields.slug;
    if (staticFields.publish !== undefined) updates.publish = staticFields.publish;
    if (staticFields.image !== undefined) {
      updates.image = typeof staticFields.image === "string" ? staticFields.image : JSON.stringify(staticFields.image);
    }
    if (staticFields.status !== undefined) updates.status = staticFields.status;
    if (staticFields.state !== undefined) updates.state = staticFields.state;
    if (staticFields.isComplete !== undefined) updates.isComplete = Boolean(staticFields.isComplete);
    if (staticFields.publishUrl !== undefined) updates.publishUrl = staticFields.publishUrl;
    if (staticFields.publishedAt !== undefined) {
      updates.publishedAt = staticFields.publishedAt ? new Date(staticFields.publishedAt) : null;
    }
    if (staticFields.scheduledPublishDate !== undefined) {
      updates.scheduledPublishDate = staticFields.scheduledPublishDate ? new Date(staticFields.scheduledPublishDate) : null;
    }
    if (staticFields.body !== undefined) updates.body = staticFields.body;

    if (Object.keys(dynamicFields).length > 0) {
      updates.fields = { ...(existing.fields || {}), ...dynamicFields };
    }

    const [updated] = await db
      .update(stories)
      .set(updates)
      .where(eq(stories.storyId, storyId))
      .returning();

    const formatted = formatStory(updated);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Story updated successfully",
        story: formatted,
        data: formatted,
      }),
    };
  } catch (err) {
    console.error("❌ Update error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: err.message }),
    };
  }
};
