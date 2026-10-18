import crypto from "crypto";

export const TABLE_NAME = process.env.DYNAMO_SURVEY_TABLE_NAME;

const ALLOWED_STATUSES = new Set(["draft", "active", "paused", "closed"]);
const ALLOWED_TARGET_TYPES = new Set(["global", "category", "article"]);
const ALLOWED_QUESTION_TYPES = new Set([
  "single_choice",
  "multiple_choice",
  "rating_scale",
  "short_text",
  "paragraph",
  "dropdown",
  "multiple_choice_grid",
  "checkbox_grid",
]);

export function ensureTableName() {
  if (!TABLE_NAME) {
    const error = new Error("DYNAMO_SURVEY_TABLE_NAME is not configured");
    error.statusCode = 500;
    throw error;
  }
}

export function normalizeSurvey(input = {}, existing = {}) {
  const createdAt = existing.createdAt || input.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const surveyId = existing.surveyId || input.surveyId || `survey_${crypto.randomUUID()}`;
  const status = String(input.status || existing.status || "draft").toLowerCase();
  const targetType = String(input.targetType || existing.targetType || "global").toLowerCase();
  const finalStatus = ALLOWED_STATUSES.has(status) ? status : "draft";
  let endTime = input.endTime ?? existing.endTime ?? "";
  if (finalStatus === "closed") {
    endTime = existing.status === "closed" && existing.endTime ? existing.endTime : updatedAt;
  } else if (existing.status === "closed") {
    endTime = "";
  }

  // Merge responses: never delete or overwrite existing responses!
  const existingResponses = Array.isArray(existing.responses) ? existing.responses : [];
  const inputResponses = Array.isArray(input.responses) ? input.responses : [];
  const responseMap = new Map();
  const getResponseKey = (r, idx) => r?.responseId || r?.id || `resp_${idx}`;

  existingResponses.forEach((r, idx) => {
    responseMap.set(getResponseKey(r, idx), r);
  });
  inputResponses.forEach((r, idx) => {
    const key = getResponseKey(r, idx);
    if (!responseMap.has(key)) {
      responseMap.set(key, r);
    }
  });
  const responses = Array.from(responseMap.values());

  const existingTotalResponses = normalizeNumber(existing.totalResponses, 0);
  const parsedTotalResponses = normalizeNumber(
    input.totalResponses !== undefined ? input.totalResponses : existing.totalResponses,
    existingTotalResponses
  );
  const totalResponses = Math.max(parsedTotalResponses, existingTotalResponses, responses.length);

  const existingQuestions = Array.isArray(existing.questions)
    ? existing.questions.map((q, idx) => normalizeQuestion(q, idx))
    : [];
  const incomingQuestions = Array.isArray(input.questions)
    ? input.questions.map((q, idx) => normalizeQuestion(q, idx))
    : [];

  // Deleted questions are discarded outright (not archived) — seed historicalMap only from each
  // active question's own prior version, to preserve option/row labels for still-active questions.
  const historicalMap = new Map();
  existingQuestions.forEach((q) => {
    if (q && q.questionId) {
      historicalMap.set(q.questionId, normalizeQuestion(q));
    }
  });

  const activeQuestions = incomingQuestions.length > 0
    ? incomingQuestions
    : existingQuestions;

  // Enrich each active question with combined historical options/rows
  const questions = activeQuestions.map((q, idx) => {
    const historicalQ = historicalMap.get(q.questionId);
    const combinedOptionsMap = new Map();
    (historicalQ?.historicalOptions || []).forEach((opt) => combinedOptionsMap.set(opt.id, opt));
    (historicalQ?.options || []).forEach((opt) => combinedOptionsMap.set(opt.id, opt));
    (q.options || []).forEach((opt) => combinedOptionsMap.set(opt.id, opt));

    const combinedRowsMap = new Map();
    (historicalQ?.historicalRows || []).forEach((r) => combinedRowsMap.set(r.id, r));
    (historicalQ?.rows || []).forEach((r) => combinedRowsMap.set(r.id, r));
    (q.rows || []).forEach((r) => combinedRowsMap.set(r.id, r));

    const enriched = {
      ...q,
      order: Number.isFinite(q.order) ? q.order : idx + 1,
      historicalOptions: Array.from(combinedOptionsMap.values()),
      historicalRows: Array.from(combinedRowsMap.values()),
    };
    historicalMap.set(q.questionId, enriched);
    return enriched;
  });

  const hasExplicitQuestionResults = Object.prototype.hasOwnProperty.call(input, "questionResults");
  const questionResults =
    hasExplicitQuestionResults
      ? normalizeQuestionResults(input.questionResults)
      : normalizeQuestionResults(existing.questionResults);

  const existingInvitedEmails = Array.isArray(existing.invitedEmails) ? existing.invitedEmails : [];
  const inputInvitedEmails = Array.isArray(input.invitedEmails) ? input.invitedEmails : [];
  const invitedEmails = [
    ...new Set(
      [...existingInvitedEmails, ...inputInvitedEmails].map((e) => String(e || "").trim().toLowerCase())
    ),
  ].filter(Boolean);

  return {
    surveyId,
    title: String(input.title ?? existing.title ?? "").trim(),
    description: String(input.description ?? existing.description ?? "").trim(),
    status: ALLOWED_STATUSES.has(status) ? status : "draft",
    targetType: ALLOWED_TARGET_TYPES.has(targetType) ? targetType : "global",
    targetValues: normalizeStringArray(
      input.targetValues !== undefined ? input.targetValues : existing.targetValues
    ),
    startTime: input.startTime ?? existing.startTime ?? "",
    endTime,
    // use hasOwnProperty, not ??, so an explicit null (user cleared the field) isn't masked by the existing value
    maxResponses: normalizeNullableNumber(
      Object.prototype.hasOwnProperty.call(input, "maxResponses") ? input.maxResponses : existing.maxResponses
    ),
    collectEmails: Boolean(input.collectEmails ?? existing.collectEmails ?? false),
    createdAt,
    updatedAt,
    questions,
    totalResponses,
    completionRate:
      input.completionRate !== undefined || existing.completionRate !== undefined
        ? normalizeNullableNumber(
            input.completionRate !== undefined ? input.completionRate : existing.completionRate
          )
        : null,
    responses,
    invitedEmails,
    questionResults,
    aiResponseSummary: existing.aiResponseSummary,
  };
}

