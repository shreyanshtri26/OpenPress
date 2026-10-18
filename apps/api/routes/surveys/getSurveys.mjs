import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import { ensureTableName, TABLE_NAME } from "./shared.mjs";

export const handler = async () => {
  try {
    ensureTableName();

    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    const surveys = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ count: surveys.length, surveys }),
    };
  } catch (error) {
    console.error("Get surveys error:", error);

    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.statusCode ? error.message : "Server error",
        error: error.statusCode ? undefined : error.message,
      }),
    };
  }
};