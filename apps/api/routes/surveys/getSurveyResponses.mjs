// routes/surveys/getSurveyResponses.mjs
// Admin endpoint — JWT required.
// Fetches all submissions for a survey from the responses table.

import { ScanCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";
import { GetCommand } from "../../db/commands.mjs";
import { TABLE_NAME } from "./shared.mjs";

const RESPONSES_TABLE = process.env.DYNAMO_SURVEY_TABLE_NAME
  ? `${process.env.DYNAMO_SURVEY_TABLE_NAME}_responses`
  : undefined;

export const handler = async (event) => {
  try {
    const rawPath = event.rawPath || event.path || "";
    const pathParts = rawPath.split("/").filter(Boolean);
    const surveyId = pathParts[1];

    if (!surveyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing surveyId" }),
      };
    }

    const getEmbeddedResponses = async () => {
      if (!TABLE_NAME) return [];
      try {
        const surveyResult = await dynamoClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { surveyId },
          })
        );

        const embedded = surveyResult?.Item?.responses;
        return Array.isArray(embedded) ? embedded : [];
      } catch (embeddedError) {
        console.warn("Failed to read embedded survey responses:", embeddedError);
        return [];
      }
    };

    const embeddedResponses = await getEmbeddedResponses();
    let tableResponses = [];

    if (RESPONSES_TABLE) {
      try {
        const result = await dynamoClient.send(
          new ScanCommand({
            TableName: RESPONSES_TABLE,
            FilterExpression: "surveyId = :surveyId",
            ExpressionAttributeValues: {
              ":surveyId": surveyId,
            },
          })
        );

        tableResponses = Array.isArray(result.Items) ? result.Items : [];
      } catch (scanError) {
        // Common case in legacy envs: *_responses table not created yet.
        // Do not fail the request; continue with embedded survey responses.
        console.warn("Failed to scan responses table, continuing with embedded responses:", scanError);
        tableResponses = [];
      }
    }

    // Merge table + embedded responses and dedupe.
    // Prefer table record when responseId collides.
    const mergedById = new Map();
    const toKey = (item, index) =>
      item?.responseId ||
      `${item?.submittedAt || "na"}_${item?.respondentId || "anon"}_${index}`;

    embeddedResponses.forEach((item, index) => {
      mergedById.set(toKey(item, index), item);
    });
    tableResponses.forEach((item, index) => {
      mergedById.set(toKey(item, index), item);
    });

    const responses = Array.from(mergedById.values());

    responses.sort((a, b) => {
      const aTime = a?.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b?.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        count: responses.length,
        responses,
      }),
    };
  } catch (error) {
    console.error("Get survey responses error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error" }),
    };
  }
};
