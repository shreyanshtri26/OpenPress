// src/components/dashboard/MediaLibrary.tsx
import React, { useContext, useState } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { toast } from 'react-hot-toast';
import { UserContext } from '../../context/UserContext';
import UploadComponent from '../common/DAM/UploadComponent';
import AssetDetailView from '../common/DAM/AssetDetailView';
import AssetLibrary from '../common/DAM/AssetLibrary';
import { ErrorBoundary } from '../common/ErrorBoundary';
import BackToDashboardButton from '../common/BackToDashboardButton';
// import UploadAsset from '../common/DAM/upload-asset/UploadAsset';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
// Import DevExpress components
import TextBox from '@/components/ui/kit/text-box';
import SelectBox from '@/components/ui/kit/select-box';
import DateRangeBox from '@/components/ui/kit/date-range-box';
import CustomButton from "../../components/common/CustomButton";

type MediaLibraryView = 'library' | 'upload' | 'detail';

interface AssetRecord {
  [key: string]: unknown;
}

interface MediaLibraryProps {
  onBack?: () => void;
}

interface UploadAssetResponse {
  uploadUrl: string;
  fileUrl: string;
}

interface AssetMetadataResponse {
  data: AssetRecord;
}

// Filter options data
const dateUpdatedOptions = [
  { value: 'all', text: 'All time' },
  { value: 'last7days', text: 'Last 7 days' },
  { value: 'last30days', text: 'Last 30 days' },
  { value: 'last90days', text: 'Last 90 days' },
  { value: 'custom', text: 'Custom' }
];

const fileTypeOptions = [
  { value: 'all', text: 'All Files' },
  { value: 'image', text: 'Image' },
  { value: 'video', text: 'Video' },
  { value: 'audio', text: 'Audio' }
];

const sortByOptions = [
  { value: 'newest', text: 'Newest first' },
  { value: 'oldest', text: 'Oldest first' }
];

export default function MediaLibrary({ onBack }: MediaLibraryProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<MediaLibraryView>('library');
  const [uploadedAsset, setUploadedAsset] = useState<AssetRecord | null>(null);
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;

  // Filter states
  const [searchValue, setSearchValue] = useState<string>('');
  const [dateUpdatedValue, setDateUpdatedValue] = useState<string>('all');
  const [fileTypeValue, setFileTypeValue] = useState<string>('all');
  const [sortByValue, setSortByValue] = useState<string>('newest');
  const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
  const [dateRangeValue, setDateRangeValue] = useState<any[]>([null, null]);

  // Custom dropdown arrow template for the grid kit SelectBox
  const accordionArrowTemplate = (_: unknown, buttonElement: HTMLElement) => {
    buttonElement.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"
         viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;
  };

  console.log("user>>>>", user);
  const isUserLoading = userContext?.loading ?? true;

  // Handle filter changes
  const handleDateUpdatedChange = (value: string) => {
    setDateUpdatedValue(value);
    if (value !== 'custom') {
      setDateRangeValue([null, null]);
    }
    setShowCustomDate(value === 'custom');
  };

  // This function now handles navigation *within* the media library (e.g., from Upload back to Library)
  const handleBackToLibrary = () => {
    setCurrentView('library');
    setUploadedAsset(null);
  };

  const handleShowUpload = () => {
    setCurrentView('upload');
  };

  const handleFileUpload = async (file: File | null) => {


    if (!file) return;
    try {

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

      if (result.ok) {
        const res: UploadAssetResponse = await result.json();
        const { uploadUrl, fileUrl } = res;
        const answer = await apiFetch(uploadUrl, { // Direct S3 upload, no auth header for backend needed, usually presigned
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (answer.ok) {
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
                userId: user?.userId,
                uploadedBy: user?.userName
              }),
            },
          );

          if (!assetResponse.ok)
            throw new Error('Failed to save asset metadata');

          const assetData: AssetMetadataResponse = await assetResponse.json();
          setUploadedAsset(assetData.data);
          setCurrentView('detail');
        } else {
          throw new Error('S3 upload failed.');
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error uploading file';
      //toast.error('Error uploading file: ' + message);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Loading media...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-medium text-gray-800">
          Please sign in to access media.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
          onClick={() => router.push('/login')}
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Relume-style DevExpress component styling */

        /* Dropdown list styling */

        /* Search input styling */
        .search-input input {
          padding-left: 36px !important;
          height: 40px !important;
        }

        .relume-filter-container input {
          height: 40px !important;
          border-color: #d1d5db !important;
          border-radius: 6px !important;
        }

        .relume-filter-container select {
          height: 42px !important;
          border-color: #d1d5db !important;
          border-radius: 6px !important;
        }

        /* Strip DateRangeBox's own border — the wrapper div provides bottom border */
      `}</style>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {currentView === 'library' && (
          <>
            <div className="flex-1 overflow-auto">
              <ErrorBoundary>
                <AssetLibrary
                  searchValue={searchValue}
                  dateUpdatedValue={dateUpdatedValue}
                  fileTypeValue={fileTypeValue}
                  sortByValue={sortByValue}
                  dateRangeValue={dateRangeValue as any}
                  // Filter change handlers
                  onSearchChange={setSearchValue}
                  onDateUpdatedChange={handleDateUpdatedChange}
                  onFileTypeChange={setFileTypeValue}
                  onSortByChange={setSortByValue}
                  onDateRangeChange={setDateRangeValue}
                  onShowUpload={handleShowUpload}
                  showCustomDate={showCustomDate}
                  // Filter options
                  dateUpdatedOptions={dateUpdatedOptions}
                  fileTypeOptions={fileTypeOptions}
                  sortByOptions={sortByOptions}
                  accordionArrowTemplate={accordionArrowTemplate}
                />
              </ErrorBoundary>
            </div>
          </>
        )}

        {currentView === 'upload' && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-white border-b">
              <BackToDashboardButton
                onClick={handleBackToLibrary}
                label="Back to Media"
                shortLabel="Media"
                className="mb-2 ml-24"
              />
            </div>
            <UploadComponent onFileUpload={handleFileUpload} />
          </div>
        )}
        {currentView === 'detail' && uploadedAsset && (
          <AssetDetailView
            asset={uploadedAsset}
            onBack={handleBackToLibrary}
            onAssetUpdate={(updatedAsset: AssetRecord) => {
              setUploadedAsset(updatedAsset);
              console.log("Asset updated in MediaLibrary:", updatedAsset);
            }}
          />
        )}



      </div>
    </>
  );
}
