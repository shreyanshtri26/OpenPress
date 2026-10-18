import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";
import { AUDIENCE_TABLE_NAME, toAudienceClientUser } from "./audienceProfileHelpers.mjs";

const ALLOWED_ROLES = new Set(["super user", "admin"]);

const normalizeRole = (role) => {
  if (!role) return "";
  return String(role).trim().toLowerCase();
};

const getFilterFromQuery = (event) => {
  const filter = event?.queryStringParameters?.donation;
  return (filter || "all").toString().trim().toLowerCase();
};

const isDonorRecord = (user) => {
  const normalized = toAudienceClientUser(user);
  return Boolean(normalized?.isDonor);
};

export const handler = async (event) => {
  try {
    const requesterRole = normalizeRole(event?.user?.role);
    if (!ALLOWED_ROLES.has(requesterRole)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden: only admin users can access audience users" }),
      };
    }

    const donationFilter = getFilterFromQuery(event);
    if (!["all", "donor", "non-donor"].includes(donationFilter)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid donation filter. Use all, donor, or non-donor" }),
      };
    }

    const allItems = [];
    let exclusiveStartKey;

    do {
      const result = await dynamoClient.send(
        new ScanCommand({
          TableName: AUDIENCE_TABLE_NAME,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      if (Array.isArray(result.Items) && result.Items.length > 0) {
        allItems.push(...result.Items);
      }

      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    const transformed = allItems.map((item) => {
      const normalized = toAudienceClientUser(item);
      return {
        email: normalized?.email || item.email || null,
        name: normalized?.name || "Unknown User",
        role: normalized?.role || "audience",
        provider: normalized?.provider || null,
        isDonor: Boolean(normalized?.isDonor),
        hasDonated: Boolean(normalized?.isDonor),
        donationStatus: normalized?.donationStatus || "none",
        donationCount: Number(normalized?.donationCount || 0),
        donationTotalAmount: Number(normalized?.donationTotalAmount || 0),
        donationCurrency: normalized?.donationCurrency || null,
        lastDonationAmount: Number(normalized?.lastDonationAmount || 0),
        lastDonationAt: normalized?.lastDonationAt || null,
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,
      };
    });

    const filteredUsers = transformed.filter((user) => {
      if (donationFilter === "all") return true;
      if (donationFilter === "donor") return user.isDonor;
      return !user.isDonor;
    });

    filteredUsers.sort((a, b) => {
      const aDate = Date.parse(a.lastDonationAt || a.updatedAt || a.createdAt || 0);
      const bDate = Date.parse(b.lastDonationAt || b.updatedAt || b.createdAt || 0);
      return bDate - aDate;
    });

    const donorCount = transformed.filter((user) => user.isDonor).length;
    const nonDonorCount = transformed.length - donorCount;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Audience users fetched successfully",
        filter: donationFilter,
        count: filteredUsers.length,
        totalUsers: transformed.length,
        donorCount,
        nonDonorCount,
        users: filteredUsers,
      }),
    };
  } catch (error) {
    console.error("Get audience users error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};