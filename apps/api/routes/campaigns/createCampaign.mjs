import { PutCommand, ScanCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";
import crypto from "crypto";

const TABLE_NAME = process.env.DYNAMO_CAMPAIGN_TABLE_NAME;

// Statuses that hold a placement slot — mirrors the frontend's isBlocking check
// in CreateCampaignView.jsx (disabledDates/isDayBlockedExternal).
const BLOCKING_STATUSES = new Set(["start now", "start_now", "schedule", "active", "draft", "pause", "paused"]);
const normalizeSlotPlacement = (value) => String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "-");
const toTime = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
};
const rangesOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart !== null && aEnd !== null && bStart !== null && bEnd !== null && aStart <= bEnd && bStart <= aEnd;

// Builds {placement, start, end} slots for a campaign, preferring per-job scheduling
// and falling back to the campaign-level placements/startTime/endTime (mirrors the
// frontend's isDayBlockedExternal fallback in CreateCampaignView.jsx).
const getCampaignSlots = (campaignPlacements, campaignJobs, campaignStart, campaignEnd) => {
  if (campaignJobs && campaignJobs.length > 0) {
    return campaignJobs
      .filter((job) => job?.placement && job?.startTime && job?.endTime)
      .map((job) => ({
        placement: normalizeSlotPlacement(job.placement),
        start: toTime(job.startTime),
        end: toTime(job.endTime),
      }));
  }
  return (campaignPlacements || []).map((p) => ({
    placement: normalizeSlotPlacement(p),
    start: toTime(campaignStart),
    end: toTime(campaignEnd),
  }));
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const {
      campaignName,
      advertiserName,
      status,
      type,
      startTime,
      endTime,
      placements,
      priority,
      frequencyCap,
      creatives,
      thirdPartyTag,
      thirdPartyTagMobile,
      url,
      landingPageURL,
      jobs
    } = body;

    // ✅ Validation (Relaxed for Drafts)
    const isDraft = status?.toLowerCase() === "draft";

    if (!campaignName || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Campaign Name and Status are required",
        }),
      };
    }

    // Strict validation for non-draft status
    if (!isDraft) {
      if (
        !advertiserName ||
        !startTime ||
        !endTime ||
        !placements ||
        placements.length === 0
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "Missing required campaign fields for publishing",
          }),
        };
      }
    }

    // ✅ Reject if the requested placement + date range is already occupied by another
    // campaign whose status still holds the slot (start now / schedule / active / draft / pause).
    const requestedSlots = getCampaignSlots(placements, jobs, startTime, endTime);
    if (requestedSlots.length > 0) {
      const scanResult = await dynamoClient.send(new ScanCommand({ TableName: TABLE_NAME }));
      const existingCampaigns = scanResult.Items || [];

      const conflictingCampaign = existingCampaigns.find((existing) => {
        const existingStatus = String(existing.status || "").toLowerCase();
        if (!BLOCKING_STATUSES.has(existingStatus)) return false;

        const existingSlots = getCampaignSlots(existing.placements, existing.jobs, existing.startTime, existing.endTime);

        return requestedSlots.some((reqSlot) =>
          existingSlots.some((existingSlot) =>
            existingSlot.placement === reqSlot.placement &&
            rangesOverlap(reqSlot.start, reqSlot.end, existingSlot.start, existingSlot.end)
          )
        );
      });

      if (conflictingCampaign) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            message: `A campaign already exists for this placement during the requested dates (advertiser: ${conflictingCampaign.advertiserName || conflictingCampaign.campaignName || "Unknown"}, status: ${conflictingCampaign.status || "unknown"}).`,
          }),
        };
      }
    }

    const campaignId = crypto.randomUUID();

    // ✅ Normalize Jobs (IMPORTANT)
    const normalizedJobs = (jobs || []).map((job, index) => ({
      jobId: crypto.randomUUID(),
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
      // Popup Ad creative — only meaningful when adFormat === "popup", but stored
      // unconditionally (like the other popup* scheduling fields above) since these
      // are simple scalars with safe defaults, unlike spotlightMobileImages which
      // needs the re-indexing/filtering logic above.
      popupDesktopImage: job?.popupDesktopImage || job?.popup_desktop_image || "",
      popupMobileImage: job?.popupMobileImage || job?.popup_mobile_image || "",
      popupCtaText: job?.popupCtaText || job?.popup_cta_text || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // ✅ Normalize Creatives (ensure structure consistency)
    const normalizedCreatives = {};

    if (creatives) {
      Object.keys(creatives).forEach((placement) => {
        normalizedCreatives[placement] = {
          desktop: creatives[placement]?.desktop || "",
          mobile: creatives[placement]?.mobile || "",
          spotlightMobileImages: creatives[placement]?.spotlightMobileImages || []
        };
      });
    }

    const now = new Date().toISOString();

    const newCampaign = {
      campaignId,
      campaignName,
      advertiserName,

      status: (status || "draft").toLowerCase(),
      type: type || "standard",

      startTime,
      endTime,

      placements,

      // ✅ NEW: Jobs (per placement scheduling)
      jobs: normalizedJobs,

      priority: priority?.toLowerCase() || "direct",

      frequencyCap: {
        enabled: frequencyCap?.enabled || false,
        maxImpressions: frequencyCap?.maxImpressions || 0,
        per: frequencyCap?.per || "session"
      },

      creatives: normalizedCreatives,

      thirdPartyTag: thirdPartyTag || "",
      thirdPartyTagMobile: thirdPartyTagMobile || "",

      // ✅ Prefer landingPageURL over url
      landingPageURL: (landingPageURL || url || "").startsWith("http") || !(landingPageURL || url)
        ? (landingPageURL || url || "")
        : `https://${landingPageURL || url}`,

      impressions: 0,
      clicks: 0,
      ctr: "0%",


      createdAt: now,
      updatedAt: now
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newCampaign
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Campaign created successfully",
        campaign: newCampaign
      })
    };

  } catch (error) {
    console.error("Create campaign error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Server error",
        error: error.message
      })
    };
  }
};
