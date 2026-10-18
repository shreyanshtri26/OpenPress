import { ScanCommand, UpdateCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";

const TABLE_NAME = process.env.DYNAMO_CAMPAIGN_TABLE_NAME;

export const handler = async (event) => {
  try {

    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE_NAME
      })
    );

    const campaigns = result.Items || [];
    const now = new Date();

    // Auto-expire campaigns whose endTime has passed but status is still active
    const toExpire = campaigns.filter(c => {
      const activeStatuses = ['start_now', 'active', 'running'];
      if (!activeStatuses.includes((c.status || '').toLowerCase())) return false;
      const endTime = c.endTime || (c.jobs || []).map(j => j.endTime).filter(Boolean).sort().at(-1);
      return endTime && new Date(endTime) < now;
    });

    if (toExpire.length > 0) {
      await Promise.allSettled(toExpire.map(c =>
        dynamoClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { campaignId: c.campaignId },
          UpdateExpression: "SET #status = :expired, updatedAt = :now",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":expired": "expired", ":now": now.toISOString() },
        }))
      ));
      toExpire.forEach(c => { c.status = "expired"; });
    }

    campaigns.forEach((campaign) => {

      if (Array.isArray(campaign.jobs) && campaign.jobMetrics) {
        campaign.jobs = campaign.jobs.map(job => {
          const jm = campaign.jobMetrics[job.jobId];
          const jImp = Number(jm?.impressions || 0);
          const jClicks = Number(jm?.clicks || 0);
          return {
            ...job,
            impressions: jImp,
            clicks: jClicks,
            ctr: jImp > 0 ? `${((jClicks / jImp) * 100).toFixed(2)}%` : "0%",
          };
        });
      }
    });

    // Sort newest first
    campaigns.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        count: campaigns.length,
        campaigns
      })
    };

  } catch (error) {
    console.error("Get campaigns error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message
      })
    };
  }
};