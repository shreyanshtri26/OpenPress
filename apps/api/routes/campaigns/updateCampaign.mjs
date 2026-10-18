import { UpdateCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";
import crypto from "crypto";

const TABLE_NAME = process.env.DYNAMO_CAMPAIGN_TABLE_NAME;

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const {
      campaignId,
      campaignName,
      advertiserName,
      status,
      type,
      startTime,
      endTime,
      placements,
      priority,
      thirdPartyTag,
      thirdPartyTagMobile,
      frequencyCap,
      creatives,
      landingPageURL,
      url,
      jobs
    } = body;

    // ✅ Validate required field
    if (!campaignId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "campaignId is required",
        }),
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

    // ✅ Basic fields
    if (campaignName) addField("campaignName", campaignName);
    if (advertiserName) addField("advertiserName", advertiserName);
    if (status) addField("status", status.toLowerCase());
    if (type) addField("type", type.toLowerCase());
    if (startTime) addField("startTime", startTime);
    if (endTime) addField("endTime", endTime);
    if (placements) addField("placements", placements);
    if (priority) addField("priority", priority.toLowerCase());
    if (thirdPartyTag !== undefined) addField("thirdPartyTag", thirdPartyTag);
    if (thirdPartyTagMobile !== undefined) addField("thirdPartyTagMobile", thirdPartyTagMobile);

    // ✅ Frequency Cap
    if (frequencyCap) {
      addField("frequencyCap", {
        enabled: frequencyCap?.enabled || false,
        maxImpressions: frequencyCap?.maxImpressions || 0,
        per: frequencyCap?.per || "session",
      });
    }

    // ✅ Creatives normalization (IMPORTANT)
    if (creatives) {
      const normalizedCreatives = {};

      Object.keys(creatives).forEach((placement) => {
        normalizedCreatives[placement] = {
          desktop: creatives[placement]?.desktop || "",
          mobile: creatives[placement]?.mobile || "",
          spotlightMobileImages: creatives[placement]?.spotlightMobileImages || []
        };
      });

      addField("creatives", normalizedCreatives);
    }


    // ✅ Jobs normalization (IMPORTANT)
    if (jobs && Array.isArray(jobs)) {
      const normalizedJobs = jobs.map((job) => ({
        jobId: job?.jobId || crypto.randomUUID(),
        placement: job?.placement,
        dimension: job?.dimension || null,
        afterParagraph: job?.afterParagraph || job?.after_paragraph || null,
        repeatAd: job?.repeatAd ?? job?.repeat_ad ?? true,
        startTime: job?.startTime,
        endTime: job?.endTime,
        thirdPartyTagDesktop: job?.thirdPartyTagDesktop || "",
        thirdPartyTagMobile: job?.thirdPartyTagMobile || "",
        // Per-job click-through URL. Falls back to the campaign-level
        // landingPageURL at render time when left empty, so existing campaigns
        // keep behaving exactly as before.
        landingPageURL: job?.landingPageURL || job?.landing_page_url || "",
        adFormat: job?.adFormat || job?.ad_format || "conventional",
        // Re-index spotlightFallbackIndex to match the position it lands at AFTER filtering
        // out empty slots below — otherwise a fallback chosen against the raw slot array
        // (which can have gaps, e.g. [null, imageA, imageB]) silently points at the wrong
        // image (or resets to slide 1) once the array is compacted.
        ...(() => {
          if ((job?.adFormat || job?.ad_format) !== "spotlight") {
            return { spotlightMobileImages: [], spotlightFallbackIndex: 0 };
          }
          const rawImages = job?.spotlightMobileImages || job?.spotlight_mobile_images || [];
          const rawIdx = Number(job?.spotlightFallbackIndex ?? job?.spotlight_fallback_index) || 0;
          const chosenUrl = rawImages[rawIdx];
          const filtered = rawImages.filter(Boolean);
          const remappedIdx = chosenUrl ? filtered.indexOf(chosenUrl) : -1;
          return {
            spotlightMobileImages: filtered,
            spotlightFallbackIndex: remappedIdx >= 0 ? remappedIdx : 0,
          };
        })(),
        allowedPages: job?.allowedPages || [],
        popupTrigger: job?.popupTrigger || "immediate",
        popupTriggerVal: job?.popupTriggerVal !== undefined ? Number(job.popupTriggerVal) : 0,
        popupCapDays: job?.popupCapDays !== undefined ? Number(job.popupCapDays) : 7,
        popupHideOnConvert: job?.popupHideOnConvert ?? true,
        popupDesktopImage: job?.popupDesktopImage || job?.popup_desktop_image || "",
        popupMobileImage: job?.popupMobileImage || job?.popup_mobile_image || "",
        popupCtaText: job?.popupCtaText || job?.popup_cta_text || "",
        updatedAt: new Date().toISOString()
      }));

      addField("jobs", normalizedJobs);
    }

    // ✅ Landing Page URL (priority: landingPageURL > url)
    if (landingPageURL || url) {
      const finalUrl = landingPageURL || url;
      if (finalUrl && typeof finalUrl === 'string') {
        const formattedUrl = finalUrl.startsWith("http")
          ? finalUrl
          : `https://${finalUrl}`;

        addField("landingPageURL", formattedUrl);
      }
    }

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

    const result = await dynamoClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { campaignId },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ConditionExpression: "attribute_exists(campaignId)",
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Campaign updated successfully",
        campaign: result.Attributes,
      }),
    };

  } catch (error) {
    console.error("Update campaign error:", error);

    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Campaign not found",
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message,
      }),
    };
  }
};
