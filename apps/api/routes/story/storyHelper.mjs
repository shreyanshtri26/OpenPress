// Shared helper to format story rows from Postgres into the exact JSON response shape expected by frontends.

export const KNOWN_STORY_KEYS = new Set([
  'storyId', 'title', 'description', 'proposedFilingDate', 'assignedTo',
  'authorId', 'slug', 'publish', 'image', 'status', 'state', 'isComplete',
  'publishUrl', 'publishedAt', 'scheduledPublishDate', 'body', 'comments',
  'createdAt', 'updatedAt',
]);

export function formatStory(row) {
  if (!row) return null;
  const { fields, ...rest } = row;

  let assignedTo = rest.assignedTo;
  if (typeof assignedTo === 'string' && (assignedTo.startsWith('[') || assignedTo.startsWith('{'))) {
    try { assignedTo = JSON.parse(assignedTo); } catch {}
  }

  let image = rest.image;
  if (typeof image === 'string' && (image.startsWith('{') || image.startsWith('['))) {
    try { image = JSON.parse(image); } catch {}
  }

  let description = rest.description;
  if (typeof description === 'string' && (description.startsWith('{') || description.startsWith('['))) {
    try { description = JSON.parse(description); } catch {}
  }

  const cleanFields = fields || {};
  const resolvedAssignedTo = assignedTo || cleanFields.assignedTo || cleanFields.Editor || null;
  const resolvedAuthorId = rest.authorId || cleanFields.authorId || cleanFields.Reporter || null;

  return {
    ...cleanFields,
    ...rest,
    description,
    assignedTo: resolvedAssignedTo,
    authorId: resolvedAuthorId,
    image,
    category: rest.category || cleanFields.category || cleanFields.Category || cleanFields.section || cleanFields.Section || '',
    createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : rest.updatedAt,
    proposedFilingDate: rest.proposedFilingDate instanceof Date ? rest.proposedFilingDate.toISOString() : rest.proposedFilingDate,
    publishedAt: rest.publishedAt instanceof Date ? rest.publishedAt.toISOString() : rest.publishedAt,
    scheduledPublishDate: rest.scheduledPublishDate instanceof Date ? rest.scheduledPublishDate.toISOString() : rest.scheduledPublishDate,
    comments: Array.isArray(rest.comments) ? rest.comments : [],
  };
}

export async function lookupUsers(userIdsArray) {
  const userMap = new Map();
  if (!userIdsArray || userIdsArray.length === 0) return userMap;

  const validIds = userIdsArray.filter(Boolean);
  if (validIds.length === 0) return userMap;

  const { inArray } = await import('drizzle-orm');
  const { db } = await import('../../db/client.mjs');
  const { users } = await import('../../db/schema.mjs');

  const foundUsers = await db
    .select({ userId: users.userId, fullName: users.fullName, email: users.email })
    .from(users)
    .where(inArray(users.userId, validIds));

  for (const u of foundUsers) {
    userMap.set(u.userId, u.fullName || u.email);
  }
  return userMap;
}

export function extractStoryFields(body) {
  const dynamicFields = {};
  const staticFields = {};

  for (const [k, v] of Object.entries(body)) {
    if (KNOWN_STORY_KEYS.has(k)) {
      staticFields[k] = v;
    } else {
      dynamicFields[k] = v;
    }
  }

  return { staticFields, dynamicFields };
}

// Only a Super User or the person who created the story may delete it.
export const canDeleteStory = (user, story) =>
  user?.role?.toLowerCase() === 'super user' || (Boolean(user?.userId) && user.userId === story?.authorId);

export const forbiddenDelete = (headers) => ({
  statusCode: 403,
  headers,
  body: JSON.stringify({ message: 'Only a Super User or the story creator can delete this story.' }),
});
