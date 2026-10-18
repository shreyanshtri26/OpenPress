// Utility helpers to attach the uploaded asset image as Base64 payload
import apiFetch from "../../../../utils/api";

const DEFAULT_IMAGE_FORMAT = "jpeg";

const normalizeImageUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Handle protocol-relative URLs (e.g., //cdn.example.com/image.jpg)
  if (trimmed.startsWith("//")) {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : undefined);
    return parsed.toString();
  } catch {
    return trimmed;
  }
};

const inferImageFormat = (blobType, assetType, url) => {
  const typeCandidates = [blobType, assetType].filter(Boolean);

  for (const type of typeCandidates) {
    if (type?.includes("/")) {
      return type.split("/")[1].toLowerCase();
    }

    if (typeof type === "string" && type.trim()) {
      return type.replace(/^image\//, "").toLowerCase();
    }
  }

  const urlMatch = url?.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  return DEFAULT_IMAGE_FORMAT;
};

// File metadata can be incorrect (e.g. a JPEG renamed as .png).
// The AI API validates the format against the actual file bytes,
// so detect the real image format instead of relying on metadata.
const detectFormatFromBytes = (uint8Array) => {
  if (!uint8Array || uint8Array.length < 12) return null;

  if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4e && uint8Array[3] === 0x47) {
    return "png";
  }

  if (uint8Array[0] === 0xff && uint8Array[1] === 0xd8 && uint8Array[2] === 0xff) {
    return "jpeg";
  }

  if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x38) {
    return "gif";
  }

  if (
    uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
    uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50
  ) {
    return "webp";
  }

  return null;
};

const isImageAsset = (asset, apiMetadata) => {
  const typeHints = [
    asset?.type,
    asset?.mimeType,
    asset?.fileType,
    apiMetadata?.assetType,
  ].filter(Boolean);

  if (typeHints.some((type) => typeof type === "string" && type.startsWith("image/"))) {
    return true;
  }

  // Video assets have no direct image bytes, but a generated thumbnail frame
  // (passed in via apiMetadata.thumbnailUrl) is a real image and can be used
  // the same way an uploaded photo is.
  if (typeof apiMetadata?.thumbnailUrl === "string" && apiMetadata.thumbnailUrl.trim()) {
    return true;
  }

  const fileName = asset?.fileName || asset?.name || "";
  return /(\.)(jpe?g|png|gif|bmp|webp)$/i.test(fileName);
};

const resolveAssetImageUrl = (asset, apiMetadata) => {
  const candidates = [
    apiMetadata?.originalImage?.url,
    apiMetadata?.previewUrl,
    apiMetadata?.assetUrl,
    apiMetadata?.thumbnailUrl,
    asset?.previewUrl,
    asset?.url,
    asset?.fileUrl,
    asset?.src,
    asset?.originalUrl,
  ];

  return candidates.find((url) => typeof url === "string" && url.trim().length > 0) || null;
};

const upgradeToHttps = (url) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const currentProtocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    const isHttp = parsed.protocol === "http:";
    const isLocalhost = ["localhost", "127.0.0.1"].includes(parsed.hostname);

    if (isHttp && currentProtocol === "https:" && !isLocalhost) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
};

const fetchImageBlob = async (url) => {
  const response = await apiFetch(url, {
    mode: "cors",
    cache: "no-store",
    // No credentials by default to avoid leaking cookies to third parties
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  return response.blob();
};

const encodeBase64 = (uint8Array) => {
  if (!uint8Array) return "";

  if (typeof Buffer !== "undefined") {
    return Buffer.from(uint8Array).toString("base64");
  }

  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(uint8Array[i]);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  return "";
};

export const buildImagePayload = async (asset, apiMetadata) => {
  if (!isImageAsset(asset, apiMetadata)) return null;

  const rawImageUrl = resolveAssetImageUrl(asset, apiMetadata);
  const normalizedUrl = normalizeImageUrl(rawImageUrl);

  if (!normalizedUrl) return null;

  // Try upgraded HTTPS URL first when running on HTTPS to avoid mixed content blocks
  const httpsCandidate = upgradeToHttps(normalizedUrl);
  const urlsToTry = Array.from(
    new Set([httpsCandidate, normalizedUrl].filter(Boolean))
  );

  try {
    let blob = null;
    const errors = [];

    for (const url of urlsToTry) {
      try {
        blob = await fetchImageBlob(url);
        break;
      } catch (err) {
        errors.push({ url, message: err?.message || String(err) });
      }
    }

    if (!blob) {
      throw new Error(
        `Failed to fetch image after trying URLs: ${errors
          .map((e) => `${e.url} (${e.message})`)
          .join(", ")}`
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const bytes = encodeBase64(uint8Array);

    if (!bytes) return null;

    // Prefer the sniffed real format; only fall back to declared metadata
    // when the bytes don't match a known signature.
    const format =
      detectFormatFromBytes(uint8Array) ||
      inferImageFormat(blob.type, asset?.type || asset?.mimeType || asset?.fileType, normalizedUrl);

    return {
      format: format || DEFAULT_IMAGE_FORMAT,
      bytes,
    };
  } catch (error) {
    console.error("Error building image payload:", error);
    return null;
  }
};