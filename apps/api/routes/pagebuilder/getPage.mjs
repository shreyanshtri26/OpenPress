import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { pages, stories, users } from "../../db/schema.mjs";
import { formatStory } from "../story/storyHelper.mjs";

const FRONTEND_WEBSITE_URL = process.env.FRONTEND_WEBSITE_URL;
const normalizedFrontendUrl = FRONTEND_WEBSITE_URL?.replace(/\/+$/, "");

// Response helper
function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function collectStoryIdsDeep(value, storyIds) {
  if (!value) return;

  if (typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStoryIdsDeep(item, storyIds);
    }
    return;
  }

  for (const [key, val] of Object.entries(value)) {
    if (key === "storyId" && typeof val === "string" && val.trim()) {
      storyIds.add(val);
    } else {
      collectStoryIdsDeep(val, storyIds);
    }
  }
}

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    if (method === "OPTIONS") return json(200, { ok: true });

    const pageType = event.queryStringParameters?.pageType;
    if (!pageType) return json(400, { message: "Missing pageType" });

    // 1️⃣ Fetch existing page record by pageType
    const [existingPage] = await db
      .select()
      .from(pages)
      .where(eq(pages.pageType, pageType))
      .limit(1);

    let pageItem = existingPage;
    let isNewPage = false;

    // 2️⃣ If page not found → create new skeleton record
    if (!pageItem) {
      isNewPage = true;
      const now = new Date();
      const newPageId = randomUUID();

      const defaultData = {
        root: {
          type: "container",
          id: "root",
          props: {},
          children: [],
        },
        content: [],
        zones: {},
      };

      const newItem = {
        pageId: newPageId,
        pageType,
        data: defaultData,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(pages).values(newItem);
      pageItem = newItem;
    }

    const { pageId, data, status, updatedAt } = pageItem;

    // 3️⃣ Collect all storyIds
    const storyIds = new Set();

    function collectFromNode(node) {
      if (!node || typeof node !== "object") return;
      collectStoryIdsDeep(node.props, storyIds);
    }

    if (Array.isArray(data?.content)) {
      for (const entry of data.content) collectFromNode(entry);
    }
    if (data?.zones && typeof data.zones === "object") {
      for (const key of Object.keys(data.zones)) {
        const arr = data.zones[key];
        if (Array.isArray(arr)) {
          for (const child of arr) collectFromNode(child);
        }
      }
    }

    // 4️⃣ Fetch referenced stories
    const ids = Array.from(storyIds);
    const storiesById = {};

    if (ids.length > 0) {
      const rawStories = await db
        .select()
        .from(stories)
        .where(inArray(stories.storyId, ids));

      for (const raw of rawStories) {
        const s = formatStory(raw);
        storiesById[s.storyId] = s;
      }

      // 5️⃣ Hydrate author/assignedTo display names
      const userIds = new Set();
      Object.values(storiesById).forEach((s) => {
        if (s.authorId) userIds.add(s.authorId);
        if (s.assignedTo) userIds.add(s.assignedTo);
      });

      const userMap = new Map();
      if (userIds.size > 0) {
        const foundUsers = await db
          .select({
            userId: users.userId,
            fullName: users.fullName,
            email: users.email,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.userId, Array.from(userIds)));

        for (const u of foundUsers) {
          userMap.set(u.userId, u.fullName || u.email || `User ${String(u.userId).slice(0, 8)}`);
        }
      }

      for (const sid of Object.keys(storiesById)) {
        const s = storiesById[sid];

        let improvedPublishUrl = s.publishUrl;
        if (
          typeof s.publishUrl === "string" &&
          normalizedFrontendUrl &&
          s.publishUrl.startsWith(normalizedFrontendUrl)
        ) {
          improvedPublishUrl = s.publishUrl.replace(normalizedFrontendUrl, "");
        }

        storiesById[sid] = {
          ...s,
          publishUrl: improvedPublishUrl,
          authorName: s.authorId
            ? userMap.get(s.authorId) || `Unknown Author (${String(s.authorId).slice(0, 8)})`
            : undefined,
          assignedToName: s.assignedTo
            ? userMap.get(s.assignedTo) || `Unknown User (${String(s.assignedTo).slice(0, 8)})`
            : undefined,
        };
      }
    }

    const formattedUpdatedAt = updatedAt instanceof Date ? updatedAt.toISOString() : (typeof updatedAt === "string" ? updatedAt : new Date().toISOString());

    return json(200, {
      pageId,
      pageType,
      data,
      status,
      storiesById,
      updatedAt: formattedUpdatedAt,
      message: isNewPage ? "New page created" : "Page loaded",
    });
  } catch (err) {
    console.error("Get page (hydrated) error:", err);
    return json(500, { message: "Server error", error: err?.message || String(err) });
  }
};
