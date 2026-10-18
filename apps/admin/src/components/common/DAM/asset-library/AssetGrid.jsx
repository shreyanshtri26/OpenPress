import PropTypes from 'prop-types';
import { useCallback, useEffect } from 'react';
import CardView, {
  Column,
  HeaderPanel,
  Pager,
  Paging,
  SearchPanel,
  Selection,
  Sorting,
} from '@/components/ui/dx/card-view';

import AssetCard from './AssetCard';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingState from './LoadingState';

const AssetGrid = ({
  cardViewRef,
  dataSource,
  loading,
  error = null,
  onRetry,
  onCardClick,
  onDelete,
  searchValue = '',
  fileTypeValue = 'all',
  dateUpdatedValue = 'all',
  dateRangeValue = null,
  sortByValue = 'newest',
}) => {
  const hasActiveFilters = Boolean(
    searchValue || fileTypeValue !== 'all' || dateUpdatedValue !== 'all'
  );

  // ✅ ADD THIS: Check for AI search with no results
  const isAISearch = searchValue && searchValue.trim().length > 0;
  const hasNoResults = !loading && !error && dataSource.length === 0 && isAISearch;
  const dateRangeKey = Array.isArray(dateRangeValue)
    ? dateRangeValue.map((date) => date instanceof Date ? date.getTime() : '').join('-')
    : '';

  const renderCard = useCallback(
    (cardRenderData) => {
      const asset =
        cardRenderData?.data ??
        cardRenderData?.card?.data ??
        cardRenderData?.itemData ??
        null;

      return (
        <AssetCard asset={asset} onOpen={onCardClick} onDelete={onDelete} />
      );
    },
    [onCardClick, onDelete]
  );

  const handleItemClick = useCallback((e) => {
    if (onCardClick) {
      onCardClick(e.itemData);
    }
  }, [onCardClick]);

  // CardView is remounted (via its `key`) whenever a filter changes, which can
  // happen while its container is mid-reflow (e.g. the date-filter dropdown
  // collapsing), so it can initialize with a stale/zero layout. CardView is a
  // DataGrid-family widget, so per DevExtreme's guidance the correct recovery
  // call is `updateDimensions()`. Do NOT call `repaint()` here - for widgets
  // using a custom cardRender template, repaint() is what triggers DevExtreme's
  // React 18/19 bug where each card is rendered twice.
  useEffect(() => {
    const instance = cardViewRef?.current?.instance?.();
    if (!instance) {
      return undefined;
    }

    const frameId = requestAnimationFrame(() => {
      instance.updateDimensions?.();
    });

    return () => cancelAnimationFrame(frameId);
  }, [cardViewRef, dateUpdatedValue, dataSource.length]);

  if (loading) {
    return (
      <div className="flex-1 h-full min-h-[50vh] flex flex-col pt-2 overflow-visible relative">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (hasNoResults) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16">
        <div className="max-w-md">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <p className="text-lg font-semibold text-gray-700 mb-2">
            No matching assets found
          </p>

          <p className="text-sm text-gray-500 mb-4">
            AI couldn't find assets matching
            <span className="font-medium"> "{searchValue}"</span>
          </p>

          <div className="text-xs text-gray-400 space-y-1">
            <p className="font-medium mb-2">Try:</p>
            <p>• Using different keywords</p>
            <p>• Being more specific</p>
            <p>• Being more general</p>
            <p>• Checking spelling</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col pt-2 overflow-hidden">
      <CardView
        key={`asset-grid-${dateUpdatedValue}-${dateRangeKey}-${fileTypeValue}-${sortByValue}-${searchValue}`}
        ref={cardViewRef}
        dataSource={dataSource}
        keyExpr="assetId"
        cardMinWidth={265}
        height="100%"
        className="asset-grid"
        cardsPerRow="auto"
        cardRender={renderCard}
        // noDataRender={() => <EmptyState hasActiveFilters={hasActiveFilters} />}
        noDataRender={() => (
        <div className="flex items-center justify-center min-h-[50vh] w-full">
        <EmptyState hasActiveFilters={hasActiveFilters} />
        </div>
        )}

        onItemClick={handleItemClick}
      >
        <HeaderPanel visible={false} />
        <Paging pageSize={8} />
        <Pager
          showInfo
          showNavigationButtons
          displayMode="full"
          showPageSizeSelector={false}
        />
        <Sorting mode="single" allowUnsort />
        <SearchPanel visible={false} />
        <Selection mode="none" />

        <Column dataField="name" caption="Asset Name" />
        <Column dataField="type" caption="File Type" />
        <Column dataField="state" caption="State" />
        <Column dataField="createdAt" caption="Date Added" dataType="date" />
        <Column dataField="size" caption="File Size" />
      </CardView>
    </div>
  );
};

AssetGrid.propTypes = {
  cardViewRef: PropTypes.shape({ current: PropTypes.any }),
  dataSource: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  onCardClick: PropTypes.func,
  onDelete: PropTypes.func,
  searchValue: PropTypes.string,
  fileTypeValue: PropTypes.string,
  dateUpdatedValue: PropTypes.string,
  dateRangeValue: PropTypes.array,
  sortByValue: PropTypes.string,
};

export default AssetGrid;