import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory, extractStoryFields } from "./storyHelper.mjs";

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

function normalizeStatus(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : "";
}

async function checkDuplicateTitle(title, excludeStoryId = null) {
  if (shouldSkipDuplicateCheck(title)) {
    return { exists: false, existingStory: null };
  }

  const normalizedTitle = title.trim().toLowerCase();
  const query = db
    .select({ storyId: stories.storyId, title: stories.title, status: stories.status })
    .from(stories)
    .where(sql`lower(${stories.title}) = ${normalizedTitle} AND ${stories.status} = 'published'`);

  const results = await query;
  const match = results.find(r => !excludeStoryId || r.storyId !== excludeStoryId);

  return { exists: Boolean(match), existingStory: match || null };
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const timestamp = new Date();

    const {
      title,
      description,
      authorId: rawAuthorId,
      status,
      state,
      slug,
      publish,
      image,
      ...dynamicFields
    } = body;

    const proposedFilingDate = body.proposedFilingDate || dynamicFields["Publish Date"] || null;
    const assignedTo = body.assignedTo || dynamicFields["Editor"] || null;
    const authorId = rawAuthorId || dynamicFields["Reporter"] || null;

    delete dynamicFields["Publish Date"];
    delete dynamicFields["Editor"];
    delete dynamicFields["Reporter"];
    delete dynamicFields["proposedFilingDate"];
    delete dynamicFields["assignedTo"];

    let processedFilingDate = null;
    if (proposedFilingDate) {
      const filingDate = new Date(proposedFilingDate);
      if (!isNaN(filingDate.getTime())) {
        const today = new Date();
        const filingLocal = new Date(filingDate.getFullYear(), filingDate.getMonth(), filingDate.getDate());
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (filingLocal < todayLocal) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "Invalid proposed filing date",
              error: "Proposed filing date cannot be in the past. Please select today or a future date.",
              field: "Publish Date",
            }),
          };
        }
        processedFilingDate = filingDate;
      }
    }

    if (publish && publish !== "now" && publish !== "later") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Invalid publish value",
          error: 'Publish must be either "now" or "later"',
          field: "publish",
          providedValue: publish,
        }),
      };
    }

    const isPublishing = normalizeStatus(status) === "published";
    const skipDuplicateCheck = body.skipDuplicateCheck === true;

    if (isPublishing && !skipDuplicateCheck) {
      const { exists: duplicateExists, existingStory } = await checkDuplicateTitle(title);
      if (duplicateExists) {
        return {
          statusCode: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Duplicate title",
            error: "A story with this title already exists. Please choose a different title.",
            field: "title",
            existingStoryId: existingStory?.storyId,
          }),
        };
      }
    }

    const isComplete = Boolean(
      title && description && proposedFilingDate && assignedTo && authorId
    );

    const finalStatus = status
      ? status
      : isComplete
      ? "Suggested"
      : "draft";

    const storyId = randomUUID();
    const assignedToStr = Array.isArray(assignedTo) ? JSON.stringify(assignedTo) : (assignedTo || null);
    const imageStr = typeof image === "string" ? image : (image ? JSON.stringify(image) : null);

    const newStoryRecord = {
      storyId,
      title: title || "Untitled Draft",
      description: typeof description === "string" ? description : (description ? JSON.stringify(description) : ""),
      proposedFilingDate: processedFilingDate,
      assignedTo: assignedToStr,
      authorId: authorId || null,
      slug: slug || null,
      publish: publish || null,
      image: imageStr,
      status: finalStatus,
      isComplete,
      state: state || "",
      fields: dynamicFields,
      comments: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: null,
    };

    const [inserted] = await db.insert(stories).values(newStoryRecord).returning();
    const formattedData = formatStory(inserted);

    let responseMessage =
      finalStatus === "draft"
        ? "Story saved as draft (some fields are incomplete)"
        : finalStatus === "Suggested"
        ? "New story idea raised successfully"
        : `Story created with status: ${finalStatus}`;

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: responseMessage,
        status: finalStatus,
        isComplete,
        data: formattedData,
        storyId,
      }),
    };
  } catch (err) {
    console.error("Error creating story:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error",
        error: err.message,
      }),
    };
  }
};
