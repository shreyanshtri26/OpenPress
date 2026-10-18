// uploadCustomThumbnail.mjs - Fixed S3 Signature Issues
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.AWS_OpenPress_REGION });
const TABLE_NAME = process.env.DYNAMO_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.S3_DAM_BUCKET_NAME;

// ✅ Validation Rules
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { assetId, fileName, fileType, fileSize, userId } = body;

    // ✅ Validate required fields
    if (!assetId || !fileName || !fileType || !fileSize) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "assetId, fileName, fileType, and fileSize are required",
          code: "MISSING_FIELDS"
        }),
      };
    }

    console.log(`🎨 Processing custom thumbnail upload for asset: ${assetId}`);

    // ✅ Validate asset exists and is a video
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });

    const result = await dynamoClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Video asset not found",
          code: "ASSET_NOT_FOUND"
        }),
      };
    }

    if (!asset.isVideo) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Custom thumbnails can only be uploaded for video assets",
          code: "NOT_VIDEO_ASSET"
        }),
      };
    }

    // ✅ Validate file type
    if (!ALLOWED_TYPES.includes(fileType.toLowerCase())) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Invalid file type. Supported formats: ${ALLOWED_TYPES.join(', ')}`,
          code: "INVALID_FILE_TYPE",
          supportedTypes: ALLOWED_TYPES
        }),
      };
    }

    // ✅ Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          code: "FILE_TOO_LARGE",
          maxSize: MAX_FILE_SIZE,
          providedSize: fileSize
        }),
      };
    }

    // ✅ Generate unique filename for custom thumbnail
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const customThumbnailKey = `thumbnails/custom/${assetId}-${timestamp}.${fileExtension}`;
    const customThumbnailUrl = `${publicObjectUrl(BUCKET_NAME, customThumbnailKey)}`;

    // ✅ Fixed: Create PutObjectCommand with minimal required parameters
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: customThumbnailKey,
      ContentType: fileType,
      // ✅ Remove ContentLength - let S3 handle it
      // ✅ Simplified metadata
      Metadata: {
        'assetid': assetId,
        'userid': userId || "unknown",
        'uploadtype': "custom-thumbnail",
        'timestamp': new Date().toISOString()
      }
    });

    // ✅ Generate presigned URL with longer expiry and proper options
    const uploadUrl = await getSignedUrl(s3Client, uploadCommand, { 
      expiresIn: 900, // 15 minutes (longer for large files)
      // ✅ Remove signing options that can cause issues
      signableHeaders: new Set(['content-type']),
      unsignableHeaders: new Set(['x-amz-content-sha256'])
    });

    console.log("✅ Custom thumbnail upload URL generated");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Custom thumbnail upload URL generated",
        uploadUrl,
        customThumbnailUrl,
        assetId,
        uploadInstructions: {
          method: "PUT",
          headers: {
            "Content-Type": fileType
            // ✅ Remove content-length header requirement
          },
          expiresIn: "15 minutes"
        },
        validation: {
          maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
          supportedTypes: ALLOWED_TYPES,
          recommendedDimensions: "1280x720 or 1920x1080"
        },
        nextSteps: {
          afterUpload: "Call POST /api/confirmCustomThumbnail to activate the thumbnail",
          payload: {
            assetId,
            customThumbnailUrl
          }
        }
      }),
    };

  } catch (err) {
    console.error("❌ Custom thumbnail upload preparation failed:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Custom thumbnail upload preparation failed",
        error: err.message,
        code: "UPLOAD_PREPARATION_FAILED"
      }),
    };
  }
};
