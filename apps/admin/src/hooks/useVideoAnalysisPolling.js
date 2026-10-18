import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import env from '@/utils/env';
import apiFetch from '../utils/api';
import { UserContext } from '@/context/UserContext';

export const useVideoAnalysisPolling = () => {
  const [videoStatus, setVideoStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const pollCountRef = useRef(0);
  const maxPollsRef = useRef(1800);
  const assetIdRef = useRef(null);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  const fetchVideoStatus = useCallback(
    async (assetId) => {
      try {
        const response = await apiFetch(
          `${env.backendApi}/api/asset/status?assetId=${assetId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[Video Status] Asset ${assetId}:`, data);

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error fetching video status:', err);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const startPolling = useCallback(
    (assetId, pollingInterval = 30000) => {
      if (isPolling && assetIdRef.current === assetId) {
        console.warn('Polling already in progress for this asset');
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      console.log(`Starting video analysis polling for asset: ${assetId}`);
      assetIdRef.current = assetId;
      setIsPolling(true);
      setError(null);
      pollCountRef.current = 0;
      maxPollsRef.current = Math.ceil(900000 / pollingInterval);

      const poll = async () => {
        try {
          pollCountRef.current++;
          console.log(
            `Polling attempt ${pollCountRef.current} for asset: ${assetId}`
          );

          const status = await fetchVideoStatus(assetId);
          setVideoStatus(status);

          if (status?.analysis?.labels?.status === 'SUCCEEDED') {
            console.log(`✅ Analysis labels SUCCEEDED for asset: ${assetId}`);
            setIsPolling(false);
            assetIdRef.current = null;
            return;
          }

          if (status?.status === 'completed' || status?.status === 'COMPLETED') {
            console.log(`Video processing completed for asset: ${assetId}`);
            setIsPolling(false);
            assetIdRef.current = null;
            return;
          }

          if (status?.status === 'failed' || status?.status === 'FAILED') {
            console.error(`Video analysis failed for asset: ${assetId}`);
            setError(status.error || 'Video analysis failed');
            setIsPolling(false);
            assetIdRef.current = null;
            return;
          }


          if (pollCountRef.current >= maxPollsRef.current) {
            console.warn(`Max polling attempts reached for asset: ${assetId}`);
            setError('Video analysis timeout: exceeded maximum wait time');
            setIsPolling(false);
            assetIdRef.current = null;
            return;
          }


          timeoutRef.current = setTimeout(poll, pollingInterval);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error('Polling error:', err);
          setError(errorMessage);

          if (pollCountRef.current < maxPollsRef.current) {
            console.log('Retrying polling...');
            timeoutRef.current = setTimeout(poll, pollingInterval);
          } else {
            setIsPolling(false);
            assetIdRef.current = null;
          }
        }
      };

      poll();
    },
    [fetchVideoStatus, isPolling]
  );

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
    assetIdRef.current = null;
    console.log('Video analysis polling stopped');
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    videoStatus,
    isPolling,
    error,
    startPolling,
    stopPolling,
    fetchVideoStatus,
  };
};