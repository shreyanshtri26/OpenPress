import { QueryCommand } from "../../db/commands.mjs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dynamoClient from "../../dynamoClient.mjs";
import { createS3Client } from '../../lib/storage.mjs';

const CHAT_TABLE = process.env.DYNAMO_SURVEY_CHAT_TABLE_NAME;
const s3 = createS3Client({ region: process.env.AWS_OpenPress_REGION });

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
    const sessionId = event.queryStringParameters?.sessionId;
    if (!surveyId || !sessionId) {
      return { statusCode: 400, body: JSON.stringify({ message: "surveyId and sessionId are required" }) };
    }

    const result = await dynamoClient.send(new QueryCommand({
      TableName: CHAT_TABLE,
      KeyConditionExpression: "chatKey = :chatKey",
      ExpressionAttributeValues: { ":chatKey": `${surveyId}#${sessionId}` },
      ScanIndexForward: true,
      Limit: 100,
    }));

    const messages = await Promise.all((result.Items || []).map(async (message) => ({
      ...message,
      assets: await Promise.all((message.assets || []).map(async (asset) => {
        if (!asset.s3Bucket || !asset.s3Key) return asset;
        try {
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: asset.s3Bucket, Key: asset.s3Key }),
            { expiresIn: 900 },
          );
          return { ...asset, url };
        } catch (error) {
          console.warn("Failed to create survey chat asset URL:", error);
          return asset;
        }
      })),
    })));

    return {
      statusCode: 200,
      body: JSON.stringify({ messages }),
    };
  } catch (error) {
    console.error("Get survey chat messages error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Failed to load survey chat history" }) };
  }
};
