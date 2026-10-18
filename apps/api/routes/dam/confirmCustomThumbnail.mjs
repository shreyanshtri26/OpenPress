// confirmCustomThumbnail.mjs - Confirm and Activate Custom Thumbnail
import { HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { UpdateCommand, GetCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";
import { createS3Client, keyFromObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.AWS_OpenPress_REGION });
const TABLE_NAME = process.env.DYNAMO_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.S3_DAM_BUCKET_NAME;

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { assetId, customThumbnailUrl, userId } = body;

    if (!assetId || !customThumbnailUrl) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "assetId and customThumbnailUrl are required",
          code: "MISSING_FIELDS"
        }),
      };
    }

    console.log(`🔍 Confirming custom thumbnail for asset: ${assetId}`);

    // ✅ Get current asset
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
          error: "Asset not found",
          code: "ASSET_NOT_FOUND"
        }),
      };
    }

    // ✅ Verify uploaded file exists in S3
    const s3Key = keyFromObjectUrl(customThumbnailUrl, BUCKET_NAME);
    
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });
      const s3Object = await s3Client.send(headCommand);
      console.log("✅ Custom thumbnail verified in S3");
    } catch (s3Error) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Custom thumbnail file not found or not uploaded yet",
          code: "THUMBNAIL_NOT_FOUND",
          customThumbnailUrl
        }),
      };
    }

    // ✅ Scenario 3: Handle replacing existing custom thumbnail
    const previousCustomThumbnail = asset.videoMetadata?.customThumbnail?.url;
    let replacementInfo = null;

    if (previousCustomThumbnail && previousCustomThumbnail !== customThumbnailUrl) {
      console.log("🔄 Replacing existing custom thumbnail");
      replacementInfo = {
        previousUrl: previousCustomThumbnail,
        newUrl: customThumbnailUrl,
        action: "replaced"
      };

      // ✅ Delete old custom thumbnail (optional - keep for audit trail)
      try {
        const oldS3Key = previousCustomThumbnail.split('/').slice(3).join('/');
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: oldS3Key
        }));
        console.log("🗑️ Old custom thumbnail deleted");
      } catch (deleteError) {
        console.warn("⚠️ Failed to delete old custom thumbnail:", deleteError);
      }
    }

    // ✅ Create or update videoMetadata structure
    const customThumbnailData = {
      url: customThumbnailUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId || "unknown",
      type: "custom",
      isActive: true,
      s3Key,
      ...(replacementInfo && { replacement: replacementInfo })
    };

    // ✅ Update asset with custom thumbnail
    let updateExpression;
    let expressionAttributeValues;

    if (!asset.videoMetadata) {
      // Create complete videoMetadata if it doesn't exist
      updateExpression = `
        SET videoMetadata = :videoMetadata,
            previewUrl = :previewUrl,
            updatedAt = :updatedAt
      `;
      
      expressionAttributeValues = {
        ":videoMetadata": {
          hasAutoThumbnail: false,
          hasCustomThumbnail: true,
          thumbnailGenerationStatus: "completed",
          thumbnailType: "custom",
          customThumbnail: customThumbnailData,
          selectedThumbnail: customThumbnailData,
          autoThumbnails: []
        },
        ":previewUrl": customThumbnailUrl,
        ":updatedAt": new Date().toISOString()
      };
    } else {
      // Update existing videoMetadata
      updateExpression = `
        SET videoMetadata.hasCustomThumbnail = :hasCustom,
            videoMetadata.thumbnailType = :thumbType,
            videoMetadata.customThumbnail = :customThumb,
            videoMetadata.selectedThumbnail = :selectedThumb,
            previewUrl = :previewUrl,
            updatedAt = :updatedAt
      `;
      
      expressionAttributeValues = {
        ":hasCustom": true,
        ":thumbType": "custom",
        ":customThumb": customThumbnailData,
        ":selectedThumb": customThumbnailData,
        ":previewUrl": customThumbnailUrl,
        ":updatedAt": new Date().toISOString()
      };
    }

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues
    });

    await dynamoClient.send(updateCommand);

    console.log("✅ Custom thumbnail confirmed and activated");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Custom thumbnail confirmed and activated successfully",
        assetId,
        customThumbnail: customThumbnailData,
        previewUrl: customThumbnailUrl,
        ...(replacementInfo && { replacement: replacementInfo }),
        status: {
          hasCustomThumbnail: true,
          thumbnailType: "custom",
          isActive: true
        }
      }),
    };

  } catch (err) {
    console.error("❌ Custom thumbnail confirmation failed:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Custom thumbnail confirmation failed",
        error: err.message,
        code: "CONFIRMATION_FAILED"
      }),
    };
  }
};
