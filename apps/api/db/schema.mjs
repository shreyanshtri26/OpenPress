import { pgTable, text, timestamp, boolean, jsonb, uuid, index, integer, primaryKey } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  roleId: text('role_id').primaryKey(),
  permissions: jsonb('permissions').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull().references(() => roles.roleId, { onDelete: 'restrict' }),
  isAuthor: boolean('is_author').default(false).notNull(),
  authorName: text('author_name'),
  profilePic: text('profile_pic'),
  bio: text('bio'),
  status: text('status').default('active').notNull(),
  mobile: text('mobile'),
  resetToken: text('reset_token'),
  resetExpiresAt: timestamp('reset_expires_at', { withTimezone: true }),
  profile: jsonb('profile'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const taxonomies = pgTable('taxonomies', {
  taxonomyId: text('taxonomy_id').primaryKey(),
  name: text('name').notNull().unique(),
  values: jsonb('values').notNull().default([]),
  permissions: jsonb('permissions').notNull().default({}),
  isMendatory: boolean('is_mendatory').notNull().default(false),
  // value -> #hex accent shown on that value's chips and pills on the site, e.g. { "Politics": "#b42318" }
  colors: jsonb('colors').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const stories = pgTable('stories', {
  storyId: text('story_id').primaryKey(),
  title: text('title').notNull().default('Untitled Draft'),
  description: text('description').default(''),
  proposedFilingDate: timestamp('proposed_filing_date', { withTimezone: true }),
  assignedTo: text('assigned_to'),
  authorId: text('author_id'),
  slug: text('slug'),
  publish: text('publish'),
  image: text('image'),
  status: text('status').notNull().default('draft'),
  state: text('state').default(''),
  isComplete: boolean('is_complete').default(false),
  publishUrl: text('publish_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  scheduledPublishDate: timestamp('scheduled_publish_date', { withTimezone: true }),
  body: jsonb('body'),
  fields: jsonb('fields').default({}),
  comments: jsonb('comments').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('stories_status_idx').on(table.status),
  index('stories_author_id_idx').on(table.authorId),
  index('stories_created_at_idx').on(table.createdAt),
]);

export const articles = pgTable(
  'articles',
  {
    articleId: text('article_id').primaryKey(),
    postFormat: text('post_format').default('standard'),
    title: text('title').notNull().default(''),
    excerpt: text('excerpt').default(''),
    content: text('content').default(''),
    cate: text('cate').default(''),
    tags: jsonb('tags').notNull().default([]),
    status: text('status').notNull().default('draft'),
    slug: text('slug'),
    cate_bg: text('cate_bg'),
    cate_img: text('cate_img'),
    featureImg: text('feature_img'),
    date: timestamp('date', { withTimezone: true }),
    post_views: integer('post_views').notNull().default(0),
    post_share: integer('post_share').notNull().default(0),
    author: text('author'),
    author_email: text('author_email'),
    author_name: text('author_name'),
    author_desg: text('author_desg'),
    author_img: text('author_img'),
    author_bio: text('author_bio'),
    author_social: jsonb('author_social').notNull().default([]),
    media: jsonb('media').notNull().default([]),
    remarks: text('remarks').default(''),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    editorId: text('editor_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('articles_status_idx').on(table.status),
    index('articles_author_idx').on(table.author),
    index('articles_editor_id_idx').on(table.editorId),
    index('articles_slug_idx').on(table.slug),
    index('articles_created_at_idx').on(table.createdAt),
  ]
);

export const pages = pgTable(
  'pages',
  {
    pageId: text('page_id').primaryKey(),
    pageType: text('page_type').notNull(),
    layoutScope: text('layout_scope'),
    sourcePageId: text('source_page_id'),
    data: jsonb('data').notNull().default({}),
    status: text('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('pages_page_type_idx').on(table.pageType),
    index('pages_layout_scope_idx').on(table.layoutScope),
    index('pages_status_idx').on(table.status),
  ]
);



export const assets = pgTable(
  'assets',
  {
    assetId: text('asset_id').primaryKey(),
    name: text('name').notNull().default(''),
    fileName: text('file_name').notNull().default(''),
    fileType: text('file_type').notNull().default(''),
    fileUrl: text('file_url').notNull().default(''),
    previewUrl: text('preview_url'),
    s3Key: text('s3_key'),
    userId: text('user_id'),
    uploadedBy: text('uploaded_by'),
    description: text('description').default(''),
    summary: text('summary').default(''),
    caption: text('caption').default(''),
    tags: jsonb('tags').notNull().default([]),
    category: text('category'),
    location: text('location'),
    licensing: text('licensing'),
    creator: text('creator'),
    videoMetadata: jsonb('video_metadata').default({}),
    metadata: jsonb('metadata').default({}),
    status: text('status').default('ready'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('assets_user_id_idx').on(table.userId),
    index('assets_created_at_idx').on(table.createdAt),
    index('assets_file_type_idx').on(table.fileType),
  ]
);

// DynamoDB-style items for features not yet given their own table (see db/doc-store.mjs).
// pk = sorted JSON of the item's key attributes, e.g. [["campaignId","c1"]].
export const documents = pgTable(
  'documents',
  {
    tableName: text('table_name').notNull(),
    pk: text('pk').notNull(),
    item: jsonb('item').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.tableName, table.pk] })]
);

// First-party reader analytics (no cookies, no third parties). One row per event sent by the
// published pages' tracker to POST /analytics/collect; the /analytics/* reports aggregate it.
// type: page_view | page_exit | share_button_click
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    type: text('type').notNull(),
    userId: text('user_id').notNull(),
    sessionId: text('session_id').notNull(),
    pageId: text('page_id'),
    pageTitle: text('page_title'),
    pageCategory: text('page_category'),
    referrerDomain: text('referrer_domain'),
    deviceType: text('device_type'),
    browser: text('browser'),
    os: text('os'),
    language: text('language'),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    durationMs: integer('duration_ms'),
    depth: integer('depth'),
    sharePlatform: text('share_platform'),
  },
  (table) => [
    index('analytics_events_ts_idx').on(table.ts),
    index('analytics_events_user_idx').on(table.userId),
    index('analytics_events_session_idx').on(table.sessionId),
    index('analytics_events_type_ts_idx').on(table.type, table.ts),
  ]
);

export const readerUsers = pgTable(
  'reader_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    neonAuthId: text('neon_auth_id').notNull().unique(),
    email: text('email').notNull().unique(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    subscriptionTier: text('subscription_tier').default('free').notNull(),
    subscriptionStatus: text('subscription_status').default('active').notNull(),
    subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
    preferences: jsonb('preferences').default({}),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('reader_users_email_idx').on(table.email),
    index('reader_users_neon_auth_idx').on(table.neonAuthId),
  ]
);

