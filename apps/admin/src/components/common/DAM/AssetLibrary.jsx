import { useCallback, useState } from 'react';

import useAssetLibraryData from './hooks/useAssetLibraryData';
import AssetLibraryStyles from './asset-library/AssetLibraryStyles';
import AssetGrid from './asset-library/AssetGrid';
import AssetLibraryDrawer from './asset-library/AssetLibraryDrawer';
import toast from 'react-hot-toast';
import { useAdminLayout } from '../../SideBar/AdminDashboardLayout';

import {
  AssetLibraryDesktopHeader,
  AssetLibraryMobileHeader,
} from './asset-library/AssetLibraryHeader';
import ConfirmationModal from '../ConfirmationModal';

const AssetLibrary = ({
  searchValue = '',
  dateUpdatedValue = 'all',
  fileTypeValue = 'all',
  sortByValue = 'newest',
  dateRangeValue = null,
  onSearchChange = (value) => { },
  onDateUpdatedChange = (value) => { },
  onFileTypeChange = (value) => { },
  onSortByChange = (value) => { },
  onDateRangeChange = (value) => { },
  onShowUpload = () => { },
  showCustomDate = false,
  dateUpdatedOptions = [{ value: '', text: '' }],
  fileTypeOptions = [{ value: '', text: '' }],
  sortByOptions = [{ value: '', text: '' }],
  accordionArrowTemplate = (_, buttonElement) => { }
}) => {
  // Try to get sidebar toggle function if available (when used in AdminDashboardLayout)
  let toggleSidebar;
  try {
    const adminLayout = useAdminLayout();
    toggleSidebar = adminLayout?.toggleSidebar;
  } catch (error) {
    // Component is being used outside AdminDashboardLayout, that's okay
    toggleSidebar = undefined;
  }

  const {
    loading,
    error,
    cardViewRef,
    stableDataSource,
    fetchAssets,
    deleteAsset,
    handleAssetUpdate,
  } = useAssetLibraryData({
    searchValue,
    dateUpdatedValue,
    fileTypeValue,
    sortByValue,
    dateRangeValue,
  });

  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  const openDrawerWithAsset = useCallback((asset) => {
    setSelectedAsset(asset);
    setDrawerOpened(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpened(false);
    setSelectedAsset(null);
  }, []);

  const handleDeleteRequest = useCallback((assetId) => {
    setAssetToDelete(assetId);
    setDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (assetToDelete) {
      deleteAsset(assetToDelete);
      setDeleteModalOpen(false);
      setAssetToDelete(null);
    }
  }, [assetToDelete, deleteAsset]);

  const handleAssetUpdated = useCallback((updatedAsset) => {
    handleAssetUpdate(updatedAsset);
    setSelectedAsset(updatedAsset);
  }, [handleAssetUpdate]);

  const handleSearchSubmit = useCallback((query) => {
    if (!query || !query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    // Update search value - this will trigger AI search in useAssetLibraryData
    onSearchChange(query);

    // Trigger fetch with AI query
    fetchAssets();
  }, [onSearchChange, fetchAssets]);



  return (
    <>
      <AssetLibraryStyles />
      <div className="bg-white flex-1 min-h-0 relative flex">
        <div className="flex flex-col transition-all duration-300 ease-in-out flex-1">
          <div className="hidden md:flex flex-1 pt-0 flex-col font-sans px-0 pb-0 h-full overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col">
              <AssetLibraryDesktopHeader
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                onSearchSubmit={handleSearchSubmit}
                dateUpdatedOptions={dateUpdatedOptions}
                dateUpdatedValue={dateUpdatedValue}
                onDateUpdatedChange={onDateUpdatedChange}
                showCustomDate={showCustomDate}
                dateRangeValue={dateRangeValue}
                onDateRangeChange={onDateRangeChange}
                fileTypeOptions={fileTypeOptions}
                fileTypeValue={fileTypeValue}
                onFileTypeChange={onFileTypeChange}
                sortByOptions={sortByOptions}
                sortByValue={sortByValue}
                onSortByChange={onSortByChange}
                onShowUpload={onShowUpload}
                accordionArrowTemplate={accordionArrowTemplate}
              />
              <AssetGrid
                cardViewRef={cardViewRef}
                dataSource={stableDataSource}
                loading={loading}
                error={error}
                onRetry={fetchAssets}
                onCardClick={openDrawerWithAsset}
                onDelete={handleDeleteRequest}
                searchValue={searchValue}
                fileTypeValue={fileTypeValue}
                dateUpdatedValue={dateUpdatedValue}
                dateRangeValue={dateRangeValue}
                sortByValue={sortByValue}
              />
            </div>
          </div>

          <div className="md:hidden flex flex-1 pt-0 flex-col font-sans px-0 pb-0 h-full overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col">
              <AssetLibraryMobileHeader
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                onSearchSubmit={handleSearchSubmit}
                dateUpdatedOptions={dateUpdatedOptions}
                dateUpdatedValue={dateUpdatedValue}
                onDateUpdatedChange={onDateUpdatedChange}
                showCustomDate={showCustomDate}
                dateRangeValue={dateRangeValue}
                onDateRangeChange={onDateRangeChange}
                fileTypeOptions={fileTypeOptions}
                fileTypeValue={fileTypeValue}
                onFileTypeChange={onFileTypeChange}
                sortByOptions={sortByOptions}
                sortByValue={sortByValue}
                onSortByChange={onSortByChange}
                onShowUpload={onShowUpload}
                accordionArrowTemplate={accordionArrowTemplate}
                onToggleSidebar={toggleSidebar}
              />
              <AssetGrid
                cardViewRef={cardViewRef}
                dataSource={stableDataSource}
                loading={loading}
                error={error}
                onRetry={fetchAssets}
                onCardClick={openDrawerWithAsset}
                onDelete={handleDeleteRequest}
                searchValue={searchValue}
                fileTypeValue={fileTypeValue}
                dateUpdatedValue={dateUpdatedValue}
                dateRangeValue={dateRangeValue}
                sortByValue={sortByValue}
              />
            </div>
          </div>
        </div>

        <AssetLibraryDrawer
          isOpen={drawerOpened}
          selectedAsset={selectedAsset}
          setDrawerOpened={setDrawerOpened}
          accordionArrowTemplate={accordionArrowTemplate}
          onAssetUpdate={handleAssetUpdated}
          onClose={handleCloseDrawer}
        />

        <ConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Asset"
          message="Are you sure you want to delete this asset? This action cannot be undone."
          confirmText="Delete"
          isDestructive={true}
        />

      </div>
    </>
  );
};

export default AssetLibrary;
