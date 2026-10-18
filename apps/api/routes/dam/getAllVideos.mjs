import { ScanCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";

const TABLE_NAME = process.env.DYNAMO_ASSETS_TABLE_NAME;

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};

    let scanInput = {
      TableName: TABLE_NAME,
      FilterExpression: "#isVideo = :true",
      ExpressionAttributeNames: {
        "#isVideo": "isVideo",
      },
      ExpressionAttributeValues: {
        ":true": true,
      },
    };

    // Optional pagination
    if (params.limit) {
      scanInput.Limit = parseInt(params.limit);
    }

    if (params.startKey) {
      try {
        scanInput.ExclusiveStartKey = JSON.parse(
          decodeURIComponent(params.startKey)
        );
      } catch (err) {
        console.warn("Invalid startKey:", err);
      }
    }

    const result = await dynamoClient.send(
      new ScanCommand(scanInput)
    );

    const videos = (result.Items || []).map(item => ({
        fileName: item.fileName || null,
        assetType: item.assetType || null,
        selectedThumbnail: item.videoMetadata?.selectedThumbnail || null,
        url: item.url || null,
        createdBy: item.createdBy || null,
        state: item.state || null,
        previewUrl: item.previewUrl || null,
        summary: item.summary || null,
      }));
      
      
    // Sort latest first
    videos.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );

    const response = {
      message: "Video assets fetched successfully",
      count: videos.length,
      data: videos,
    };

    if (result.LastEvaluatedKey) {
      response.pagination = {
        hasMore: true,
        nextKey: encodeURIComponent(
          JSON.stringify(result.LastEvaluatedKey)
        ),
      };
    } else {
      response.pagination = {
        hasMore: false,
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    };

  } catch (err) {
    console.error("Error fetching video assets:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Error fetching video assets",
        error: err.message,
      }),
    };
  }
};
