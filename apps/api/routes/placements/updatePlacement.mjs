import { UpdateCommand } from "../../db/commands.mjs";
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
    const body = JSON.parse(event.body || "{}");

    const {
      placementId,
      name,
      type,
      desktopDimensions,
      mobileDimensions,
      currency,
      price,
      fillPriority,
      status
    } = body;

    // ✅ Validate required field
    if (!placementId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "placementId is required",
        }),
      };
    }

    if (price === undefined || price === "" || price === null) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Price is required" }),
      };
    }

    let updateExpressions = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};

    const addField = (key, value) => {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
      expressionAttributeNames[`#${key}`] = key;
    };

    if (name) addField("name", name);
    if (type) addField("type", type);
    if (desktopDimensions) addField("desktopDimensions", desktopDimensions);
    if (mobileDimensions) addField("mobileDimensions", mobileDimensions);
    if (currency) {
      const normalizedCurrency = String(currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Currency must be a valid 3-letter ISO 4217 code" }),
        };
      }
      addField("currency", normalizedCurrency);
    }
    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Price must be a non-negative number" }),
      };
    }
    addField("price", normalizedPrice);
    if (fillPriority) addField("fillPriority", fillPriority);
    if (status) addField("status", status.charAt(0).toUpperCase() + status.slice(1).toLowerCase());

    // ✅ Always update timestamp
    addField("updatedAt", new Date().toISOString());

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "No fields provided to update",
        }),
      };
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { placementId },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ConditionExpression: "attribute_exists(placementId)",
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Placement updated successfully",
        placement: result.Attributes,
      }),
    };

  } catch (error) {
    console.error("Update placement error:", error);

    if (error.name === "ConditionCheckFailed") {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Placement not found",
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message
      })
    };
  }
};
