// src/components/common/DAM/AssetDetailView.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import AssetDrawer from './Drawer/AssetDrawer';
import AssetHeader from './AssetHeader';
import AssetPreview from './AssetPreview';
import toast from 'react-hot-toast';
import { useVideoAnalysisPolling } from '../../../hooks/useVideoAnalysisPolling';
import { useFaceSearch } from '../../../hooks/useSearchFace';
import env from '@/utils/env';
import apiFetch from '../../../utils/api';
import { UserContext } from '@/context/UserContext';

const AssetDetailView = ({ asset, onBack, onAssetUpdate }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [openMetaBar, setOpenMetaBar] = useState(true);
    const [title, setTitle] = useState(asset?.name || "");
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [isCaptionMissing, setIsCaptionMissing] = useState(false);
    const drawerRef = useRef(null);

    const metadataStartedRef = useRef(false);

    const userContext = useContext(UserContext);
    const user = userContext?.user;

    const { videoStatus, isPolling, startPolling, stopPolling } = useVideoAnalysisPolling();
    const { searchFaceByImage, addFaceToCollection, loading: faceLoading } = useFaceSearch();

    const handleAssetSaveSuccess = (updatedAsset) => {
        console.log("Asset updated in detail view:", updatedAsset);
        if (updatedAsset?.name) {
            setTitle(updatedAsset.name);
        }
        if (onAssetUpdate) {
            onAssetUpdate(updatedAsset);
        }
    };

    const handleSaveThumbnail = async () => {
        if (!selectedThumbnail) {
            toast.error('Please select a thumbnail first');
            return;
        }

        try {
            const response = await apiFetch(`${env.backendApi}/api/selectThumbnail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                },
                body: JSON.stringify({
                    assetId: asset.assetId || asset.id,
                    selectedThumbnail: {
                        url: selectedThumbnail.url || selectedThumbnail,
                        timepoint: selectedThumbnail.timepoint || null
                    },
                    thumbnailType: selectedThumbnail.type === 'custom' ? 'custom' : 'auto'
                }),
            });

            if (!response.ok) throw new Error(`Failed to save thumbnail: ${response.status}`);
            toast.success('Thumbnail saved successfully!');
            handleAssetSaveSuccess({ ...asset });
        } catch (err) {
            toast.error(err.message);
            console.error(err);
        }
    };

    // Search faces in asset image
    const handleSearchFaces = async () => {
        if (!metadata?.previewUrl) {
            toast.error('Image not loaded yet');
            return;
        }

        try {
            toast.loading('🔍 Searching for faces...');
            const results = await searchFaceByImage({
                s3Key: metadata.previewUrl,
                collectionId: 'OpenPress-faces',
                maxFaces: 10,
                threshold: 80,
            });

            toast.dismiss();
            if (results.length > 0) {
                toast.success(`✅ Found ${results.length} matching face(s)`);
            } else {
                toast.error('No matching faces found');
            }
        } catch (err) {
            toast.dismiss();
            toast.error(err.message);
        }
    };

    // Add face to collection from asset
    const handleAddFaceToCollection = async () => {
        if (!metadata?.previewUrl) {
            toast.error('Image not loaded yet');
            return;
        }

        const personName = prompt('Enter person name (e.g., John_Doe):');
        if (!personName) return;

        try {
            toast.loading('Adding face to collection...');
            await addFaceToCollection({
                s3Key: metadata.previewUrl,
                personName: personName.replace(/\s+/g, '_'),
                collectionId: 'OpenPress-faces',
            });

            toast.dismiss();
            toast.success(`✅ Face "${personName}" added successfully`);
        } catch (err) {
            toast.dismiss();
            toast.error(err.message);
        }
    };

    // Extract metadata
    useEffect(() => {
        const extractMetadata = async () => {
            if (!asset?.assetId && !asset?.id) return;

            if (metadataStartedRef.current) return;
            metadataStartedRef.current = true;

            setLoading(true);
            setError(null);

            try {
                const response = await apiFetch(
                    `${env.backendApi}/api/extractMetadata`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                        },
                        body: JSON.stringify({
                            assetId: asset.assetId || asset.id,
                            userId: asset.userId || '',
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setMetadata(data);

                if (data.assetType === 'video') {
                    console.log("📹 Video detected, starting polling...");
                    startPolling(asset.assetId || asset.id, 30000);
                    //   toast.loading('📹 Video analysis started...');
                }
            } catch (err) {
                setError(err.message);
                metadataStartedRef.current = false;
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        extractMetadata();

        return () => {
            metadataStartedRef.current = false;
            stopPolling();
        };
    }, [asset?.assetId, asset?.id]);

    const handleBack = () => {
        if (drawerRef.current) {
            drawerRef.current.handleSaveAndClose();
        } else {
            onBack();
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col">
            <AssetHeader asset={asset} onBack={handleBack} title={title} preview={false} />

            {isPolling && (
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex justify-between items-center">
                    <p className="text-sm text-blue-700">
                        📹 Video analysis in progress... (Status: {videoStatus?.status})
                    </p>
                    <button
                        onClick={stopPolling}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Stop
                    </button>
                </div>
            )}

            {!isPolling && videoStatus?.analysis?.labels?.status === 'SUCCEEDED' && (
                <div className="bg-green-50 border-b border-green-200 px-6 py-3">
                    <p className="text-sm text-green-700">✅ Analysis completed successfully!</p>
                </div>
            )}

            {videoStatus?.status === 'completed' && (
                <div className="bg-green-50 border-b border-green-200 px-6 py-3">
                    <p className="text-sm text-green-700">✅ Video processing completed!</p>
                </div>
            )}


            {videoStatus?.status === 'completed' && (
                <div className="bg-green-50 border-b border-green-200 px-6 py-3">
                    <p className="text-sm text-green-700">✅ Video analysis completed successfully!</p>
                </div>
            )}

            <div className="flex flex-1 h-0 flex-col md:flex-row">
                <div className="flex flex-col w-full p-6 overflow-y-auto">
                    <AssetPreview
                        asset={asset}
                        metadata={metadata}
                        selectedThumbnail={selectedThumbnail}
                        setSelectedThumbnail={setSelectedThumbnail}
                    />

                    {metadata?.assetType === 'image' && (
                        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
                            <h3 className="font-semibold mb-3 text-gray-700">Face Recognition</h3>
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={handleSearchFaces}
                                    disabled={faceLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {faceLoading ? '🔍 Searching...' : '🔍 Search Faces'}
                                </button>
                                <button
                                    onClick={handleAddFaceToCollection}
                                    disabled={faceLoading}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    {faceLoading ? '➕ Adding...' : '➕ Add Face to Collection'}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {openMetaBar ? (
                    <div className="w-full md:w-[462px] bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col">
                        <AssetDrawer
                            ref={drawerRef}
                            asset={asset}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            setOpenMetaBar={setOpenMetaBar}
                            title={title}
                            setTitle={setTitle}
                            showSaveButton={true}
                            onSaveSuccess={handleAssetSaveSuccess}
                            handleCloseDrawer={onBack}
                            apiMetadata={metadata?.assetType === 'video' ? videoStatus : metadata}
                            onSaveThumbnail={handleSaveThumbnail}
                            preview={false}
                            onValidationChange={setIsCaptionMissing}
                        />
                    </div>
                ) : (
                    <div className="h-full flex justify-center">
                        <button
                            onClick={() => setOpenMetaBar(true)}
                            className="group w-full p-2 h-10 flex items-center justify-center hover:bg-black transition-colors"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-gray-600 group-hover:text-white transition-colors"
                            >
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetDetailView;
