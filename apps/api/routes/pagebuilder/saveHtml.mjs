// routes/pagebuilder/saveHtml.mjs
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.STORAGE_REGION });

const BUCKET_NAME = process.env.WEBSITE_BUCKET_NAME;
const FRONTEND_WEBSITE_URL= process.env.FRONTEND_WEBSITE_URL;

const sanitizeSection = (section) =>
  section
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-") // Remove special chars
    .replace(/--+/g, "-") // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes

const sanitizeSlug = (slug) => {
  const sanitized = slug
    .toLowerCase()
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/[^a-z0-9-_]/g, "-") // Remove special chars
    .replace(/--+/g, "-") // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
  return sanitized.endsWith(".html") ? sanitized : `${sanitized}.html`;
};

/** The public URL this handler stores a story's HTML at. */
export const storyPublishUrl = (section, slug) =>
  `${FRONTEND_WEBSITE_URL}/${sanitizeSection(section)}/${sanitizeSlug(slug)}`;

export const handler = async (event) => {
  try {
    const startTime = Date.now();

    // ✅ Parse request body
    let body = JSON.parse(event.body || "{}");
    let { htmlContent, slug, section, status } = body;

    // Normalize category: support string OR array
    if (Array.isArray(section)) {
      // Option A → use first category
      section = section[0];

      // Option B → combine categories:
      // category = category.join("-");
    }

    // Ensure category is now string
    if (typeof section !== "string" || !section.trim()) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Invalid section format"
        })
      };
    }

    // ✅ Validate required fields
    if (!htmlContent) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required field: htmlContent"
        })
      };
    }

    if (!slug) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required field: slug"
        })
      };
    }

    if (!section) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing required field: section"
        })
      };
    }

    // ✅ Sanitize category for folder name, and slug for filename (with .html)
    const sanitizedSection = sanitizeSection(section);
    const sanitizedSlug = sanitizeSlug(slug);

    // ✅ Build S3 key: category/slug.html (or pending-html/ prefix if scheduled)
    const baseKey = `${sanitizedSection}/${sanitizedSlug}`;
    const s3Key = status === "scheduled" ? `pending-html/${baseKey}` : baseKey;

    console.log(`🔧 Uploading HTML to S3: ${BUCKET_NAME}/${s3Key}`);

    // ✅ Upload to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: htmlContent,
      ContentType: "text/html; charset=utf-8",
    
      // 🚫 Disable caching completely
      CacheControl: "no-store, no-cache, must-revalidate, max-age=0",
      Expires: new Date(0), // forces immediate expiration
      Metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: event.requestContext?.authorizer?.userId || "system",
        category: sanitizedSection,
        slug: sanitizedSlug
      }
    };
    

    await s3Client.send(new PutObjectCommand(uploadParams));

    console.log(`✅ Successfully uploaded to S3: ${s3Key}`);

    console.log("⏱ Time taken:", Date.now() - startTime, "ms");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "HTML content saved successfully",
        data: {
          bucket: BUCKET_NAME,
          category: sanitizedSection,
          slug: sanitizedSlug,
          key: s3Key,
          baseUrl: `${publicObjectUrl(BUCKET_NAME, baseKey)}`,
          url: `${FRONTEND_WEBSITE_URL}/${baseKey}`,
          status: status || "published"
        }
      })
    };

  } catch (err) {
    console.error("❌ Error saving HTML to S3:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Server error saving HTML content",
        error: err.message
      })
    };
  }
};
