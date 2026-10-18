import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import { ensureTableName, TABLE_NAME } from "./shared.mjs";

export const handler = async (event) => {
  try {
    ensureTableName();

    const body = JSON.parse(event.body || "{}");
    const { surveyId } = body;

    if (!surveyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "surveyId is required" }),
      };
    }

    await dynamoClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { surveyId },
        ConditionExpression: "attribute_exists(surveyId)",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Survey deleted successfully", surveyId }),
    };
  } catch (error) {
    console.error("Delete survey error:", error);

    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Survey not found" }),
      };
    }

    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.statusCode ? error.message : "Server error",
        error: error.statusCode ? undefined : error.message,
      }),
    };
  }
};