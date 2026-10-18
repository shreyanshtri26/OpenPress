import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { pages } from "../../db/schema.mjs";

async function upsertGlobalBlogRightSidebar({
  sourcePageId,
  data,
  now,
}) {
  if (!data?.zones || typeof data.zones !== "object") return;

  // 1️⃣ Extract blog right-side zones
  const rightZones = {};

  for (const [zoneKey, zoneValue] of Object.entries(data.zones)) {
    if (zoneKey.includes(":blog-grid-right-")) {
      const normalizedKey = zoneKey.split(":")[1]; // blog-grid-right-x
      rightZones[normalizedKey] = zoneValue;
    }
  }

  // 2️⃣ Find existing Global Sidebar (pageType + layoutScope)
  const [existingItem] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.pageType, "GlobalSidebar"),
        eq(pages.layoutScope, "BLOG_RIGHT")
      )
    )
    .limit(1);

  // 3️⃣ CREATE
  if (!existingItem) {
    const newItem = {
      pageId: randomUUID(),
      pageType: "GlobalSidebar",
      layoutScope: "BLOG_RIGHT",
      sourcePageId,
      data: {
        zones: rightZones,
      },
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(pages).values(newItem);
    return;
  }

  // 4️⃣ UPDATE
  await db
    .update(pages)
    .set({
      data: { zones: rightZones },
      updatedAt: now,
    })
    .where(eq(pages.pageId, existingItem.pageId));
}

export const handler = async (event) => {
  try {
    if (!event?.body) {
      return json(400, { message: "Missing body" });
    }

    const body = JSON.parse(event.body || "{}");
    let { pageId, pageType, data, status } = body;

    if (!pageType) {
      return json(400, { message: "pageType is required" });
    }

    // Validate data structure
    if (!data || typeof data !== "object") {
      return json(400, { message: "data must be an object" });
    }
    if (!data.root || !data.content) {
      return json(400, { message: "data must include root and content" });
    }

    const now = new Date();
    const isNew = !pageId;

    // 1️⃣ Generate new pageId if this is a new page
    if (isNew) {
      pageId = randomUUID();
    }

    // 2️⃣ Check if record exists
    let existingItem = null;
    if (!isNew) {
      const [found] = await db
        .select()
        .from(pages)
        .where(eq(pages.pageId, pageId))
        .limit(1);
      existingItem = found || null;
    }

    // 3️⃣ If not found → create new record
    if (isNew || !existingItem) {
      const newItem = {
        pageId,
        pageType,
        data,
        status: status || "draft",
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(pages).values(newItem);

      if (pageType === "Blog") {
        try {
          await upsertGlobalBlogRightSidebar({
            sourcePageId: pageId,
            data,
            now,
          });
        } catch (e) {
          console.error("Global sidebar autosave failed:", e);
        }
      }

      return json(200, {
        message: "Autosaved (created)",
        pageId,
        pageType,
        updatedAt: now.toISOString(),
        status: newItem.status,
      });
    }

    // 4️⃣ If found → update existing record
    const [updateRes] = await db
      .update(pages)
      .set({
        data,
        status: status || existingItem.status || "draft",
        updatedAt: now,
      })
      .where(eq(pages.pageId, pageId))
      .returning();

    if (pageType === "Blog") {
      try {
        await upsertGlobalBlogRightSidebar({
          sourcePageId: pageId,
          data,
          now,
        });
      } catch (e) {
        console.error("Global sidebar autosave failed:", e);
      }
    }

    return json(200, {
      message: "Autosaved (updated)",
      pageId,
      pageType: existingItem.pageType,
      updatedAt: updateRes?.updatedAt ? new Date(updateRes.updatedAt).toISOString() : now.toISOString(),
      status: updateRes?.status || status || "draft",
    });
  } catch (err) {
    console.error("Autosave error:", err);
    return json(500, {
      message: "Server error",
      error: err?.message || String(err),
    });
  }
};

// Utility: JSON Response
function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
