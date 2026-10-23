import { ScanCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const TABLE_NAME = process.env.DOC_CONTACT_US_TABLE || "op_contact_submissions";

export const handler = async (event) => {
  try {

    const command = new ScanCommand({
      TableName: TABLE_NAME,
    });

    const response = await docClient.send(command);

    // Sort by createdAt descending
    const items = response.Items || [];
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Successfully fetched submissions",
        data: items,
      }),
    };
  } catch (error) {
    console.error("❌ Error fetching contact submissions:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to fetch submissions",
        error: error.message,
      }),
    };
  }
};
