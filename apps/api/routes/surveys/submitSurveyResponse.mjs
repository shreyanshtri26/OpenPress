// routes/surveys/submitSurveyResponse.mjs
// Public endpoint — no JWT required.
// Stores a respondent's answers and increments totalResponses on the survey.

import { GetCommand, PutCommand, UpdateCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";
import { ensureTableName, TABLE_NAME } from "./shared.mjs";
import crypto from "crypto";

const RESPONSES_TABLE = process.env.DYNAMO_SURVEY_TABLE_NAME
  ? `${process.env.DYNAMO_SURVEY_TABLE_NAME}_responses`
  : undefined;

function hasMeaningfulAnswerValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => String(item ?? "").trim().length > 0);
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "boolean") {
    return true;
  }
  return String(value).trim().length > 0;
}

function hasMeaningfulAnswers(answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return false;
  return Object.values(answers).some((value) => hasMeaningfulAnswerValue(value));
}

function validateAnswer(answer, validation) {
  if (!validation || answer === undefined || answer === null) return null;

  const { type, subType, min, max, regex, errorMessage } = validation;

  if (type === "selection_count" || type === "selection") {
    let count = 0;
    if (Array.isArray(answer)) {
      count = answer.filter((item) => item !== undefined && item !== null && String(item).trim().length > 0).length;
    } else if (typeof answer === "string" && answer.trim().length > 0) {
      count = 1;
    } else if (answer) {
      count = 1;
    }

    if (subType === "min_select" || subType === "at_least") {
      if (min !== undefined && count < min) return errorMessage || `Select at least ${min} option${min === 1 ? "" : "s"}`;
    } else if (subType === "max_select" || subType === "at_most") {
      if (max !== undefined && count > max) return errorMessage || `Select at most ${max} option${max === 1 ? "" : "s"}`;
    } else if (subType === "exact_select" || subType === "exact") {
      const target = min !== undefined ? min : max;
      if (target !== undefined && count !== target) return errorMessage || `Select exactly ${target} option${target === 1 ? "" : "s"}`;
    } else if (subType === "between") {
      if (min !== undefined && count < min) return errorMessage || `Select between ${min} and ${max ?? ""} options`;
      if (max !== undefined && count > max) return errorMessage || `Select between ${min ?? ""} and ${max} options`;
    } else {
      if (min !== undefined && count < min) return errorMessage || `Select at least ${min} option${min === 1 ? "" : "s"}`;
      if (max !== undefined && count > max) return errorMessage || `Select at most ${max} option${max === 1 ? "" : "s"}`;
    }
    return null;
  }

  const valStr = String(answer).trim();
  if (valStr.length === 0) return null; // Let 'required' flag handle emptiness

  if (type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(valStr)) return errorMessage || "Invalid email format";
  } else if (type === "phone") {
    const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
    if (!phoneRegex.test(valStr)) return errorMessage || "Invalid phone format";
  } else if (type === "number") {
    const num = Number(valStr);
    if (Number.isNaN(num) || !Number.isFinite(num)) return errorMessage || "Must be a valid number";
    if (subType === "greater_than" && min !== undefined && num < min) {
      return errorMessage || ("Must be greater than or equal to " + min);
    }
    if (subType === "less_than" && max !== undefined && num > max) {
      return errorMessage || ("Must be less than or equal to " + max);
    }
    if (subType === "between") {
      if (min !== undefined && num < min) return errorMessage || ("Must be between " + min + " and " + (max !== undefined ? max : ""));
      if (max !== undefined && num > max) return errorMessage || ("Must be between " + (min !== undefined ? min : "") + " and " + max);
    }
    if (min !== undefined && subType !== "greater_than" && subType !== "between" && num < min) {
      return errorMessage || ("Must be at least " + min);
    }
    if (max !== undefined && subType !== "less_than" && subType !== "between" && num > max) {
      return errorMessage || ("Must be at most " + max);
    }
  } else if (type === "length") {
    if ((subType === "min_length" || subType === undefined) && min !== undefined && valStr.length < min) {
      return errorMessage || ("Minimum length is " + min);
    }
    if ((subType === "max_length" || subType === undefined) && max !== undefined && valStr.length > max) {
      return errorMessage || ("Maximum length is " + max);
    }
  } else if (type === "regex" && regex) {
    try {
      if (subType === "contains") {
        if (!valStr.includes(regex)) return errorMessage || ("Must contain \"" + regex + "\"");
      } else if (subType === "not_contains") {
        if (valStr.includes(regex)) return errorMessage || ("Must not contain \"" + regex + "\"");
      } else {
        const re = new RegExp(regex);
        if (!re.test(valStr)) return errorMessage || "Invalid format";
      }
    } catch (e) {
      // Skip if regex is invalid
    }
  }
  return null;
}

