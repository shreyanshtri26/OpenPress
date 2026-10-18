import { and, eq, sql, desc, count } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory, lookupUsers } from "./storyHelper.mjs";

export const handler = async (event) => {
  try {
    const startTime = Date.now();
    const params = event.queryStringParameters || {};

    const limit = params.limit ? parseInt(params.limit, 10) : 50;
    const offset = params.offset ? parseInt(params.offset, 10) : 0;

    const conditions = [];

    if (params.status) {
      const statusList = params.status
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (statusList.length === 1) {
        conditions.push(sql`lower(${stories.status}) = ${statusList[0]}`);
      } else if (statusList.length > 1) {
        conditions.push(
          sql`lower(${stories.status}) IN (${sql.join(
            statusList.map((s) => sql`${s}`),
            sql`, `
          )})`
        );
      }
    }

    if (params.state) {
      const stateList = params.state
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (stateList.length === 1) {
        conditions.push(sql`lower(coalesce(${stories.state}, '')) = ${stateList[0]}`);
      } else if (stateList.length > 1) {
        conditions.push(
          sql`lower(coalesce(${stories.state}, '')) IN (${sql.join(
            stateList.map((s) => sql`${s}`),
            sql`, `
          )})`
        );
      }
    }

    if (params.authorId) {
      conditions.push(eq(stories.authorId, params.authorId));
    }

    if (params.assignedTo) {
      conditions.push(sql`${stories.assignedTo}::text LIKE ${`%${params.assignedTo}%`}`);
    }

    if (params.search) {
      const term = `%${params.search.toLowerCase()}%`;
      conditions.push(sql`lower(${stories.title}) LIKE ${term}`);
    }

    if (params.section) {
      conditions.push(sql`(${stories.fields}->>'Section' = ${params.section} OR ${stories.fields}->>'section' = ${params.section})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const [countResult] = await db
      .select({ total: count() })
      .from(stories)
      .where(whereClause);

    const totalCount = Number(countResult?.total || 0);

    // Data query
    let query = db
      .select()
      .from(stories)
      .where(whereClause)
      .orderBy(desc(stories.createdAt))
      .offset(offset);

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const rawStories = await query;
    const formattedStories = rawStories.map(formatStory);

    const userIds = new Set();
    formattedStories.forEach(s => {
      if (s.authorId) userIds.add(s.authorId);
      if (s.assignedTo) {
        if (Array.isArray(s.assignedTo)) s.assignedTo.forEach(uid => userIds.add(uid));
        else userIds.add(s.assignedTo);
      }
      if (s.Reporter) {
        if (Array.isArray(s.Reporter)) s.Reporter.forEach(uid => userIds.add(uid));
        else userIds.add(s.Reporter);
      }
    });

    const userMap = await lookupUsers(Array.from(userIds));
    const mapUserId = (uid) => userMap.get(uid) || `Unknown (${String(uid || '').slice(0, 8)})`;

    const enhancedStories = formattedStories.map(story => {
      return {
        ...story,
        authorName: story.authorId ? mapUserId(story.authorId) : (story.authorName || ""),
        assignedToName: story.assignedTo
          ? Array.isArray(story.assignedTo)
            ? story.assignedTo.map(mapUserId)
            : [mapUserId(story.assignedTo)]
          : [],
        reporterName: story.Reporter
          ? Array.isArray(story.Reporter)
            ? story.Reporter.map(mapUserId)
            : [mapUserId(story.Reporter)]
          : story.reporter
          ? Array.isArray(story.reporter)
            ? story.reporter.map(mapUserId)
            : [mapUserId(story.reporter)]
          : []
      };
    });

    const responseTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: 'Stories retrieved successfully',
        data: enhancedStories,
        count: totalCount,
        returned: enhancedStories.length,
        filters: params,
        performance: {
          queryTime: responseTime,
        }
      })
    };
  } catch (err) {
    console.error('❌ Error retrieving stories:', err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: 'Server error',
        error: err.message
      })
    };
  }
};
