// Key schema of every DynamoDB-style table, keyed by the env var holding its name.
// Used by the local DynamoDB setup and by the Postgres document store (db/doc-store.mjs).
const gsi = (name, hash, range) => ({ name, hash, range });

export const TABLE_DEFS = [
  { env: 'DYNAMO_USERS_TABLE_NAME', hash: 'email' },
  { env: 'DYNAMO_ROLES_TABLE_NAME', hash: 'roleId' },
  { env: 'DYNAMO_STORIES_TABLE_NAME', hash: 'storyId', gsis: [gsi('authorId-createdAt-index', 'authorId', 'createdAt'), gsi('status-createdAt-index', 'status', 'createdAt')] },
  { env: 'DYNAMO_ARTICLES_TABLE_NAME', hash: 'articleId', gsis: [gsi('authorId-status-index', 'authorId', 'status'), gsi('editorId-status-index', 'editorId', 'status')] },
  { env: 'DYNAMO_ASSETS_TABLE_NAME', hash: 'assetId' },
  { env: 'DYNAMO_TAXONOMY_TABLE_NAME', hash: 'taxonomyId' },
  { env: 'DYNAMO_PAGEBUILDER_TABLE_NAME', hash: 'pageId' },
  { env: 'DYNAMO_CAMPAIGN_TABLE_NAME', hash: 'campaignId' },
  { env: 'DYNAMO_PLACEMENT_TABLE_NAME', hash: 'placementId' },
  { env: 'DYNAMO_AUDIENCE_TABLE_NAME', hash: 'email', fallback: 'op_audience' },
  { env: 'DYNAMO_CONTACT_US_TABLE', hash: 'submissionId', fallback: 'op_contact_submissions' },
  { env: 'DYNAMO_SUPPORTERS_TABLE', hash: 'supportId', fallback: 'op_supporters' },
  { env: 'DYNAMO_SEARCH_HISTORY_TABLE', hash: 'searchId', fallback: 'op_searchhistory' },
  { env: 'DYNAMO_SURVEY_TABLE_NAME', hash: 'surveyId' },
  { env: 'DYNAMO_SURVEY_TABLE_NAME', suffix: '_responses', hash: 'responseId' },
  { env: 'DYNAMO_SURVEY_CHAT_TABLE_NAME', hash: 'chatKey', range: 'createdAt' },
];

// Resolved against the current environment: [{ name, hash, range, gsis }]
export function resolveTables(env = process.env) {
  return TABLE_DEFS.map((t) => {
    const base = env[t.env] || t.fallback;
    return base ? { ...t, name: base + (t.suffix || '') } : null;
  }).filter(Boolean);
}

export function keySchemaFor(tableName, env = process.env) {
  const def = resolveTables(env).find((t) => t.name === tableName);
  if (!def) throw new Error(`Unknown table "${tableName}" — add it to db/dynamo-tables.mjs`);
  return def;
}
