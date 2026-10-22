import { UpdateCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";
import { ensureTableName, TABLE_NAME } from "./shared.mjs";

function getSurveyId(event) {
  const rawPath = event.rawPath || event.path || "";
  return rawPath.split("/").filter(Boolean)[1];
}

export const handler = async (event) => {
  try {
    ensureTableName();
    const surveyId = getSurveyId(event);
    if (!surveyId) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing surveyId" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const responseCount = Number(body.responseCount);
    if (!summary) {
      return { statusCode: 400, body: JSON.stringify({ message: "Summary is required" }) };
    }
    if (summary.length > 20000) {
      return { statusCode: 400, body: JSON.stringify({ message: "Summary is too long" }) };
    }
    if (!Number.isInteger(responseCount) || responseCount < 1) {
      return { statusCode: 400, body: JSON.stringify({ message: "A valid response count is required" }) };
    }

    const aiResponseSummary = {
      summary,
      generatedAt: new Date().toISOString(),
      responseCount,
    };
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { surveyId },
      UpdateExpression: "SET aiResponseSummary = :aiResponseSummary, updatedAt = :updatedAt",
      ExpressionAttributeValues: { ":aiResponseSummary": aiResponseSummary, ":updatedAt": aiResponseSummary.generatedAt },
      ConditionExpression: "attribute_exists(surveyId)",
    }));

    return { statusCode: 200, body: JSON.stringify({ aiResponseSummary }) };
  } catch (error) {
    console.error("Generate survey response summary error:", error);
    return {
      statusCode: error.name === "ConditionCheckFailed" ? 404 : 500,
      body: JSON.stringify({ message: error.name === "ConditionCheckFailed" ? "Survey not found" : "Failed to generate survey response summary" }),
    };
  }
};