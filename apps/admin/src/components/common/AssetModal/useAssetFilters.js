import { useMemo, useState } from 'react';
import {
  filterByDate,
  filterByFileType,
  sortAssets,
} from '../DAM/hooks/utils/filterUtils';

const useAssetFilters = (assets = [], options = {}) => {
  const {
    searchValue: controlledSearchValue,
    setSearchValue: setControlledSearchValue,
  } = options;

  const [internalSearchValue, setInternalSearchValue] = useState('');
  const [dateUpdatedValue, setDateUpdatedValue] = useState('last30days');
  const [fileTypeValue, setFileTypeValue] = useState('all');
  const [sortByValue, setSortByValue] = useState('newest');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [dateRangeValue, setDateRangeValue] = useState(null);

  const searchValue = controlledSearchValue ?? internalSearchValue;
  const setSearchValue = setControlledSearchValue ?? setInternalSearchValue;

  const handleDateUpdatedChange = (value) => {
    setDateUpdatedValue(value);
    setShowCustomDate(value === 'custom');
  };

  const filteredAssets = useMemo(() => {
    let filtered = [...assets];

    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter((asset) =>
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.fileName?.toLowerCase().includes(searchLower) ||
        asset.type?.toLowerCase().includes(searchLower) ||
        asset.state?.toLowerCase().includes(searchLower) ||
        asset.summary?.toLowerCase().includes(searchLower) ||
        asset.caption?.toLowerCase().includes(searchLower),
      );
    }

    filtered = filterByFileType(filtered, fileTypeValue);
    filtered = filterByDate(filtered, dateUpdatedValue, dateRangeValue);
    filtered = sortAssets(filtered, sortByValue);

    // De-duplicate by assetId to prevent duplicate cards
    const uniqueMap = new Map();
    filtered.forEach((asset, index) => {
      const id = asset.assetId || asset.id || asset._id || asset.url || asset.fileName || `asset-${index}`;
      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, {
          ...asset,
          assetId: id
        });
      }
    });
    return Array.from(uniqueMap.values());
  }, [assets, searchValue, dateUpdatedValue, fileTypeValue, sortByValue, dateRangeValue]);

  const stableDataSource = useMemo(
    () => filteredAssets,
    [filteredAssets],
  );

  return {
    searchValue,
    setSearchValue,
    dateUpdatedValue,
    handleDateUpdatedChange,
    fileTypeValue,
    setFileTypeValue,
    sortByValue,
    setSortByValue,
    showCustomDate,
    dateRangeValue,
    setDateRangeValue,
    filteredAssets,
    stableDataSource,
  };
};

export default useAssetFilters;
