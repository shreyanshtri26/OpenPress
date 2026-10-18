import { GetCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";

export const AUDIENCE_TABLE_NAME = process.env.DYNAMO_AUDIENCE_TABLE_NAME || "op_audience";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }

  return Boolean(value);
};

export const getAudienceUserByEmail = async (email) => {
  if (!email) return null;

  const result = await dynamoClient.send(
    new GetCommand({
      TableName: AUDIENCE_TABLE_NAME,
      Key: { email },
    })
  );

  return result.Item || null;
};

export const toAudienceClientUser = (user, fallbackName = "Unknown User") => {
  if (!user) return null;

  const donationTotalAmount = toNumber(user.donationTotalAmount);
  const donationCount = toNumber(user.donationCount);
  const lastDonationAmount = toNumber(user.lastDonationAmount);
  const donationStatus = user.donationStatus || (donationTotalAmount > 0 ? "active" : "none");
  const fallbackIsDonor = donationTotalAmount > 0 || donationCount > 0 || lastDonationAmount > 0;
  const isDonor = Boolean(
    toBoolean(user.isDonor, toBoolean(user.suppressCampaigns, fallbackIsDonor))
  );
  const suppressCampaigns = toBoolean(user.suppressCampaigns, isDonor);

  return {
    email: user.email,
    name: user.displayName || user.fullName || fallbackName,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    fullName: user.fullName ?? null,
    displayName: user.displayName ?? null,
    role: user.role || "audience",
    provider: user.provider || null,
    isDonor,
    adFree: suppressCampaigns,
    suppressCampaigns,
    donationStatus,
    donationTotalAmount,
    donationCount,
    lastDonationAmount,
    donationCurrency: user.donationCurrency || user.lastDonationCurrency || null,
    lastDonationAt: user.lastDonationAt || null,
  };
};