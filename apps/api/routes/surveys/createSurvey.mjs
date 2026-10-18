import { PutCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import { ensureTableName, normalizeSurvey, TABLE_NAME, validateSurvey } from "./shared.mjs";

export const handler = async (event) => {
  try {
    ensureTableName();

    const body = JSON.parse(event.body || "{}");
    const survey = normalizeSurvey(body);
    const validationError = validateSurvey(survey);

    if (validationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: validationError }),
      };
    }

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: survey,
        ConditionExpression: "attribute_not_exists(surveyId)",
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Survey created successfully", survey }),
    };
  } catch (error) {
    console.error("Create survey error:", error);

    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Survey already exists" }),
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