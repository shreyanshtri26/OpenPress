import apiFetch from '../../utils/api';
import env from '../../utils/env';
import type { Survey, SurveyAIResponseSummary, SurveyQuestion } from './SurveysManager';
import { generateSurveyPageHtml } from '../../helpers/generateSurveyPageHtml';

export interface SendSurveyInvitesResult {
  sent: number;
  failed: number;
}

export interface SurveyChatMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  assets?: SurveyChatAsset[];
}

export interface SurveyChatAsset {
  assetId: string;
  fileName: string;
  contentType: string;
  size: number;
  s3Bucket: string;
  s3Key: string;
  url: string;
}

/**
 * Sends survey invite emails via the backend SES wrapper.
 */
export async function sendSurveyInvites(
  params: {
    emails: string[];
    surveyUrl: string;
    surveyTitle: string;
    surveyId?: string;
    subject?: string;
    body?: string;
  },
  token: string | null
): Promise<SendSurveyInvitesResult> {
  const response = await apiFetch(`${env.backendApi}/surveys/invite`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(params),
  });
  const json = await parseResponse(response);
  return {
    sent: typeof json.sent === 'number' ? json.sent : params.emails.length,
    failed: typeof json.failed === 'number' ? json.failed : 0,
  };
}

function getHeaders(token: string | null) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || 'Survey request failed');
  }
  return json;
}

export function resolveSurveyStatus(survey: Survey): Survey {
  const now = new Date();

  // Scheduling disabled: surveys are created directly as draft/active/paused/closed, so an
  // active survey is never "scheduled" for a future start anymore. Kept commented for reference.
  // if (survey.status === 'active' && survey.startTime) {
  //   const start = new Date(survey.startTime);
  //   if (!Number.isNaN(start.getTime()) && start > now) {
  //     return { ...survey, status: 'scheduled' };
  //   }
  // }

  if (survey.status === 'active' && survey.endTime) {
    const end = new Date(survey.endTime);
    if (!Number.isNaN(end.getTime()) && end < now) {
      return { ...survey, status: 'closed' };
    }
  }

  return survey;
}

export async function fetchSurveys(token: string | null): Promise<Survey[]> {
  const response = await apiFetch(`${env.backendApi}/surveys`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  const json = await parseResponse(response);
  const list = Array.isArray(json.surveys) ? json.surveys : [];
  return list.map(resolveSurveyStatus);
}

export async function createSurveyRequest(survey: Survey, token: string | null): Promise<Survey> {
  const response = await apiFetch(`${env.backendApi}/surveys`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(survey),
  });
  const json = await parseResponse(response);
  return resolveSurveyStatus(json.survey);
}

export async function updateSurveyRequest(survey: Survey, token: string | null): Promise<Survey> {
  const response = await apiFetch(`${env.backendApi}/surveys`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(survey),
  });
  const json = await parseResponse(response);
  return resolveSurveyStatus(json.survey);
}

export async function deleteSurveyRequest(surveyId: string, token: string | null): Promise<void> {
  const response = await apiFetch(`${env.backendApi}/surveys`, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify({ surveyId }),
  });
  await parseResponse(response);
}

