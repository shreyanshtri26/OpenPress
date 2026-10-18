import { PutCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import crypto from "crypto";

const TABLE_NAME = process.env.DYNAMO_PLACEMENT_TABLE_NAME;

export const handler = async (event) => {
  if (!TABLE_NAME) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server configuration error: DYNAMO_PLACEMENT_TABLE_NAME is not set",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      name,
      type,
      desktopDimensions,
      mobileDimensions,
      currency,
      price,
      fillPriority,
      status
    } = body;

    // ✅ Validation
    if (!name || !type || !desktopDimensions || !mobileDimensions || !fillPriority || !status || !currency || price === undefined || price === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing required placement fields",
        }),
      };
    }

    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Price must be a non-negative number" }),
      };
    }

    const normalizedCurrency = String(currency).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Currency must be a valid 3-letter ISO 4217 code" }),
      };
    }

    const placementId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newPlacement = {
      placementId,
      name,
      type,
      desktopDimensions,
      mobileDimensions,
      fillPriority: fillPriority,
      status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(), // e.g. "Active"
      currency: normalizedCurrency,
      price: normalizedPrice,
      createdAt: now,
      updatedAt: now
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newPlacement
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Placement created successfully",
        placement: newPlacement
      })
    };

  } catch (error) {
    console.error("Add placement error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message
      })
    };
  }
};
