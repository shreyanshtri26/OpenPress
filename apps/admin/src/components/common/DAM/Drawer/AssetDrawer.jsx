// src/components/common/DAM/Drawer/AssetDrawer.jsx

import React, { useContext, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import CustomButton from "../../CustomButton";
import AssetTab from "./AssetTab";
import CoreTab from "./CoreTab";
import AssetPreview from '../AssetPreview';
import { useAssetMetadata } from "./useAssetMetadata";
import env from '@/utils/env';
import apiFetch from '../../../../utils/api';
import { UserContext } from "@/context/UserContext";
import toast from 'react-hot-toast';

const AssetDrawer = forwardRef(({
  accordionArrowTemplate = (_, buttonElement) => { },
  setDrawerOpened,
  asset,
  onAssetUpdate,
  handleCloseDrawer,
  preview,
  onValidationChange,
}, ref) => {
  const [sessionId, setSessionId] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [activeTab, setActiveTab] = useState("asset");
  const [assetType, setAssetType] = useState(null);
  const [apiMetadata, setApiMetadata] = useState(null);
  const [loading, setLoading] = useState(false);

  const [mobileDrawerExpanded, setMobileDrawerExpanded] = useState(false);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  // Call the metadata hook for form management
  const {
    formData,
    availableTags,
    // availableCelebrities, // removed: celebrity detection feature deprecated
    isLoading: isMetadataLoading,
    isGeneratingSummary,
    handleInputChange,
    handleSave,
    isSaving,
    isDirty,
  } = useAssetMetadata(asset, apiMetadata);


  const checkAssetType = (asset) => {
    const type = asset?.type || asset?.mimeType || '';
    const fileName = asset?.name || '';
    const fileExt = fileName.toLowerCase().match(/\.([^.]+)$/)?.[1] || '';

    if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(fileExt)) {
      return 'video';
    }

    if (type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'wma'].includes(fileExt)) {
      return 'audio';
    }

    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExt)) {
      return 'image';
    }

    return 'image';
  };

  function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  useEffect(() => {
    if (asset) {
      const type = checkAssetType(asset);
      setAssetType(type);
    }
  }, [asset]);

  const isCaptionMissing = !formData?.caption || !formData.caption.trim();

  const handleSaveAndClose = async () => {
    if (isCaptionMissing) {
      toast.error("Please provide a caption before leaving");
      return false;
    }

    if (!isDirty) {
      handleCloseDrawer();
      return true;
    }

    const success = await handleSave();
    if (success) {
      if (onAssetUpdate) {
        onAssetUpdate({ ...asset, caption: formData.caption });
      }
      handleCloseDrawer();
      return true;
    }
    toast.error("Failed to save changes");
    return false;
  };

  useImperativeHandle(ref, () => ({
    handleSaveAndClose
  }));

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isCaptionMissing);
    }
  }, [isCaptionMissing, onValidationChange]);

  const tabs = useMemo(() => [
    {
      id: "asset",
      label: "Details",
      component: <AssetTab
        asset={asset}
        apiMetadata={apiMetadata}
        formData={formData}
        availableTags={availableTags}
        // availableCelebrities={availableCelebrities} // removed: celebrity detection feature deprecated
        isLoading={isMetadataLoading}
        isGeneratingSummary={isGeneratingSummary}
        handleInputChange={handleInputChange}
      />
    },
    {
      id: "core",
      label: "Core",
      component: <CoreTab
        asset={asset}
        apiMetadata={apiMetadata}
      />
    },
  ],
    [
      asset,
      assetType,
      apiMetadata,
      formData,
      availableTags,
      // availableCelebrities, // removed: celebrity detection feature deprecated
      isMetadataLoading,
      isGeneratingSummary,
      handleInputChange
    ]);

  const renderTabContent = () => {
    const currentTab = tabs.find((tab) => tab.id === activeTab);
    return currentTab?.component;
  };

  // ✅ FETCH REKOGNITION METADATA FOR NEW ASSETS
  async function fetchMetadata(asset) {
    if (!asset?.assetId && !asset?.id) return null;

    try {
      // console.log("🔍 Fetching ImageAnalysis metadata...");

      const response = await apiFetch(
        `${env.backendApi}/api/extractMetadata`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
          body: JSON.stringify({
            assetId: asset.assetId || asset.id,
            userId: asset.userId || ''
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // console.log("✅ ImageAnalysis metadata fetched:", data);
      return data;
    } catch (err) {
      console.error('❌ Error fetching metadata:', err);
      return null;
    }
  }

  // ✅ SMART METADATA LOADING - Check asset first, then fetch if needed
  useEffect(() => {
    if (!asset) return;

    const assetId = asset?.assetId || asset?.id;

    // ✅ Check if asset already has ImageAnalysis data embedded
    const hasImageAnalysis = asset?.imageAnalysis || asset?.analysis;

    if (hasImageAnalysis) {
      console.log("✅ Using embedded ImageAnalysis data from asset");
      const metadataFromAsset = {
        imageAnalysis: asset.imageAnalysis,
        analysis: asset.analysis,
        assetType: checkAssetType(asset),
      };

      setApiMetadata(metadataFromAsset);
      setMetadata(metadataFromAsset);
      setLoading(false);
      return;
    }

    // ✅ No embedded data - fetch from API (for new uploads)
    console.log("📡 No embedded data, fetching from API...");

    (async () => {
      setLoading(true);
      try {
        const data = await fetchMetadata(asset);

        if (data?.assetType === 'video') {
          console.log("📹 VIDEO detected - polling for analysis...");

          const pollForAnalysis = async () => {
            let attempts = 0;
            const maxAttempts = 60;

            const poll = async () => {
              attempts++;
              console.log(`📹 Polling attempt ${attempts}...`);

              try {
                const statusResponse = await apiFetch(
                  `${env.backendApi}/api/asset/status?assetId=${assetId}`,
                  {
                    method: 'GET', headers: {
                      'Content-Type': 'application/json',
                      ...(user?.token && { Authorization: `Bearer ${user.token}` })
                    }
                  }
                );

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  console.log("✅ Video status:", statusData);
                  setApiMetadata(statusData);
                  setMetadata(statusData);

                  if (statusData?.analysis?.labels?.status === 'SUCCEEDED') {
                    console.log("✅ Analysis SUCCEEDED - stopping poll");
                    setLoading(false);
                    return;
                  }
                }

                if (attempts < maxAttempts) {
                  setTimeout(poll, 30000);
                } else {
                  setLoading(false);
                }
              } catch (err) {
                console.error("❌ Polling error:", err);
                setLoading(false);
              }
            };

            poll();
          };

          pollForAnalysis();
        } else {
          // For images
          setApiMetadata(data);
          setMetadata(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ Metadata fetch error:", err);
        setLoading(false);
      }
    })();
  }, [asset?.assetId, asset?.id]);

  return (
    <div className="w-full h-full flex flex-col" style={{ zoom: 0.90 }}>
      {/* Desktop View - Side by side layout */}
      <div className="hidden md:flex flex-1 h-0">
        {preview && (
          <div className="flex-1 p-6 overflow-y-auto">
            <AssetPreview asset={asset} metadata={metadata} showThumbnail={false} />
          </div>
        )}

        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center border-b border-gray-200">
            <div className="flex-1 flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 font-[400] text-center transition-colors text-black
                    ${activeTab === tab.id
                      ? "border-b-2 border-black font-[800]"
                      : "hover:bg-gray-50"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-20">
            {renderTabContent()}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-center z-10">
            <CustomButton
              variant="black"
              className="px-16"
              onClick={handleSaveAndClose}
              disabled={isSaving || isGeneratingSummary || isCaptionMissing}
            >
              {isSaving ? "Saving..." : "Submit"}
            </CustomButton>
          </div>

        </div>
      </div>

      {/* Mobile View - Full image with drawer overlay */}
      <div className="md:hidden relative w-full h-full">
        {preview && (
          <div className="w-full h-full p-6 overflow-y-auto">
            <AssetPreview asset={asset} metadata={metadata} showThumbnail={false} />
          </div>
        )}

        {mobileDrawerExpanded && (
          <div
            className="fixed inset-0 bg-black/40 z-20"
            onClick={() => setMobileDrawerExpanded(false)}
            aria-hidden="true"
          />
        )}

        {!mobileDrawerExpanded && (
          <button
            type="button"
            onClick={() => setMobileDrawerExpanded(true)}
            className="fixed bottom-6 right-6 z-40 rounded-full bg-black text-white p-3 shadow-lg transition hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            aria-label="Open details panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 6 9 12 15 18"></polyline>
            </svg>
          </button>
        )}

        <div
          role="complementary"
          aria-hidden={!mobileDrawerExpanded}
          className={`fixed top-0 right-0 bottom-0 bg-white transform transition-transform duration-300 ease-in-out overflow-hidden z-30 ${mobileDrawerExpanded ? 'translate-x-0' : 'translate-x-full'
            } w-full sm:w-[400px] ${mobileDrawerExpanded ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
        >
          {mobileDrawerExpanded && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200">
                <h2 className="font-bold text-black">Asset Details</h2>
                <button
                  onClick={handleSaveAndClose}
                  className="p-2 hover:bg-gray-100 rounded font-bold text-xl"
                  aria-label="Close drawer"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center border-b border-gray-200">
                <div className="flex-1 flex">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-4 py-3 font-[400] text-center transition-colors text-black
                      ${activeTab === tab.id
                          ? "border-b-2 border-black font-[800]"
                          : "hover:bg-gray-50"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pb-20">
                {renderTabContent()}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-center z-10">
                <CustomButton
                  variant="black"
                  className="px-16"
                  onClick={handleSaveAndClose}
                  disabled={isSaving || isGeneratingSummary || isCaptionMissing}
                >
                  {isSaving ? "Saving..." : "Submit"}
                </CustomButton>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AssetDrawer;