export function validateSurvey(survey) {
  if (!survey.title) return "Survey title is required";
  if (!survey.startTime) return "Start time is required";
  // End time is no longer collected — surveys are paused/closed manually instead of scheduled.

  const start = new Date(survey.startTime);
  if (Number.isNaN(start.getTime())) {
    return "Start time must be a valid date";
  }
  if (survey.targetType !== "global" && survey.targetValues.length === 0) {
    return "Target values are required for category or article surveys";
  }
  if (
    survey.maxResponses !== null &&
    (!Number.isInteger(survey.maxResponses) || survey.maxResponses < 1)
  ) {
    return "Max responses must be a positive whole number";
  }

  return null;
}

function normalizeQuestion(question = {}, index = 0) {
  const type = String(question.type || "single_choice").toLowerCase();
  const normalizedType = ALLOWED_QUESTION_TYPES.has(type) ? type : "single_choice";
  const options = Array.isArray(question.options)
    ? question.options
        .map((option) => ({
          id: String(option?.id || crypto.randomUUID()),
          label: String(option?.label || "").trim(),
        }))
        .filter((option) => option.label)
    : undefined;
  const historicalOptions = Array.isArray(question.historicalOptions)
    ? question.historicalOptions
        .map((option) => ({
          id: String(option?.id || crypto.randomUUID()),
          label: String(option?.label || "").trim(),
        }))
        .filter((option) => option.label)
    : undefined;
  const rows = Array.isArray(question.rows)
    ? question.rows
        .map((row) => ({
          id: String(row?.id || crypto.randomUUID()),
          label: String(row?.label || "").trim(),
        }))
        .filter((row) => row.label)
    : undefined;
  const historicalRows = Array.isArray(question.historicalRows)
    ? question.historicalRows
        .map((row) => ({
          id: String(row?.id || crypto.randomUUID()),
          label: String(row?.label || "").trim(),
        }))
        .filter((row) => row.label)
    : undefined;

  const normalizedQuestion = {
    questionId: String(question.questionId || `q_${crypto.randomUUID()}`),
    order: Number(question.order) || index + 1,
    type: normalizedType,
    text: String(question.text || "").trim(),
    description: String(question.description || "").trim(),
    required: Boolean(question.required),
    ...(options && options.length > 0 ? { options } : {}),
    ...(historicalOptions && historicalOptions.length > 0 ? { historicalOptions } : {}),
    ...(rows && rows.length > 0 ? { rows } : {}),
    ...(historicalRows && historicalRows.length > 0 ? { historicalRows } : {}),
  };

  if (question.validation && typeof question.validation === 'object') {
    const v = question.validation;
    const validation = {
      type: String(v.type || "").trim(),
      errorMessage: String(v.errorMessage || "").trim(),
    };
    if (v.subType !== undefined && v.subType !== "") validation.subType = String(v.subType).trim();
    if (v.regex !== undefined) validation.regex = String(v.regex);
    if (v.min !== undefined && v.min !== "" && !Number.isNaN(Number(v.min))) validation.min = Number(v.min);
    if (v.max !== undefined && v.max !== "" && !Number.isNaN(Number(v.max))) validation.max = Number(v.max);
    
    normalizedQuestion.validation = validation;
  }

  return normalizedQuestion;
}

