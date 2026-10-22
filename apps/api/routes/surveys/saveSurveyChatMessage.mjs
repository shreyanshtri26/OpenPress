import { PutCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const CHAT_TABLE = process.env.DOC_SURVEY_CHAT_TABLE_NAME;

function getPathParts(event) {
  return (event.rawPath || event.path || "").split("/").filter(Boolean);
}

export const handler = async (event) => {
  try {
    if (!CHAT_TABLE) {
      return { statusCode: 500, body: JSON.stringify({ message: "Survey chat table is not configured" }) };
    }

    const pathParts = getPathParts(event);
    const surveyId = pathParts[1];
    const body = JSON.parse(event.body || "{}");
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const role = body.role === "user" || body.role === "assistant" ? body.role : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
    const assets = Array.isArray(body.assets) ? body.assets.slice(0, 5) : [];
    const createdAt = typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString();

    if (!surveyId || !sessionId || !role || !content || !messageId) {
      return { statusCode: 400, body: JSON.stringify({ message: "surveyId, sessionId, messageId, role, and content are required" }) };
    }
    if (sessionId.length > 200 || messageId.length > 200 || content.length > 20000) {
      return { statusCode: 400, body: JSON.stringify({ message: "Survey chat message is too long" }) };
    }
    if (Number.isNaN(new Date(createdAt).getTime())) {
      return { statusCode: 400, body: JSON.stringify({ message: "createdAt must be a valid date" }) };
    }

    const item = {
      chatKey: `${surveyId}#${sessionId}`,
      createdAt: `${createdAt}#${messageId}`,
      surveyId,
      sessionId,
      messageId,
      role,
      content,
      assets,
      userId: event.user?.userId || event.user?.sub || undefined,
    };

    await docClient.send(new PutCommand({ TableName: CHAT_TABLE, Item: item }));
    return { statusCode: 201, body: JSON.stringify({ message: item }) };
  } catch (error) {
    console.error("Save survey chat message error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Failed to save survey chat message" }) };
  }
};
