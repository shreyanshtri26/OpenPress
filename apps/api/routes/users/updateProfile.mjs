import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";

const TABLE_NAME = process.env.DYNAMO_AUDIENCE_TABLE_NAME || "op_audience";

export const handler = async (event) => {
  try {
    const {
      firstName,
      lastName,
      displayName,
    } = JSON.parse(event.body || "{}");

    // Get email from JWT (event.user is set by the index.mjs middleware)
    const email = event.user?.email;

    if (!email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized: Email not found in token" }),
      };
    }

    // Check if user exists in audience table
    const existingUser = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { email },
      })
    );

    if (!existingUser.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found in audience table" }),
      };
    }

    const updateFields = [];
    const expressionValues = {};
    const expressionNames = {};

    // Handle firstName
    if (firstName !== undefined) {
      updateFields.push("#firstName = :firstName");
      expressionValues[":firstName"] = firstName;
      expressionNames["#firstName"] = "firstName";
    }

    // Handle lastName
    if (lastName !== undefined) {
      updateFields.push("#lastName = :lastName");
      expressionValues[":lastName"] = lastName;
      expressionNames["#lastName"] = "lastName";
    }

    // Handle fullName (derived from firstName and lastName or displayName)
    let newFullName = displayName;
    if (!newFullName && (firstName || lastName)) {
      newFullName = `${firstName || ""} ${lastName || ""}`.trim();
    }

    if (newFullName) {
      updateFields.push("#fullName = :fullName");
      expressionValues[":fullName"] = newFullName;
      expressionNames["#fullName"] = "fullName";
    }

    if (updateFields.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No fields provided to update" }),
      };
    }

    // Always update updatedAt
    updateFields.push("#updatedAt = :updatedAt");
    expressionValues[":updatedAt"] = new Date().toISOString();
    expressionNames["#updatedAt"] = "updatedAt";

    // Build final UpdateExpression
    const updateExpression = `SET ${updateFields.join(", ")}`;

    await dynamoClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { email },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionValues,
        ExpressionAttributeNames: expressionNames,
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Profile updated successfully",
      }),
    };

  } catch (error) {
    console.error("Update profile error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: error.message }),
    };
  }
};
