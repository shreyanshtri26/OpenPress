import { useState, useCallback, useContext } from 'react';
import env from '@/utils/env';
import apiFetch from '../utils/api';
import { UserContext } from '@/context/UserContext';

export const useFaceSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  const extractS3Key = (s3KeyOrUrl) => {
    if (!s3KeyOrUrl) return '';

    if (!s3KeyOrUrl.includes('/')) {
      return s3KeyOrUrl;
    }

    return s3KeyOrUrl.split('/').pop();
  };

  const addFaceToCollection = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {

        const s3Key = extractS3Key(payload.s3Key);

        const response = await apiFetch(
          `${env.backendApi}/api/analysis/addFaceToCollection`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify({
              s3Key: s3Key,
              personName: payload.personName,
              collectionId: payload.collectionId || 'OpenPress-faces',
            }),
          }
        );


        if (!response.ok) {
          let errorMessage = `HTTP Error: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('Error response:', errorData);
          } catch (e) {
            const text = await response.text();
            console.error('Error response text:', text);
            errorMessage = text || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error adding face:', errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Search faces by image
  const searchFaceByImage = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {

        const s3Key = extractS3Key(payload.s3Key);

        const response = await apiFetch(
          `${env.backendApi}/api/analysis/searchFaceByImage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify({
              s3Key: s3Key,
              collectionId: payload.collectionId || 'OpenPress-faces',
              maxFaces: payload.maxFaces || 10,
              threshold: payload.threshold || 80,
            }),
          }
        );


        if (!response.ok) {
          let errorMessage = `HTTP Error: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('Error response:', errorData);
          } catch (e) {
            const text = await response.text();
            console.error('Error response text:', text);
            errorMessage = text || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.faceMatches || [];
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error searching faces:', errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    addFaceToCollection,
    searchFaceByImage,
    loading,
    error,
  };
};