function normalizeQuestionResults(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([questionId, result]) => {
      const safeResult = result && typeof result === "object" ? result : {};
      const choiceResults = Array.isArray(safeResult.choiceResults)
        ? safeResult.choiceResults.map((item) => ({
            label: String(item?.label || "").trim(),
            count: normalizeNumber(item?.count, 0),
            percentage: normalizeNumber(item?.percentage, 0),
          }))
        : undefined;

      const ratingResults = safeResult.ratingResults && typeof safeResult.ratingResults === "object"
        ? {
            avg: normalizeNumber(safeResult.ratingResults.avg, 0),
            distribution: Array.isArray(safeResult.ratingResults.distribution)
              ? safeResult.ratingResults.distribution.map((item) => ({
                  score: normalizeNumber(item?.score, 0),
                  count: normalizeNumber(item?.count, 0),
                }))
              : [],
          }
        : undefined;

      const textResponses = Array.isArray(safeResult.textResponses)
        ? safeResult.textResponses.map((item) => String(item || "").trim()).filter(Boolean)
        : undefined;

      const gridResults = Array.isArray(safeResult.gridResults)
        ? safeResult.gridResults.map((item) => {
            const safeItem = item && typeof item === "object" ? item : {};
            const rowChoiceResults = Array.isArray(safeItem.choiceResults)
              ? safeItem.choiceResults.map((choice) => ({
                  label: String(choice?.label || "").trim(),
                  count: normalizeNumber(choice?.count, 0),
                  percentage: normalizeNumber(choice?.percentage, 0),
                }))
              : [];
            return {
              rowId: String(safeItem.rowId || ""),
              rowLabel: String(safeItem.rowLabel || "").trim(),
              choiceResults: rowChoiceResults,
            };
          }).filter(row => row.rowId)
        : undefined;

      return [
        questionId,
        {
          ...(choiceResults ? { choiceResults } : {}),
          ...(ratingResults ? { ratingResults } : {}),
          ...(textResponses ? { textResponses } : {}),
          ...(gridResults ? { gridResults } : {}),
          answerCount: normalizeNumber(safeResult.answerCount, 0),
        },
      ];
    })
  );
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeNumber(value, fallback) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}