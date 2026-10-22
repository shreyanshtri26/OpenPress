import { UpdateCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const TABLE_NAME = process.env.DOC_CAMPAIGN_TABLE_NAME;
const ALLOWED_EVENT_TYPES = new Set(["impression", "click"]);

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    if (!TABLE_NAME) {
      return json(500, { message: "Server configuration error: campaign table missing" });
    }

    const body = JSON.parse(event.body || "{}");
    const campaignId = String(body.campaignId || "").trim();
    const rawEventType = String(body.eventType || "").trim().toLowerCase();
    const eventType = rawEventType === "render" ? "impression" : rawEventType;

    if (!campaignId) {
      return json(400, { message: "campaignId is required" });
    }

    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return json(400, { message: "eventType must be impression or click" });
    }

    const nowIso = new Date().toISOString();
    const incrementField = eventType === "impression" ? "impressions" : "clicks";
    const lastAtField = eventType === "impression" ? "lastImpressionAt" : "lastClickAt";
    const jobId = String(body.jobId || "").trim();

    const exprNames = {
      "#incrementField": incrementField,
      "#updatedAt": "updatedAt",
      "#lastAtField": lastAtField,
      "#lastEventAt": "lastEventAt",
    };
    const exprValues = {
      ":one": 1,
      ":now": nowIso,
    };

    let updateExpression = `ADD #incrementField :one SET #updatedAt = :now, #lastAtField = :now, #lastEventAt = :now`;

    if (jobId) {
      // Step 1 & 2 — initialize jobMetrics and jobMetrics.{jobId} maps before nested ADD
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { campaignId },
          UpdateExpression: "SET #jobMetrics = if_not_exists(#jobMetrics, :emptyMap)",
          ExpressionAttributeNames: { "#jobMetrics": "jobMetrics" },
          ExpressionAttributeValues: { ":emptyMap": {} },
          ConditionExpression: "attribute_exists(campaignId)",
        })
      );
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { campaignId },
          UpdateExpression: "SET #jobMetrics.#jobId = if_not_exists(#jobMetrics.#jobId, :emptyMap)",
          ExpressionAttributeNames: { "#jobMetrics": "jobMetrics", "#jobId": jobId },
          ExpressionAttributeValues: { ":emptyMap": {} },
        })
      );
      // Step 3 — now safe to ADD into the initialized nested map
      exprNames["#jobMetrics"] = "jobMetrics";
      exprNames["#jobId"] = jobId;
      exprNames["#jobField"] = incrementField;
      exprValues[":one2"] = 1;
      updateExpression += `, #jobMetrics.#jobId.#jobField = if_not_exists(#jobMetrics.#jobId.#jobField, :zero) + :one2`;
      exprValues[":zero"] = 0;
    }

    const updateResult = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { campaignId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ConditionExpression: "attribute_exists(campaignId)",
        ReturnValues: "ALL_NEW",
      })
    );

    const attrs = updateResult.Attributes || {};
    const impressions = Number(attrs.impressions || 0);
    const clicks = Number(attrs.clicks || 0);
    const ctr = impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : "0%";

    console.info(
      JSON.stringify({
        event: "campaign_metric_event",
        eventType,
        campaignId,
        placement: body.placement || null,
        jobId: body.jobId || null,
        pageUrl: body.pageUrl || null,
        userAgent: body.userAgent || null,
        referrer: body.referrer || null,
        timestamp: nowIso,
        clicks,
        impressions,
        ctr,
      })
    );

    return json(200, {
      message: "Campaign metric recorded",
      campaignId,
      eventType,
      clicks,
      impressions,
      ctr,
    });
  } catch (error) {
    console.error("trackCampaignEvent error:", error);

    if (error?.name === "ConditionCheckFailed") {
      return json(404, { message: "Campaign not found" });
    }

    return json(500, { message: "Server error", error: error?.message || "Unknown error" });
  }
};
