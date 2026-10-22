// Rewrites an env file's old variable names to the current ones, keeping every value.
// Run by the deploy and seed workflows so a secret still using the old names keeps working.
// Does nothing once the secret uses the new names; delete this script and its two workflow steps then.
//   node scripts/rename-env-keys.mjs <env-file>
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: rename-env-keys.mjs <env-file>');

const RENAMES = [
  [/^AWS_OpenPress_REGION=.*\r?\n?/gm, ''],
  [/^AWS_ENDPOINT_URL_S3=/gm, 'STORAGE_ENDPOINT_URL='],
  [/^AWS_REGION=/gm, 'STORAGE_REGION='],
  [/^AWS_ACCESS_KEY_ID=/gm, 'STORAGE_ACCESS_KEY_ID='],
  [/^AWS_SECRET_ACCESS_KEY=/gm, 'STORAGE_SECRET_ACCESS_KEY='],
  [/^S3_DAM_BUCKET_NAME=/gm, 'DAM_BUCKET_NAME='],
  [/^S3_WEBSITE_BUCKET_NAME=/gm, 'WEBSITE_BUCKET_NAME='],
  [/^S3_REKOGNITION_BUCKET_NAME=/gm, 'ANALYSIS_BUCKET_NAME='],
  [/^DYNAMO_/gm, 'DOC_'],
  [/^ENABLE_REKOGNITION=/gm, 'ENABLE_IMAGE_ANALYSIS='],
  [/^MEDIACONVERT_(ENDPOINT|ROLE_ARN)=/gm, 'TRANSCODE_$1='],
  [/^SES_SENDER_EMAIL=/gm, 'EMAIL_SENDER='],
  [/^CLOUDFRONT_DISTRIBUTION_ID=/gm, 'CDN_DISTRIBUTION_ID='],
];

const before = readFileSync(file, 'utf8');
let after = before;
for (const [from, to] of RENAMES) after = after.replace(from, to);
writeFileSync(file, after);
console.log(after === before ? 'env names already current' : 'env names updated (values untouched)');
