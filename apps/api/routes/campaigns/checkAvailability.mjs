import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";

const TABLE_NAME = process.env.DYNAMO_CAMPAIGN_TABLE_NAME;

const IGNORE_STATUSES = new Set(["cancelled", "canceled", "archived", "deleted"]);

const normalizePlacement = (value) => String(value || "").trim().toLowerCase();

const toIsoDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
};

const hasOverlap = (requestedStart, requestedEnd, candidateStart, candidateEnd) => {
  if (!requestedStart || !requestedEnd || !candidateStart || !candidateEnd) return false;
  return candidateStart <= requestedEnd && requestedStart <= candidateEnd;
};

const formatRange = (startIso, endIso) => {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();

  const startText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" }
  );

  return `${startText}-${endText}`;
};

const campaignHasPlacement = (campaign, requestedPlacement) => {
  const placements = Array.isArray(campaign.placements) ? campaign.placements : [];
  return placements.some((placement) => normalizePlacement(placement) === requestedPlacement);
};

export const handler = async (event) => {
  if (!TABLE_NAME) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server configuration error: DYNAMO_CAMPAIGN_TABLE_NAME is not set",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const placement = normalizePlacement(body.placement);
    const requestedStart = toIsoDate(body.startDate || body.startTime);
    const requestedEnd = toIsoDate(body.endDate || body.endTime);

    if (!placement || !requestedStart || !requestedEnd) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "placement, startDate, and endDate are required",
        }),
      };
    }

    if (requestedStart > requestedEnd) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "startDate must be before or equal to endDate",
        }),
      };
    }

    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    const campaigns = result.Items || [];

    for (const campaign of campaigns) {
      const status = String(campaign.status || "").toLowerCase();
      if (IGNORE_STATUSES.has(status)) continue;

      const advertiser = campaign.advertiserName || campaign.campaignName || "Unknown advertiser";

      const jobs = Array.isArray(campaign.jobs) ? campaign.jobs : [];

      for (const job of jobs) {
        if (normalizePlacement(job?.placement) !== placement) continue;

        const candidateStart = toIsoDate(job?.startTime || campaign.startTime);
        const candidateEnd = toIsoDate(job?.endTime || campaign.endTime);

        if (hasOverlap(requestedStart, requestedEnd, candidateStart, candidateEnd)) {
          return {
            statusCode: 200,
            body: JSON.stringify({
              available: false,
              message: `Slot already taken by: ${advertiser} (${formatRange(candidateStart, candidateEnd)})`,
            }),
          };
        }
      }

      if (!jobs.length && campaignHasPlacement(campaign, placement)) {
        const candidateStart = toIsoDate(campaign.startTime);
        const candidateEnd = toIsoDate(campaign.endTime);

        if (hasOverlap(requestedStart, requestedEnd, candidateStart, candidateEnd)) {
          return {
            statusCode: 200,
            body: JSON.stringify({
              available: false,
              message: `Slot already taken by: ${advertiser} (${formatRange(candidateStart, candidateEnd)})`,
            }),
          };
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        available: true,
      }),
    };
  } catch (error) {
    console.error("Check availability error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};
