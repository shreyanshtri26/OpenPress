// routes/dam/transcodingTriggerAsync.mjs - Enhanced with better logging
import { UpdateCommand, GetCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";

const TABLE_NAME = process.env.DYNAMO_ASSETS_TABLE_NAME;

export const handler = async (event) => {
  const startTime = Date.now();

  try {
    const body = JSON.parse(event.body);
    const { assetId, userId, qualities } = body;

    console.log(`🎬 [${assetId}] Async transcoding request received`);
    console.log(`📋 [${assetId}] Requested qualities: ${qualities?.join(', ') || 'default'}`);

    if (!assetId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "assetId is required" })
      };
    }

    // Validate asset exists
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });
    const result = await dynamoClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      console.log(`❌ [${assetId}] Asset not found in database`);
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Asset not found" })
      };
    }

    if (!asset.isVideo) {
      console.log(`❌ [${assetId}] Asset is not a video: ${asset.type}`);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Asset is not a video file" })
      };
    }

    console.log(`✅ [${assetId}] Asset validation passed: ${asset.name}`);

    const requestedQualities = qualities || ["360p", "480p", "720p", "1080p"];
    
    // Update status to "processing" immediately
    console.log(`🔄 [${assetId}] Updating status to processing...`);
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: `
        SET videoMetadata.transcodingStatus = :status,
            videoMetadata.transcodingStartedAt = :startedAt,
            videoMetadata.requestedQualities = :qualities,
            videoMetadata.processingMethod = :method,
            videoMetadata.estimatedCompletionAt = :estimatedAt,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeValues: {
        ":status": "processing",
        ":startedAt": new Date().toISOString(),
        ":qualities": requestedQualities,
        ":method": "async-background",
        ":estimatedAt": new Date(Date.now() + (10 * 60 * 1000)).toISOString(),
        ":updatedAt": new Date().toISOString()
      }
    });

    await dynamoClient.send(updateCommand);
    console.log(`✅ [${assetId}] Status updated to processing`);

    // Start background processing (DON'T WAIT FOR IT)
    console.log(`🚀 [${assetId}] Starting background processing...`);
    processTranscodingInBackground(assetId, userId, requestedQualities)
      .catch(error => {
        console.error(`❌ [${assetId}] Background transcoding failed:`, error);
      });

    const elapsed = Date.now() - startTime;
    console.log(`⚡ [${assetId}] Immediate response ready in ${elapsed}ms`);

    // Return IMMEDIATE response
    return {
      statusCode: 202, // Accepted (processing)
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Transcoding job started successfully",
        assetId,
        status: "processing",
        processingMethod: "async-background",
        requestedQualities,
        estimatedTime: "5-15 minutes",
        checkStatusUrl: `/api/getQualityVariants/${assetId}`,
        pollingInterval: "30 seconds",
        processingTime: `${elapsed}ms`,
        startedAt: new Date().toISOString()
      })
    };

  } catch (err) {
    console.error("❌ Async transcoding trigger failed:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to start transcoding",
        error: err.message,
        processingTime: `${Date.now() - startTime}ms`
      })
    };
  }
};

// Background processing function (ASYNC - doesn't block response)
async function processTranscodingInBackground(assetId, userId, requestedQualities) {
  try {
    console.log(`🔄 [${assetId}] Starting background transcoding...`);
    
    // Import background processing module
    const { processVideoTranscoding } = await import('./backgroundProcessing.mjs');
    await processVideoTranscoding(assetId, userId, requestedQualities);
    
    console.log(`✅ [${assetId}] Background transcoding completed successfully`);
  } catch (error) {
    console.error(`❌ [${assetId}] Background transcoding failed:`, error);
    console.error(`📊 [${assetId}] Error stack:`, error.stack);
    
    // Update status to failed
    try {
      await dynamoClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { assetId },
        UpdateExpression: `
          SET videoMetadata.transcodingStatus = :status,
              videoMetadata.transcodingError = :error,
              videoMetadata.transcodingFailedAt = :failedAt,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":status": "failed",
          ":error": error.message,
          ":failedAt": new Date().toISOString(),
          ":updatedAt": new Date().toISOString()
        }
      }));
      
      console.log(`📝 [${assetId}] Updated status to failed in database`);
    } catch (updateError) {
      console.error(`❌ [${assetId}] Failed to update error status:`, updateError);
    }
  }
}