export const handler = async (event) => {
  try {
    ensureTableName();

    // Path: /surveys/{surveyId}/responses
    // Lambda Function URLs use event.rawPath (not event.path)
    const rawPath = event.rawPath || event.path || "";
    const pathParts = rawPath.split("/").filter(Boolean);
    // pathParts = ["surveys", "{surveyId}", "responses"]
    const surveyId = pathParts[1];

    if (!surveyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing surveyId" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { answers, respondentId } = body;

    if (!answers || typeof answers !== "object") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing or invalid answers" }),
      };
    }

    // Reject completely blank submissions so they are not counted or displayed.
    if (!hasMeaningfulAnswers(answers)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Please answer at least one question" }),
      };
    }

    // 1. Fetch survey to validate it's still active
    const surveyResult = await dynamoClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { surveyId } })
    );

    const survey = surveyResult.Item;
    if (!survey) {
      return { statusCode: 404, body: JSON.stringify({ message: "Survey not found" }) };
    }
    if (survey.status !== "active") {
      return { statusCode: 403, body: JSON.stringify({ message: "Survey is not accepting responses" }) };
    }
    if (survey.startTime && new Date(survey.startTime) > new Date()) {
      return { statusCode: 403, body: JSON.stringify({ message: "Survey has not started yet" }) };
    }
    if (survey.endTime && new Date(survey.endTime) < new Date()) {
      return { statusCode: 403, body: JSON.stringify({ message: "Survey has ended" }) };
    }
    if (survey.maxResponses && survey.totalResponses >= survey.maxResponses) {
      return { statusCode: 403, body: JSON.stringify({ message: "Survey response limit reached" }) };
    }

    if (Array.isArray(survey.questions)) {
      for (const question of survey.questions) {
        if (question.validation && answers[question.questionId]) {
          const ans = answers[question.questionId];
          let error = null;
          if (question.validation.type === "selection_count" || question.validation.type === "selection") {
            error = validateAnswer(ans, question.validation);
          } else if (Array.isArray(ans)) {
            for (const singleAns of ans) {
              error = validateAnswer(singleAns, question.validation);
              if (error) break;
            }
          } else {
            error = validateAnswer(ans, question.validation);
          }

          if (error) {
            return {
              statusCode: 400,
              body: JSON.stringify({ message: error })
            };
          }
        }
      }
    }

    const questionLabels = {};
    const optionLabels = {};
    const rowLabels = {};

    const allQuestions = Array.isArray(survey.questions) ? survey.questions : [];

    for (const q of allQuestions) {
      if (q.questionId && q.text) {
        questionLabels[q.questionId] = q.text;
      }
      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          if (opt.id && opt.label) optionLabels[opt.id] = opt.label;
        }
      }
      if (Array.isArray(q.historicalOptions)) {
        for (const opt of q.historicalOptions) {
          if (opt.id && opt.label) optionLabels[opt.id] = opt.label;
        }
      }
      if (Array.isArray(q.rows)) {
        for (const row of q.rows) {
          if (row.id && row.label) rowLabels[row.id] = row.label;
        }
      }
      if (Array.isArray(q.historicalRows)) {
        for (const row of q.historicalRows) {
          if (row.id && row.label) rowLabels[row.id] = row.label;
        }
      }
    }

    if (body.optionLabels && typeof body.optionLabels === "object") {
      Object.assign(optionLabels, body.optionLabels);
    }
    if (body.questionLabels && typeof body.questionLabels === "object") {
      Object.assign(questionLabels, body.questionLabels);
    }
    if (body.rowLabels && typeof body.rowLabels === "object") {
      Object.assign(rowLabels, body.rowLabels);
    }

    const responseId = `resp_${crypto.randomUUID()}`;
    const submittedAt = new Date().toISOString();
    const responsePayload = {
      responseId,
      surveyId,
      respondentId: respondentId || "anonymous",
      answers,
      submittedAt,
      questionLabels,
      optionLabels,
      rowLabels,
    };

    // 2. Save response — store in same survey table as a nested item OR
    //    a separate responses table if it exists.
    //    Here we save to the survey table itself under a composite key pattern,
    //    or fall back to updating the survey's questionResults aggregate.
    try {
      if (RESPONSES_TABLE) {
        await dynamoClient.send(
          new PutCommand({
            TableName: RESPONSES_TABLE,
            Item: responsePayload,
          })
        );
      }
    } catch {
      // Responses table may not exist — non-fatal, continue to increment counter
      console.warn("Could not save to responses table (may not exist), incrementing counter only");
    }

    // 3. Increment totalResponses and always append to survey.responses.
    //    This guarantees responses remain visible even if the responses table
    //    is unavailable or partially populated in some environments.
    const updateExpressionParts = [
      "totalResponses = if_not_exists(totalResponses, :zero) + :one",
      "updatedAt = :now",
      "responses = list_append(if_not_exists(responses, :emptyResponses), :newResponses)",
    ];
    const expressionAttributeValues = {
      ":zero": 0,
      ":one": 1,
      ":now": submittedAt,
      ":emptyResponses": [],
      ":newResponses": [responsePayload],
    };

    await dynamoClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { surveyId },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Response submitted successfully",
        responseId,
      }),
    };
  } catch (error) {
    console.error("Submit survey response error:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.statusCode ? error.message : "Server error",
      }),
    };
  }
};
