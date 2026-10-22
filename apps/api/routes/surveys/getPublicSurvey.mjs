// routes/surveys/getPublicSurvey.mjs
// Public endpoint — no JWT required.
// Fetches a single active survey by surveyId for the reader-facing form page.

import { GetCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";
import { ensureTableName, TABLE_NAME } from "./shared.mjs";

export const handler = async (event) => {
  try {
    ensureTableName();

    // Path: /surveys/public/{surveyId}
    // function Function URLs use event.rawPath (not event.path)
    const rawPath = event.rawPath || event.path || "";
    const surveyId = event.pathParameters?.surveyId ||
      rawPath.split("/").filter(Boolean).pop();

    if (!surveyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing surveyId" }),
      };
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { surveyId },
      })
    );

    const survey = result.Item;

    if (!survey) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Survey not found" }),
      };
    }

    if (survey.status !== "active") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: `Survey is ${survey.status} and not accepting responses`,
          status: survey.status,
        }),
      };
    }

    // Check if survey has not started yet
    if (survey.startTime && new Date(survey.startTime) > new Date()) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Survey has not started yet",
          status: "upcoming",
          startTime: survey.startTime,
        }),
      };
    }

    // Check if survey has expired
    if (survey.endTime && new Date(survey.endTime) < new Date()) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Survey has ended",
          status: "closed",
        }),
      };
    }

    // Return survey — omit internal/admin fields not needed by the form
    const { questionResults, aiResponseSummary, ...publicSurvey } = survey;

    return {
      statusCode: 200,
      body: JSON.stringify({ survey: publicSurvey }),
    };
  } catch (error) {
    console.error("Get public survey error:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.statusCode ? error.message : "Server error",
      }),
    };
  }
};
