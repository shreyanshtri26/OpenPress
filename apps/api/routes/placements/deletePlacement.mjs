import { DeleteCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";

const TABLE_NAME = process.env.DYNAMO_PLACEMENT_TABLE_NAME;

export const handler = async (event) => {
  if (!TABLE_NAME) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server configuration error: DYNAMO_PLACEMENT_TABLE_NAME is not set",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { placementId } = body;

    // ✅ Validate
    if (!placementId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "placementId is required",
        }),
      };
    }

    // ✅ Delete with safety check
    await dynamoClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { placementId },
        ConditionExpression: "attribute_exists(placementId)",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Placement deleted successfully",
        placementId,
      }),
    };

  } catch (error) {
    console.error("Delete placement error:", error);

    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Placement not found",
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
