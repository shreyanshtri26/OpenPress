/**
 * Utility functions for filtering and sorting assets
 */

/**
 * Filter assets by file type
 * @param {Array} assets - Assets to filter
 * @param {string} fileTypeValue - File type filter value
 * @returns {Array} Filtered assets
 */
export const filterByFileType = (assets, fileTypeValue) => {
  if (fileTypeValue === 'all') return assets;
  
  return assets.filter((asset) => {
    const mimeType = asset.type?.toLowerCase() || '';
    switch (fileTypeValue) {
      case 'image':
        return mimeType.startsWith('image/');
      case 'video':
        return mimeType.startsWith('video/');
      case 'audio':
        return mimeType.startsWith('audio/');
      default:
        return true;
    }
  });
};

const getAssetDate = (asset) => {
  const raw = asset?.createdAt || asset?.dateUpdated || asset?.updatedAt || asset?.uploadDate || asset?.date;
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Filter assets by date range
 * @param {Array} assets - Assets to filter
 * @param {string} dateUpdatedValue - Date filter value
 * @param {Array} dateRangeValue - Custom date range [start, end]
 * @returns {Array} Filtered assets
 */
export const filterByDate = (assets, dateUpdatedValue, dateRangeValue) => {
  if (dateUpdatedValue === 'all') return assets;
  
  const now = new Date();
  let cutoffDate;

  switch (dateUpdatedValue) {
    case 'last7days':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last30days':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'last90days':
      cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'custom': {
      const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

      const [rawStart, rawEnd] =
        Array.isArray(dateRangeValue) && dateRangeValue.length === 2
          ? dateRangeValue
          : [null, null];

      const hasStart = isValidDate(rawStart);
      const hasEnd = isValidDate(rawEnd);

      let startDate;
      let endDate;

      // 1) both empty -> fallback to last 7 days
      if (!hasStart && !hasEnd) {
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      }

      // 2) start set, end empty -> end = now
      if (hasStart && !hasEnd) {
        startDate = new Date(rawStart);
        endDate = new Date();
      }
      // 3) end set, start empty -> start = end - 7 days
      else if (!hasStart && hasEnd) {
        endDate = new Date(rawEnd);
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      // 4) both set
      else {
        startDate = new Date(rawStart);
        endDate = new Date(rawEnd);
      }

      // Safety if range is reversed
      if (startDate > endDate) {
        const temp = startDate;
        startDate = endDate;
        endDate = temp;
      }

      // Inclusive day boundaries
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      return assets.filter((asset) => {
        const assetDate = getAssetDate(asset);
        return assetDate >= startDate && assetDate <= endDate;
      });
    }
    default:
      cutoffDate = null;
  }

  if (cutoffDate) {
    return assets.filter((asset) => {
      const assetDate = getAssetDate(asset);
      return assetDate >= cutoffDate;
    });
  }
  
  return assets;
};

/**
 * Sort assets by specified criteria
 * @param {Array} assets - Assets to sort
 * @param {string} sortByValue - Sort criteria
 * @returns {Array} Sorted assets
 */
export const sortAssets = (assets, sortByValue) => {
  const sorted = [...assets];
  
  sorted.sort((a, b) => {
    switch (sortByValue) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      default:
        return 0;
    }
  });
  
  return sorted;
};