export async function fetchPublicSurvey(surveyId: string): Promise<Survey> {
  const response = await apiFetch(`${env.backendApi}/surveys/public/${surveyId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await parseResponse(response);
  return resolveSurveyStatus(json.survey);
}

export interface SurveyResponsePayload {
  respondentId?: string;
  answers: Record<string, string | string[] | number>;
  questionLabels?: Record<string, string>;
  optionLabels?: Record<string, string>;
  rowLabels?: Record<string, string>;
}

export interface SurveyResponseEntry {
  responseId: string;
  respondentId?: string;
  submittedAt?: string;
  answers: Record<string, string | string[] | number>;
  questionLabels?: Record<string, string>;
  optionLabels?: Record<string, string>;
  rowLabels?: Record<string, string>;
}

function normalizeSurveyResponseEntry(entry: any, index: number): SurveyResponseEntry {
  const answers =
    entry && typeof entry.answers === 'object' && !Array.isArray(entry.answers)
      ? entry.answers
      : {};

  return {
    responseId: String(
      entry?.responseId ?? entry?.id ?? entry?._id ?? `response_${index + 1}`
    ),
    respondentId: typeof entry?.respondentId === 'string' ? entry.respondentId : undefined,
    submittedAt:
      typeof entry?.submittedAt === 'string'
        ? entry.submittedAt
        : typeof entry?.createdAt === 'string'
        ? entry.createdAt
        : undefined,
    answers,
    questionLabels:
      entry?.questionLabels && typeof entry.questionLabels === 'object'
        ? entry.questionLabels
        : undefined,
    optionLabels:
      entry?.optionLabels && typeof entry.optionLabels === 'object'
        ? entry.optionLabels
        : undefined,
    rowLabels:
      entry?.rowLabels && typeof entry.rowLabels === 'object'
        ? entry.rowLabels
        : undefined,
  };
}

export async function submitSurveyResponse(
  surveyId: string,
  payload: SurveyResponsePayload
): Promise<void> {
  const response = await apiFetch(`${env.backendApi}/surveys/${surveyId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await parseResponse(response);
}

export async function fetchSurveyResponses(
  surveyId: string,
  token: string | null
): Promise<SurveyResponseEntry[]> {
  const response = await apiFetch(`${env.backendApi}/surveys/${surveyId}/responses`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  const json = await parseResponse(response);

  const rawResponses =
    (Array.isArray(json.responses) && json.responses) ||
    (Array.isArray(json.data?.responses) && json.data.responses) ||
    (Array.isArray(json.data) && json.data) ||
    [];

  return rawResponses.map((entry: unknown, index: number) =>
    normalizeSurveyResponseEntry(entry, index)
  );
}

export async function generateSurveyResponseSummary(
  surveyId: string,
  surveyTitle: string,
  questions: SurveyQuestion[],
  responses: SurveyResponseEntry[],
  token: string | null
): Promise<SurveyAIResponseSummary> {
  if (!env.aiApi) {
    throw new Error('AI API URL is not configured');
  }

  const questionTextById = new Map(questions.map((question) => [question.questionId, question.text]));
  const responseText = responses.map((response, responseIndex) => {
    const answers = Object.entries(response.answers)
      .filter(([, value]) => Array.isArray(value) ? value.length > 0 : String(value ?? '').trim())
      .map(([questionId, value]) => {
        const question = response.questionLabels?.[questionId] || questionTextById.get(questionId) || questionId;
        const answer = Array.isArray(value) ? value.join(', ') : String(value);
        return `Q: ${question}\nA: ${answer}`;
      });
    return `Response ${responseIndex + 1}\n${answers.join('\n')}`;
  }).join('\n\n');

  const aiResponse = await apiFetch(`${env.aiApi}/normal_stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: [
        `Summarize the anonymized responses to the survey titled "${surveyTitle}".`,
        'Provide a concise, neutral report of the main themes, notable agreements or disagreements, and actionable insights.',
        'Do not identify or infer individual respondents. Do not invent facts. Return plain text only.',
        'SURVEY RESPONSES:',
        responseText,
      ].join('\n\n'),
    }),
  });

  if (!aiResponse.ok) {
    throw new Error(`AI summary request failed (${aiResponse.status})`);
  }

  const summary = await readAiStream(aiResponse);
  if (!summary) {
    throw new Error('AI summary service returned an empty response');
  }

  const response = await apiFetch(`${env.backendApi}/surveys/${surveyId}/ai-summary`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ summary, responseCount: responses.length }),
  });
  const json = await parseResponse(response);
  if (!json.aiResponseSummary?.summary) {
    throw new Error('Survey summary was not returned');
  }
  return json.aiResponseSummary as SurveyAIResponseSummary;
}

export async function askSurveySummaryQuestion(
  surveyTitle: string,
  summary: string,
  question: string,
  onChunk: (chunk: string) => void,
  assets: SurveyChatAsset[] = [],
): Promise<void> {
  if (!env.aiApi) {
    throw new Error('AI API URL is not configured');
  }

  // Assets are already uploaded to S3 — send references so the AI route fetches and
  // extracts them server-side instead of re-transmitting raw file bytes here.
  const attachments = assets.map((asset) => ({
    s3Bucket: asset.s3Bucket,
    s3Key: asset.s3Key,
    fileName: asset.fileName,
    contentType: asset.contentType,
    size: asset.size,
  }));

  const response = await apiFetch(`${env.aiApi}/normal_stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: [
        `You are an assistant for the survey titled "${surveyTitle}".`,
        'For questions about this survey or its responses, use the stored AI survey summary as the source of truth. If the survey summary does not contain the requested information, say so and do not infer or invent survey details.',
        'For questions unrelated to this survey, answer helpfully using your general knowledge. Return plain text only.',
        'STORED AI SURVEY SUMMARY:',
        summary,
        ...(assets.length > 0 ? ['ATTACHED ASSETS:', ...assets.map((asset) => `${asset.fileName} (${asset.contentType})`)] : []),
        'QUESTION:',
        question,
      ].join('\n\n'),
      ...(attachments.length > 0 ? { attachments } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`AI chat request failed (${response.status})`);
  }

  if (!response.body) {
    const answer = await response.text();
    if (answer) onChunk(answer);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const content = chunk.split('\n').filter((line) => !line.startsWith('SESSION:')).join('\n');
    if (content) onChunk(content);
  }
}

export async function uploadSurveyChatAsset(
  surveyId: string,
  sessionId: string,
  file: File,
  token: string | null,
): Promise<SurveyChatAsset> {
  const response = await apiFetch(`${env.backendApi}/surveys/${encodeURIComponent(surveyId)}/chat/assets`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, sessionId }),
  });
  const json = await parseResponse(response);
  const asset = json.asset as SurveyChatAsset | undefined;
  if (!asset || !json.uploadUrl) throw new Error('Survey asset upload was not prepared');

  const uploadResponse = await fetch(json.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error(`Survey asset upload failed (${uploadResponse.status})`);
  return asset;
}

export async function deleteSurveyChatAsset(
  surveyId: string,
  s3Key: string,
  token: string | null,
): Promise<void> {
  const response = await apiFetch(`${env.backendApi}/surveys/${encodeURIComponent(surveyId)}/chat/assets`, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify({ s3Key }),
  });
  await parseResponse(response);
}

