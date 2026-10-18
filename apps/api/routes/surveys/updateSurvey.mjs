import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import { ensureTableName, normalizeSurvey, TABLE_NAME, validateSurvey } from "./shared.mjs";

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

    const existingResult = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { surveyId },
      })
    );

    if (!existingResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Survey not found" }),
      };
    }

    const survey = normalizeSurvey(body, existingResult.Item);
    const hasResponses =
      (existingResult.Item.totalResponses || 0) > 0 ||
      (Array.isArray(existingResult.Item.responses) && existingResult.Item.responses.length > 0);
    if (hasResponses) {
      const existingQuestions = new Map(
        (existingResult.Item.questions || []).map((question) => [question.questionId, question])
      );
      const changedQuestionType = survey.questions.some((question) => {
        const existingQuestion = existingQuestions.get(question.questionId);
        return existingQuestion && existingQuestion.type !== question.type;
      });
      if (changedQuestionType) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "Question type cannot be changed after responses have been submitted",
          }),
        };
      }
    }

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
        ConditionExpression: "attribute_exists(surveyId)",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Survey updated successfully", survey }),
    };
  } catch (error) {
    console.error("Update survey error:", error);

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