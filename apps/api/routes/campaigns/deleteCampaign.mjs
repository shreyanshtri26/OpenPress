import { DeleteCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const TABLE_NAME = process.env.DOC_CAMPAIGN_TABLE_NAME;

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { campaignId } = body;

    // Validate
    if (!campaignId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "campaignId is required",
        }),
      };
    }

    // Delete with safety check
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { campaignId },
        ConditionExpression: "attribute_exists(campaignId)",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Campaign deleted successfully",
        campaignId,
      }),
    };

  } catch (error) {
    console.error("Delete campaign error:", error);

    if (error.name === "ConditionCheckFailed") {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Campaign not found",
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};