export async function fetchSurveyChatMessages(
  surveyId: string,
  sessionId: string,
  token: string | null
): Promise<SurveyChatMessage[]> {
  const response = await apiFetch(
    `${env.backendApi}/surveys/${encodeURIComponent(surveyId)}/chat?sessionId=${encodeURIComponent(sessionId)}`,
    { headers: getHeaders(token) },
  );
  const json = await parseResponse(response);
  return Array.isArray(json.messages) ? json.messages : [];
}

export async function saveSurveyChatMessage(
  surveyId: string,
  sessionId: string,
  message: SurveyChatMessage,
  token: string | null
): Promise<void> {
  const response = await apiFetch(`${env.backendApi}/surveys/${encodeURIComponent(surveyId)}/chat`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ sessionId, ...message }),
  });
  await parseResponse(response);
}

async function readAiStream(response: Response): Promise<string> {
  if (!response.body) return (await response.text()).trim();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let summary = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    summary += chunk.split('\n').filter((line) => !line.startsWith('SESSION:')).join('\n');
  }
  return summary.trim();
}

/**
 * Publishes a static HTML survey page to S3 via the dedicated endpoint.
 * Follows the same pattern as other page types:
 *   saveAuthorHtml → authors/{slug}/index.html
 *   saveSurveyHtml → surveys/{surveyId}.html  ← same pattern as articles
 *
 * URL: {FRONTEND_WEBSITE_URL}/surveys/{surveyId}/
 *      e.g. https://openpress.com/surveys/survey_abc123/
 */
export async function publishSurveyPage(survey: Survey, token: string | null): Promise<string> {
  const htmlContent = generateSurveyPageHtml(survey);
  const response = await apiFetch(`${env.backendApi}/pagestudio/saveSurveyHtml`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      htmlContent,
      surveyId: survey.surveyId,
    }),
  });
  const json = await parseResponse(response);
  return json?.url || json?.data?.url || '';
}