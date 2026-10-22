import { DeleteCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const TABLE_NAME = process.env.DOC_AUDIENCE_TABLE_NAME || "op_audience";

export const handler = async (event) => {
  try {
    const email = event.user?.email;

    if (!email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized: Email not found in token" }),
      };
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { email },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Account deleted successfully" }),
    };
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message }),
    };
  }
};
