// src/components/common/DAM/hooks/ai-search/extractionUtils.js

/**
 * Utilities for extracting asset identifiers from AI responses
 */

/**
 * Extract asset IDs and filenames from AI response text
 * @param {string} aiResponse - AI response text
 * @returns {string[]} Array of asset IDs and filenames
 */
export const extractAssetIdsFromResponse = (aiResponse) => {
  if (!aiResponse) return [];
  
  
  const assetData = [];
  
  // Pattern 1: Extract from S3 URLs (highest priority)
  const s3UrlPattern = /https?:\/\/[^\s)"\]]+\/([^\s)"\]\/]+\.[A-Za-z0-9]+)/gi;

  let s3Match;
  while ((s3Match = s3UrlPattern.exec(aiResponse)) !== null) {
    const filename = s3Match[1];
    assetData.push(filename);
  }
  
  // Pattern 2: Extract Asset IDs (UUID format)
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const foundUuids = aiResponse.match(uuidPattern);
  if (foundUuids) {
    assetData.push(...foundUuids);
  }
  
  // Pattern 3: Extract standalone filenames
  const filenamePattern = /[\w\-\.]+\.(jpg|jpeg|png|gif|mp4|mov|pdf|doc|docx|webp|svg|JPG|JPEG|PNG)/gi;
  const foundFilenames = aiResponse.match(filenamePattern);
  if (foundFilenames) {
    assetData.push(...foundFilenames);
  }
  
  // Remove duplicates
  const uniqueData = [...new Set(assetData)];
  
  return uniqueData;
};
