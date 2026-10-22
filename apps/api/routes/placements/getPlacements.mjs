import { ScanCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const TABLE_NAME = process.env.DOC_PLACEMENT_TABLE_NAME;

export const handler = async (event) => {
  if (!TABLE_NAME) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server configuration error: DOC_PLACEMENT_TABLE_NAME is not set",
      }),
    };
  }

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME
      })
    );

    const placements = result.Items || [];

    // Sort newest first
    placements.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        count: placements.length,
        placements
      })
    };

  } catch (error) {
    console.error("Get placements error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message
      })
    };
  }
};
