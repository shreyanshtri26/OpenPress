// routes/dam/transcodingTriggerAsync.mjs - Enhanced with better logging
import { UpdateCommand, GetCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const TABLE_NAME = process.env.DOC_ASSETS_TABLE_NAME;

export const handler = async (event) => {
  const startTime = Date.now();

  try {
    const body = JSON.parse(event.body);
    const { assetId, userId, qualities } = body;


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
    const result = await docClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Asset not found" })
      };
    }

    if (!asset.isVideo) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Asset is not a video file" })
      };
    }


    const requestedQualities = qualities || ["360p", "480p", "720p", "1080p"];
    
    // Update status to "processing" immediately
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

    await docClient.send(updateCommand);

    // Start background processing (DON'T WAIT FOR IT)
    processTranscodingInBackground(assetId, userId, requestedQualities)
      .catch(error => {
        console.error(`❌ [${assetId}] Background transcoding failed:`, error);
      });

    const elapsed = Date.now() - startTime;

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
    
    // Import background processing module
    const { processVideoTranscoding } = await import('./backgroundProcessing.mjs');
    await processVideoTranscoding(assetId, userId, requestedQualities);
    
  } catch (error) {
    console.error(`❌ [${assetId}] Background transcoding failed:`, error);
    console.error(`📊 [${assetId}] Error stack:`, error.stack);
    
    // Update status to failed
    try {
      await docClient.send(new UpdateCommand({
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
      
    } catch (updateError) {
      console.error(`❌ [${assetId}] Failed to update error status:`, updateError);
    }
  }
}

