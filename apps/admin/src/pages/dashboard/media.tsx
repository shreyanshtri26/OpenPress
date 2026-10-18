import React, { useContext, useState } from 'react';
import { toast } from 'react-hot-toast';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
import { UserContext } from '../../context/UserContext';
import {
  AdminDashboardLayout,
  AdminMobileSidebarToggle,
} from '../../components/SideBar/AdminDashboardLayout';
import UploadComponent from '../../components/common/DAM/UploadComponent';
import AssetDetailView from '../../components/common/DAM/AssetDetailView';
import AssetLibrary from '../../components/common/DAM/AssetLibrary';
import BackToDashboardButton from '../../components/common/BackToDashboardButton';

type MediaLibraryView = 'library' | 'upload' | 'detail';

interface AssetRecord {
  [key: string]: unknown;
}

interface UploadAssetResponse {
  uploadUrl: string;
  fileUrl: string;
}

interface AssetCreateResponse {
  data: AssetRecord;
}

function MediaPage() {
  const [currentView, setCurrentView] = useState<MediaLibraryView>('library');
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    try {
      // 1. Request pre-signed URL
      const result = await apiFetch(
        `${env.backendApi}/api/uploadAsset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        },
      );

      if (!result.ok) throw new Error('Failed to get pre-signed URL');

      const { uploadUrl, fileUrl }: UploadAssetResponse = await result.json();

      // 2. Upload file directly to S3
      const uploadResponse = await apiFetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('S3 upload failed');

      toast.success(`File uploaded successfully!`);

      // 3. Save asset metadata to your database
      const assetResponse = await apiFetch(
        `${env.backendApi}/api/assets/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileUrl: fileUrl,
          }),
        },
      );
      if (!assetResponse.ok) throw new Error('Failed to save asset metadata');

      const newAsset: AssetCreateResponse = await assetResponse.json();

      // Refresh library and switch view
      setSelectedAsset(newAsset.data);
      setCurrentView('detail');
    } catch (error) {
      console.error('Error uploading file:', error);
      const message =
        error instanceof Error ? error.message : 'File upload failed.';
      toast.error(message);
    }
  };

  const handleBackToLibrary = () => {
    setCurrentView('library');
    setSelectedAsset(null);
  };

  const handleShowUpload = () => {
    setCurrentView('upload');
  };

  // Render different views based on state
  const renderCurrentView = () => {
    switch (currentView) {
      case 'upload':
        return (
          <>
            <div className="p-4 bg-white border-b">
              <BackToDashboardButton
                onClick={handleBackToLibrary}
                label="Back to Media"
                shortLabel="Media"
                className="mb-2"
              />
            </div>
            <UploadComponent onFileUpload={handleFileUpload} />
          </>
        );
      case 'detail':
        if (!selectedAsset) {
          return (
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                No asset selected. Return to Media to pick an asset.
              </p>
              <BackToDashboardButton
                onClick={handleBackToLibrary}
                label="Back to Media"
                shortLabel="Media"
              />
            </div>
          );
        }
        return (
          <AssetDetailView
            asset={selectedAsset}
            onBack={handleBackToLibrary}
            onAssetUpdate={(updatedAsset: AssetRecord) => {
              setSelectedAsset(updatedAsset);
              console.log("Asset updated in MediaPage:", updatedAsset);
            }}
          />
        );


      case 'library':
      default:
        return (
          <>
            <div className="p-4 bg-white border-b flex justify-between items-center">
              <h1 className="text-xl font-semibold">
                Digital Asset Management
              </h1>
              <button
                onClick={handleShowUpload}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload New Asset
              </button>
            </div>
            <AssetLibrary />
          </>
        );
    }
  };

  return (
    <AdminDashboardLayout
      onShowDashboard={() => setCurrentView('library')}
      onShowAllStories={() => setCurrentView('library')}
      onShowMediaLibrary={() => setCurrentView('library')}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <AdminMobileSidebarToggle />
        {renderCurrentView()}
      </div>
    </AdminDashboardLayout>
  );
}

// Set permissions for the AuthGuard in _app.js
MediaPage.auth = {
  roles: ['admin', 'editor', 'journalist'],
};

export default MediaPage;
