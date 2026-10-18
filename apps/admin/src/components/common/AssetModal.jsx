import { useContext, useEffect, useMemo, useState } from 'react';
import AssetModalStyles from './AssetModal/AssetModalStyles';
import AssetFilterBar from './AssetModal/AssetFilterBar';
import AssetGrid from './AssetModal/AssetGrid';
import useAssetData from './AssetModal/useAssetData';
import useAssetFilters from './AssetModal/useAssetFilters';
import ImageFocalEditor from './ImageFocalEditor';
import { UserContext } from '../../context/UserContext';
import UploadComponent from '../common/DAM/UploadComponent';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
import { buildImagePayload } from './DAM/utils/imagePayload';
import { generateAITitleFromSummary } from './DAM/Drawer/useAssetMetadata';
import BackToDashboardButton from './BackToDashboardButton';

// const defaultAccordionArrowTemplate = () => {};
// const defaultOnImageEditSave = () => {};
// const defaultOnImageSelect = () => {};

const defaultAccordionArrowTemplate = (_buttonData, _buttonElement) => { };
const defaultOnImageEditSave = (_imageUrl, _asset, _focalPoint, _caption) => { };
const defaultOnImageSelect = (_imageUrl, _asset) => { };

const getGridHeight = () => {
  if (typeof window === 'undefined') {
    return 'calc(100vh - 260px)';
  }
  return window.innerWidth <= 640 ? 'calc(100% - 60px)' : 'calc(100% - 4px)';
};

