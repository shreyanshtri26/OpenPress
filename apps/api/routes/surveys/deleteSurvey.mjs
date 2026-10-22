import { DeleteCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";
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

    await docClient.send(
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

    if (error.name === "ConditionCheckFailed") {
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