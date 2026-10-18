import { defineConfig } from "@neon/config/v1";

// Every env var the handlers read. Only keys that are set get uploaded:
// optional AWS/web search features stay off when their keys are absent.
// Deploy: npx neon deploy --env .env.deploy   (.env.deploy is git-ignored; see .env.example for names)
const KEYS = [
  "ALLOWED_ORIGINS", "JWT_SECRET", "CRON_SECRET", "DATABASE_URL",
  "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_OpenPress_REGION",
  "AWS_REGION", "AWS_ENDPOINT_URL_S3", "PUBLIC_STORAGE_URL",
  "DYNAMO_ARTICLES_TABLE_NAME", "DYNAMO_ASSETS_TABLE_NAME", "DYNAMO_AUDIENCE_TABLE_NAME",
  "DYNAMO_CAMPAIGN_TABLE_NAME", "DYNAMO_CONTACT_US_TABLE", "DYNAMO_PAGEBUILDER_TABLE_NAME",
  "DYNAMO_PLACEMENT_TABLE_NAME", "DYNAMO_ROLES_TABLE_NAME", "DYNAMO_SEARCH_HISTORY_TABLE",
  "DYNAMO_STORIES_TABLE_NAME", "DYNAMO_SURVEY_CHAT_TABLE_NAME", "DYNAMO_SURVEY_TABLE_NAME",
  "DYNAMO_TAXONOMY_TABLE_NAME", "DYNAMO_USERS_TABLE_NAME",
  "S3_DAM_BUCKET_NAME", "S3_REKOGNITION_BUCKET_NAME", "S3_WEBSITE_BUCKET_NAME",
  "CLOUDFRONT_DISTRIBUTION_ID", "FRONTEND_URL", "FRONTEND_WEBSITE_URL", "SITE_URL",
  "MEDIACONVERT_ENDPOINT", "MEDIACONVERT_ROLE_ARN", "GEMINI_API_KEY", "GEMINI_MODEL", "BRAVE_API_KEY", "YOUPI_WEBHOOK_SECRET", "DYNAMO_SUPPORTERS_TABLE",
  "SES_SENDER_EMAIL",
];

const env = Object.fromEntries(
  KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]!]),
);

if (!env.JWT_SECRET || !env.CRON_SECRET || !env.ALLOWED_ORIGINS) {
  throw new Error("JWT_SECRET, CRON_SECRET and ALLOWED_ORIGINS must be set in the --env file");
}

export default defineConfig({
  // Free Neon Object Storage (S3-compatible). Point S3_*_BUCKET_NAME at these, set AWS_ENDPOINT_URL_S3 to the
  // branch storage endpoint and PUBLIC_STORAGE_URL to the same endpoint so public files resolve.
  buckets: {
    "openpress-dam": { access: "public_read" },
    "openpress-website": { access: "public_read" },
    "openpress-private": { access: "private" },
  },
  functions: {
    api: { name: "OpenPress API", source: "./src/server.mjs", env },
  },
  triggers: {
    "publish-scheduled": {
      type: "schedule",
      function: "api",
      cron: "*/30 * * * *",
      functionPath: `/__cron/${env.CRON_SECRET}`,
    },
  },
});
