import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { getAiSearchResults } from '../DAM/hooks/ai-search/geminiService';
import { extractAssetIdsFromResponse } from '../DAM/hooks/ai-search/extractionUtils';
import { scoreAssets } from '../DAM/hooks/ai-search/relevanceScorer';
import { performKeywordSearch } from '../DAM/hooks/ai-search/keywordSearch';
import env from '@/utils/env';
import { UserContext } from '@/context/UserContext';
import apiFetch from '../../../utils/api';

const ASSET_ENDPOINT = `${env.backendApi}/api/fetchAsset`;
const DELETE_ENDPOINT = `${env.backendApi}/api/assets/delete`;

const useAssetData = (searchValue = '') => {
  const [baseAssets, setBaseAssets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const aiSearchCacheRef = useRef(new Map());
  const isMountedRef = useRef(true);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  const applySearchScoring = useCallback(
    async (assetList, query) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return assetList;
      }

      const cacheKey = trimmedQuery.toLowerCase();
      const cachedResult = aiSearchCacheRef.current.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      try {
        const aiResult = await getAiSearchResults(trimmedQuery, null);
        const relevantAssetIds = extractAssetIdsFromResponse(aiResult.response);

        const scoredAssets =
          relevantAssetIds.length > 0
            ? scoreAssets(assetList, trimmedQuery, relevantAssetIds)
            : performKeywordSearch(assetList, trimmedQuery);

        if (scoredAssets.length > 0) {
          aiSearchCacheRef.current.set(cacheKey, scoredAssets);
        }

        return scoredAssets;
      } catch (aiError) {
        console.error('Asset modal AI search failed:', aiError);
        const fallbackResults = performKeywordSearch(assetList, trimmedQuery);
        if (fallbackResults.length > 0) {
          aiSearchCacheRef.current.set(cacheKey, fallbackResults);
        }
        return fallbackResults;
      }
    },
    [],
  );

  const fetchAssets = useCallback(async () => {
    try {
      setIsFetching(true);
      setIsSearching(false);
      setError(null);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      searchRequestIdRef.current += 1;

      const response = await apiFetch(ASSET_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!isMountedRef.current) {
        return;
      }

      const fetchedAssets = Array.isArray(result?.data) ? result.data : [];

      aiSearchCacheRef.current.clear();
      setBaseAssets(fetchedAssets);
      setAssets(fetchedAssets);
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      setError(err.message);
      setBaseAssets([]);
      setAssets([]);
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    const trimmedSearch = searchValue.trim();

    if (!trimmedSearch) {
      searchRequestIdRef.current += 1;
      if (isMountedRef.current) {
        setAssets(baseAssets);
        setIsSearching(false);
      }
      return undefined;
    }

    if (!baseAssets.length) {
      if (isMountedRef.current) {
        setAssets([]);
        setIsSearching(false);
      }
      return undefined;
    }

    const currentSearchId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = currentSearchId;

    const cacheKey = trimmedSearch.toLowerCase();
    const keywordResults = performKeywordSearch(baseAssets, trimmedSearch);
    const normalizedQuery = cacheKey;
    const shouldRunAiSearch = trimmedSearch.length >= 3;
    const fallbackSubstringMatches = baseAssets.filter((asset) => {
      const fileName = (asset?.fileName || '').toLowerCase();
      const summary = (asset?.summary || '').toLowerCase();

      return fileName.includes(normalizedQuery) || summary.includes(normalizedQuery);
    });

    const immediateResults = keywordResults.length > 0 ? keywordResults : fallbackSubstringMatches;

    if (isMountedRef.current) {
      setAssets(immediateResults.length > 0 ? immediateResults : baseAssets);
      setIsSearching(false);
    }

    if (!aiSearchCacheRef.current.has(cacheKey) && (!shouldRunAiSearch || immediateResults.length > 0)) {
      aiSearchCacheRef.current.set(cacheKey, immediateResults.length > 0 ? immediateResults : baseAssets);
    }

    const cachedResults = aiSearchCacheRef.current.get(cacheKey);

    if (cachedResults) {
      if (isMountedRef.current && searchRequestIdRef.current === currentSearchId) {
        setAssets(cachedResults);
        setIsSearching(false);
      }
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
      };
    }

    if (!shouldRunAiSearch) {
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
      };
    }

    if (isMountedRef.current && immediateResults.length === 0) {
      setIsSearching(true);
    }

    searchTimeoutRef.current = setTimeout(() => {
      applySearchScoring(baseAssets, trimmedSearch)
        .then((scoredAssets) => {
          if (!isMountedRef.current || searchRequestIdRef.current !== currentSearchId) {
            return;
          }

          if (scoredAssets.length > 0) {
            aiSearchCacheRef.current.set(cacheKey, scoredAssets);
          } else if (immediateResults.length > 0) {
            aiSearchCacheRef.current.set(cacheKey, immediateResults);
          }
          setAssets(
            scoredAssets.length > 0
              ? scoredAssets
              : immediateResults.length > 0
                ? immediateResults
                : baseAssets,
          );
        })
        .catch((aiError) => {
          console.error('Asset modal AI search scoring failed:', aiError);
          if (isMountedRef.current && searchRequestIdRef.current === currentSearchId) {
            setAssets(immediateResults.length > 0 ? immediateResults : baseAssets);
          }
        })
        .finally(() => {
          if (!isMountedRef.current || searchRequestIdRef.current !== currentSearchId) {
            return;
          }

          setIsSearching(false);
        });
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      if (isMountedRef.current) {
        setIsSearching(false);
      }
    };
  }, [searchValue, baseAssets, applySearchScoring]);

  const deleteAsset = useCallback(
    async (fileName) => {
      try {
        const response = await apiFetch(DELETE_ENDPOINT, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({ fileName }),
        });

        if (!response.ok) {
          throw new Error(`Delete failed: ${response.status}`);
        }

        const result = await response.json();
        alert(result.message || `${fileName} deleted successfully!`);
        fetchAssets();
      } catch (err) {
        alert('Failed to delete file.');
        throw err;
      }
    },
    [fetchAssets],
  );

  return {
    assets,
    loading: isFetching || isSearching,
    error,
    refreshAssets: fetchAssets,
    deleteAsset,
  };
};

export default useAssetData;