const AssetModal = ({
  storyId,
  accordionArrowTemplate = defaultAccordionArrowTemplate,
  onImageEditSave = defaultOnImageEditSave,
  onImageSelect = defaultOnImageSelect,
  isOpen = false,
  visible = false,
  initialFocalPoint = null,
  isFeaturedImage = false, // Add isFeaturedImage prop
  currentFeaturedImageUrl = '',
  currentStoryCaption = '',
}) => {
  const isModalOpen = Boolean(isOpen || visible);
  const { user } = useContext(UserContext);
  const [searchValue, setSearchValue] = useState('');
  const { assets, loading, error, deleteAsset } = useAssetData(searchValue);
  const [localAssets, setLocalAssets] = useState([]); // ✅ local updates
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [showFocalEditor, setShowFocalEditor] = useState(false);
  const [currentView, setCurrentView] = useState('library');
  const [assetOverrides, setAssetOverrides] = useState({});

  const extractMetadataDetails = (metadata) => {
    if (!metadata) {
      return { tags: [] }; // { tags: [], celebrities: [] } before celebrity removal
    }

    let allTags = [];
    let highConfidence = [];
    // let celebrities = []; // removed: celebrity detection feature deprecated

    if (metadata.analysis?.labels?.data) {
      const labels = metadata.analysis.labels.data;
      const unique = {};

      labels.forEach((item) => {
        if (item.label) {
          unique[item.label] = item.confidence;
        }
      });

      allTags = Object.keys(unique);
      highConfidence = Object.entries(unique)
        .filter(([, confidence]) => confidence > 90)
        .map(([label]) => label);

      // if (metadata.analysis?.celebrities?.data) { // removed: celebrity detection feature deprecated
      //   celebrities = metadata.analysis.celebrities.data.map((c) => c.name);
      // }
    } else if (metadata.rekognitionAnalysis) {
      const rek = metadata.rekognitionAnalysis;

      if (rek.labels?.labels) {
        allTags = rek.labels.labels.map((label) => label.name);
        highConfidence = rek.labels.labels
          .filter((label) => label.confidence > 90)
          .map((label) => label.name);
      }

      if (rek.text?.fullText) {
        allTags.push(rek.text.fullText);
      }

      // if (rek.celebrities?.celebrities) { // removed: celebrity detection feature deprecated
      //   celebrities = rek.celebrities.celebrities.map((c) => c.name);
      // }
    }

    const uniqueTags = Array.from(new Set(allTags));
    const tagsToSave = highConfidence.length ? highConfidence : uniqueTags;

    return {
      tags: tagsToSave,
      // celebrities, // removed: celebrity detection feature deprecated
    };
  };

  const getAssetCaption = (asset) => {
    if (!asset || typeof asset.caption !== 'string') return '';
    return asset.caption.trim();
  };

  const getAssetUrl = (asset) => {
    if (!asset) return '';
    return asset.previewUrl || asset.url || asset.fileUrl || '';
  };

  const normalizeComparableUrl = (url) => {
    if (typeof url !== 'string' || url.trim() === '') return '';

    const trimmedUrl = url.trim();

    try {
      const parsed = new URL(trimmedUrl);
      parsed.searchParams.delete('nocache');
      return parsed.toString();
    } catch (error) {
      return trimmedUrl;
    }
  };

  const getInitialEditorCaption = (asset) => {
    const assetCaption = getAssetCaption(asset);
    if (assetCaption) {
      return assetCaption;
    }

    const fallbackFromAsset = asset?.description || asset?.summary || (asset?.name ? asset.name.replace(/\.[^/.]+$/, '') : '') || '';

    if (!isFeaturedImage || typeof currentStoryCaption !== 'string' || currentStoryCaption.trim() === '') {
      return fallbackFromAsset;
    }

    const normalizedCurrentImageUrl = normalizeComparableUrl(currentFeaturedImageUrl);
    const normalizedAssetUrl = normalizeComparableUrl(getAssetUrl(asset));

    if (normalizedCurrentImageUrl && normalizedCurrentImageUrl === normalizedAssetUrl) {
      return currentStoryCaption.trim();
    }

    return fallbackFromAsset;
  };

  const cleanupSummary = (summary) => {
    if (!summary) return '';

    let cleanedSummary = summary.trim();
    const prefixes = ['Here is', "Here's", 'Caption:', 'Image caption:', 'News caption:'];

    prefixes.forEach((pre) => {
      const regex = new RegExp(`^${pre}[:\\s]*`, 'i');
      cleanedSummary = cleanedSummary.replace(regex, '');
    });

    cleanedSummary = cleanedSummary
      .replace(/SESSION:[0-9a-f-\-]+/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    cleanedSummary = cleanedSummary.replace(/^[\*\-\#\s]+/, '').trim();

    if (
      (cleanedSummary.startsWith('"') && cleanedSummary.endsWith('"')) ||
      (cleanedSummary.startsWith("'") && cleanedSummary.endsWith("'"))
    ) {
      cleanedSummary = cleanedSummary.slice(1, -1).trim();
    }

    return cleanedSummary;
  };

  const generateSummaryFromTags = async (tags, asset, apiMetadata) => { // (tags, celebrities, asset, apiMetadata) before celebrity removal
    if (!Array.isArray(tags) || tags.length === 0) { // celebrities.length check removed: celebrity detection feature deprecated
      return '';
    }

    let prompt = `
give me only a factual, detailed summary caption. 2-3 sentences max.
this is for journalism and therefore no extra fluff beyond what is shown in the image
only provide the summary in your response, nothing else

Write the caption now:
`;

    try {
      const imagePayload = await buildImagePayload(asset, apiMetadata);
      const image = imagePayload
        ? {
          format: imagePayload.format,
          source: { bytes: imagePayload.bytes },
        }
        : null;

      const response = await apiFetch(
        `${env.aiApi}/normal_stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            image
              ? {
                query: prompt,
                sessionId,
                image,
              }
              : { query: prompt, sessionId }
          ),
        },
      );

      if (!response.ok) {
        throw new Error(`Summary generation failed (${response.status})`);
      }

      if (!response.body) {
        const text = await response.text();
        return cleanupSummary(text);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let summaryText = '';
      let sessionReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        if (!sessionReceived && chunk.includes("SESSION:")) {
          const lines = chunk.split("\n");
          const sessionLine = lines.find((l) => l.startsWith("SESSION:"));
          if (sessionLine) {
            const newSessionId = sessionLine.replace("SESSION:", "").trim();
            setSessionId(newSessionId);
            sessionReceived = true;

            const remainingContent = lines
              .filter((l) => !l.startsWith("SESSION:"))
              .join("\n");

            if (remainingContent) {
              summaryText += remainingContent;
            }
            continue;
          }
        }

        summaryText += chunk;
      }

      return cleanupSummary(summaryText);
    } catch (error) {
      console.error('Auto summary generation failed:', error);
      return '';
    }
  };

  const autoSaveMetadata = async (assetToSave, metadata) => {
    const assetId = assetToSave?.assetId || assetToSave?.id;
    if (!assetId) return;

    const { tags } = extractMetadataDetails(metadata); // const { tags, celebrities } before celebrity removal
    const summary = await generateSummaryFromTags(tags, assetToSave, metadata); // generateSummaryFromTags(tags, celebrities, ...) before celebrity removal

    if (!tags.length && !summary) {
      return;
    }

    // Match the Library flow: prefer the AI-derived title over the local/original filename.
    const aiTitle = await generateAITitleFromSummary(summary);

    const payload = {
      assetId,
      title: aiTitle || assetToSave?.fileName || assetToSave?.name || '',
      summary,
      tags,
      // celebrities, // removed: celebrity detection feature deprecated
    };

    try {
      const response = await apiFetch(`${env.backendApi}/api/assets/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to auto save metadata (${response.status})`);
      }

      setLocalAssets((prev) =>
        prev.map((item) => {
          const currentId = item?.assetId || item?.id;
          if (currentId === assetId) {
            return { ...item, ...payload };
          }
          return item;
        }),
      );

      setSelectedAsset((prevSelected) => {
        if (!prevSelected) return prevSelected;

        const selectedId = prevSelected?.assetId || prevSelected?.id;
        if (selectedId === assetId) {
          return { ...prevSelected, ...payload };
        }

        return prevSelected;
      });
    } catch (error) {
      console.error('Auto metadata save failed:', error);
    }
  };

  const fetchAndSaveMetadata = async (assetToSave) => {
    const assetId = assetToSave?.assetId || assetToSave?.id;
    if (!assetId) return;

    try {
      const response = await apiFetch(`${env.backendApi}/api/extractMetadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          // ...(user?.role && { 'x-user-role': user.role }),
          // ...(user?.id && { 'x-user-id': user.id }),
        },
        body: JSON.stringify({
          assetId,
          userId: assetToSave?.userId || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata (${response.status})`);
      }

      const metadata = await response.json();

      await autoSaveMetadata(assetToSave, metadata);
    } catch (error) {
      console.error('Auto metadata fetch failed:', error);
    }
  };

  // merge assets + local uploads and apply in-session overrides (e.g. caption/description edits)
  const allAssets = useMemo(() => {
    const merged = [...(assets || []), ...localAssets];

    return merged.map((asset) => {
      const id = asset?.assetId || asset?.id;
      if (!id || !assetOverrides[id]) return asset;
      return { ...asset, ...assetOverrides[id] };
    });
  }, [assets, localAssets, assetOverrides]);
  const {
    dateUpdatedValue,
    handleDateUpdatedChange,
    fileTypeValue,
    setFileTypeValue,
    sortByValue,
    setSortByValue,
    showCustomDate,
    dateRangeValue,
    setDateRangeValue,
    stableDataSource,
  } = useAssetFilters(allAssets, {
    searchValue,
    setSearchValue,
  });

  const gridHeight = useMemo(getGridHeight, []);

  useEffect(() => {
    if (isModalOpen) {
      setCurrentView('library');
    } else {
      setShowFocalEditor(false);
      setSelectedAsset(null);
      setSelectedImageUrl(null);
    }
  }, [isModalOpen]);

  const openAsset = (asset) => {
    setSelectedAsset(asset);

    const assetUrl = asset.previewUrl || asset.url || asset.fileUrl;
    const fileType = (asset.type || asset.fileType || '').toLowerCase();
    const isImage = fileType.startsWith('image') || /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(assetUrl || '');

    if (isImage) {
      setSelectedImageUrl(assetUrl);
      setShowFocalEditor(true);   // ALWAYS open focal editor
    } else if (assetUrl) {
      onImageSelect(assetUrl, asset);
      setShowFocalEditor(false);
    } else {
      setShowFocalEditor(false);
    }
  };


  const handleShowUpload = () => {
    setCurrentView('upload');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      // Step 1: Request a presigned S3 upload URL
      const result = await apiFetch(`${env.backendApi}/api/uploadAsset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          // ...(user?.role && { 'x-user-role': user.role }),
          // ...(user?.id && { 'x-user-id': user.id }),
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });
      if (!result.ok) throw new Error(`Failed to get upload URL (${result.status})`);

      const { uploadUrl, fileUrl } = await result.json();
      // Step 2: Upload file directly to S3
      const s3Upload = await apiFetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      console.log('Step 2 status (S3):', s3Upload.status);
      if (!s3Upload.ok) throw new Error(`S3 upload failed (${s3Upload.status})`);

      // Step 3: Save asset metadata in backend DB
      const assetResponse = await apiFetch(`${env.backendApi}/api/assets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileUrl,
          userId: user?.userId,
          uploadedBy: user?.userName,
        }),
      });
      if (!assetResponse.ok) throw new Error(`Failed to save asset metadata (${assetResponse.status})`);
      const assetData = await assetResponse.json();
      // Step 4: Update UI and open Focal Editor
      const newAsset = assetData?.data || {
        fileName: file.name,
        fileUrl,
        fileType: file.type,
      };

      setLocalAssets((prev) => [newAsset, ...prev]);
      setSelectedAsset(newAsset);
      setSelectedImageUrl(fileUrl);
      setShowFocalEditor(true);
      setCurrentView('library');

      await fetchAndSaveMetadata(newAsset);

    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleImageSave = async (editedUrl, focalPoint, caption) => {
    try {
      const trimmedCaption = typeof caption === 'string' ? caption.trim() : '';
      const payload = {
        image: editedUrl,
        imageFocalPoint: focalPoint,
      };
      if (trimmedCaption) {
        payload.mediaCaption = trimmedCaption;
        payload.mediaAltText = trimmedCaption
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '_')
          .trim();
      }

      // ONLY update story details if this is the FEATURED IMAGE context
      if (isFeaturedImage && storyId) {
        try {
          const res = await apiFetch(
            `${env.backendApi}/api/updateStory?storyId=${storyId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(user?.token && { Authorization: `Bearer ${user.token}` }),
              },
              body: JSON.stringify(payload),
            }
          );

          if (!res.ok) {
            console.warn(`Direct updateStory returned ${res.status}`);
          } else {
            const responseData = await res.json();
            console.log('Story (Featured Image) updated successfully:', responseData);
          }
        } catch (updateErr) {
          console.warn('Direct story update error in AssetModal:', updateErr);
        }
      }

      const targetAssetId = selectedAsset?.assetId || selectedAsset?.id;
      const existingAssetCaption = getAssetCaption(selectedAsset);

      // Seed the library caption only the first time. Later featured-image edits should stay story-specific.
      if (trimmedCaption && targetAssetId && !existingAssetCaption) {
        try {
          const assetUpdatePayload = {
            assetId: targetAssetId,
            caption: trimmedCaption,
            userId: user?.id || user?.userId || '', // Include userId just in case backend expects it
          };

          const assetResponse = await apiFetch(`${env.backendApi}/api/assets/update`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify(assetUpdatePayload),
          });

          if (!assetResponse.ok) {
            console.warn(`Asset caption sync failed (${assetResponse.status})`);
          } else {
            setLocalAssets((prev) =>
              prev.map((item) => {
                const currentId = item?.assetId || item?.id;
                if (currentId === targetAssetId) {
                  return {
                    ...item,
                    caption: trimmedCaption,
                  };
                }
                return item;
              }),
            );

            setAssetOverrides((prev) => ({
              ...prev,
              [targetAssetId]: {
                caption: trimmedCaption,
              },
            }));

            setSelectedAsset((prevSelected) => {
              if (!prevSelected) return prevSelected;
              const selectedId = prevSelected?.assetId || prevSelected?.id;
              if (selectedId !== targetAssetId) return prevSelected;

              return {
                ...prevSelected,
                caption: trimmedCaption,
              };
            });
          }
        } catch (assetUpdateError) {
          console.error('Error syncing caption to asset caption field:', assetUpdateError);
        }
      }

      setSelectedImageUrl(editedUrl);
      // Pass focal point to parent callback
      onImageEditSave?.(editedUrl, selectedAsset, focalPoint, trimmedCaption);
      setShowFocalEditor(false);
    } catch (err) {
      console.error('Error updating story image :', err);
    }
  };

  const renderContent = () => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading assets</div>;

    if (currentView === 'upload') {
      return (
        <div className="flex-1 flex flex-col">
          <div className="p-2 bg-white">
            <BackToDashboardButton
              onClick={() => setCurrentView('library')}
              label="Back to Media"
              shortLabel="Media"
              className="ml-10 mt-1"
            />
          </div>
          <UploadComponent onFileUpload={handleFileUpload} />
        </div>
      );
    }

    return (
      <div className="bg-white h-full relative flex">
        <div className="flex-1 flex flex-col w-full h-full">
          {/* MOBILE VIEW (matches AssetLibrary mobile responsive behavior) */}
          <div className="md:hidden flex flex-1 pt-0 flex-col font-sans px-4 pb-0 h-full overflow-hidden">
            <div className="flex-1 min-h-0">

              <AssetFilterBar
                accordionArrowTemplate={accordionArrowTemplate}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                dateUpdatedValue={dateUpdatedValue}
                onDateUpdatedChange={handleDateUpdatedChange}
                showCustomDate={showCustomDate}
                dateRangeValue={dateRangeValue}
                onDateRangeChange={setDateRangeValue}
                fileTypeValue={fileTypeValue}
                onFileTypeChange={setFileTypeValue}
                sortByValue={sortByValue}
                onSortByChange={setSortByValue}
                onShowUpload={handleShowUpload}
              />

              <AssetGrid
                assets={stableDataSource}
                onAssetSelect={openAsset}
                onDelete={deleteAsset}
                gridHeight={"calc(100% - 60px)"}
              />

            </div>
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden md:flex flex-1 min-h-0 flex-col">
            <AssetFilterBar
              accordionArrowTemplate={accordionArrowTemplate}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              dateUpdatedValue={dateUpdatedValue}
              onDateUpdatedChange={handleDateUpdatedChange}
              showCustomDate={showCustomDate}
              dateRangeValue={dateRangeValue}
              onDateRangeChange={setDateRangeValue}
              fileTypeValue={fileTypeValue}
              onFileTypeChange={setFileTypeValue}
              sortByValue={sortByValue}
              onSortByChange={setSortByValue}
              onShowUpload={handleShowUpload}
            />

            <AssetGrid
              assets={stableDataSource}
              onAssetSelect={openAsset}
              onDelete={deleteAsset}
              gridHeight={gridHeight}
            />
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className={`relative w-full h-full min-h-0 flex flex-col overflow-hidden ${showFocalEditor ? 'focal-editor-active' : ''}`}>
      <AssetModalStyles />
      {showFocalEditor && selectedAsset ? (
        <ImageFocalEditor
          imageUrl={selectedImageUrl}
          assetId={selectedAsset.assetId}
          onClose={() => setShowFocalEditor(false)}
          onSave={handleImageSave}
          initialFocalPoint={initialFocalPoint}
          isFeaturedImage={isFeaturedImage}
          initialCaption={getInitialEditorCaption(selectedAsset)}
        />
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default AssetModal;
