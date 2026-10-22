// src/components/common/DAM/hooks/useAssetLibraryData.js

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import env from '@/utils/env';
import apiFetch from '../../../../utils/api';

// AI Search modules
import { getAiSearchResults } from './ai-search/geminiService';
import { extractAssetIdsFromResponse } from './ai-search/extractionUtils';
import { scoreAssets } from './ai-search/relevanceScorer';
import { performKeywordSearch } from './ai-search/keywordSearch';

// Filter utilities
import { filterByFileType, filterByDate, sortAssets } from './utils/filterUtils';
import { UserContext } from '@/context/UserContext';

const FETCH_ENDPOINT = `${env.backendApi}/api/fetchAsset`;
const DELETE_ENDPOINT = `${env.backendApi}/api/assets/delete`;

const useAssetLibraryData = ({
  searchValue,
  dateUpdatedValue,
  fileTypeValue,
  sortByValue,
  dateRangeValue,
}) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cardViewRef = useRef();
  const aiSessionIdRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const deletedAssetIdsRef = useRef(new Set());

  const userContext = useContext(UserContext);
  const user = userContext?.user;


  const fetchAssets = useCallback(async (options = {}) => {
    const { showLoading = assets.length === 0, query = searchValue } = options;
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Fetch all assets. The backend's Scan is capped at the store's internal
      // ~1MB page size and reports the rest via pagination.nextKey - previously
      // that was never followed, so on a growing table two "fetch everything"
      // calls made moments apart could each land on a different arbitrary slice
      // of assets, making rows (and duplicate rows) appear/disappear between
      // requests depending on which slice came back. Follow nextKey here until
      // hasMore is false so we always assemble the complete, consistent set.
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
      };

      let fetchedAssets = [];
      let nextKey = null;
      let pageCount = 0;
      const MAX_PAGES = 200; // safety net against an unexpected pagination loop

      do {
        const pageUrl = nextKey
          ? `${FETCH_ENDPOINT}?startKey=${nextKey}`
          : FETCH_ENDPOINT;

        const response = await apiFetch(pageUrl, {
          method: 'GET',
          headers: authHeaders,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const pageResult = await response.json();
        fetchedAssets = fetchedAssets.concat(
          Array.isArray(pageResult?.data) ? pageResult.data : []
        );

        nextKey = pageResult?.pagination?.hasMore
          ? pageResult.pagination.nextKey
          : null;
        pageCount += 1;
      } while (nextKey && pageCount < MAX_PAGES);

      // AI Search logic if explicitly queried
      const isAISearch = query && query.trim().length > 0;

      if (isAISearch) {
        try {
          console.log('🔍 Starting AI search for:', query);

          const aiResult = await getAiSearchResults(query, null);
          console.log('🤖 AI response:', aiResult.response);

          const relevantAssetIds = extractAssetIdsFromResponse(aiResult.response);
          console.log('📋 Found asset IDs from AI:', relevantAssetIds);

          if (relevantAssetIds.length > 0) {
            console.log('✅ Using AI results with relevance scoring');
            fetchedAssets = scoreAssets(fetchedAssets, query, relevantAssetIds);
          } else {
            console.log('⚠️ AI returned no results, using smart keyword search');
            fetchedAssets = performKeywordSearch(fetchedAssets, query);
          }

        } catch (aiError) {
          console.error('❌ AI search failed:', aiError);
        }
      }

      // Filter out any locally deleted assets
      const filteredAssets = fetchedAssets.filter(asset =>
        !deletedAssetIdsRef.current.has(asset.assetId)
      );

      setAssets(filteredAssets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError(err.message);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [user, assets.length, searchValue]);

  const deleteAsset = useCallback(async (assetId) => {
    try {
      const response = await apiFetch(DELETE_ENDPOINT, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` })
        },
        body: JSON.stringify({ assetId }),
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      await response.json();

      // Track deleted ID to prevent reappearance
      deletedAssetIdsRef.current.add(assetId);

      // Update local state immediately
      setAssets(prev => prev.filter(a => a.assetId !== assetId));
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    fetchAssets({ showLoading: true });
  }, []);

  // Reset session on clear
  useEffect(() => {
    if (!searchValue || searchValue.trim().length === 0) {
      aiSessionIdRef.current = null;
    }
  }, [searchValue]);

  // Apply filters and sorting instantly in memory
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = [...assets];

    if (searchValue && searchValue.trim().length > 0) {
      filtered = performKeywordSearch(filtered, searchValue);
    }

    filtered = filterByFileType(filtered, fileTypeValue);
    filtered = filterByDate(filtered, dateUpdatedValue, dateRangeValue);
    filtered = sortAssets(filtered, sortByValue);

    // De-duplicate by content identity so multiple DB rows created for the same
    // uploaded file collapse to a single card. Prefer searchableContent+size+type:
    // searchableContent is set once from the original fileName at asset creation
    // (assetCreate.mjs) and is never touched again, whereas fileName itself gets
    // overwritten by the AI-generated title on metadata save (updateAsset.mjs sets
    // fileName = title). Two rows for the same uploaded file can end up with
    // different fileName values if only one of them had its title edited/saved,
    // which would let them slip past a fileName-only dedupe. Duplicate-save rows
    // keep this identical even though each row can get its own S3 key/previewUrl,
    // which previously let the same file slip past a previewUrl-only dedupe once
    // a wider date filter revealed both rows.
    const uniqueMap = new Map();
    filtered.forEach((asset, index) => {
      const nameIdentity = asset.searchableContent || asset.fileName;
      const fileIdentityKey = nameIdentity
        ? `${nameIdentity}::${asset.fileSize || asset.size || ''}::${asset.type || ''}`
        : null;
      const dedupeKey = fileIdentityKey || asset.previewUrl || asset.url || asset.assetId || asset.id || asset._id || `asset-${index}`;
      if (!uniqueMap.has(dedupeKey)) {
        uniqueMap.set(dedupeKey, asset.assetId ? asset : { ...asset, assetId: dedupeKey });
      }
    });
    return Array.from(uniqueMap.values());
  }, [assets, searchValue, dateUpdatedValue, fileTypeValue, sortByValue, dateRangeValue]);

  const stableDataSource = useMemo(() => filteredAndSortedAssets, [filteredAndSortedAssets]);

  const handleAssetUpdate = useCallback((updatedAsset) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset) =>
        asset.assetId === updatedAsset.assetId ? { ...asset, ...updatedAsset } : asset
      )
    );
  }, []);

  return {
    assets,
    loading,
    error,
    cardViewRef,
    stableDataSource,
    fetchAssets,
    deleteAsset,
    handleAssetUpdate,
  };
};

export default useAssetLibraryData;

