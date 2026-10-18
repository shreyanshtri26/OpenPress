import React from 'react';
import CustomButton from '../common/CustomButton';

/**
 * CampaignStatusFilters component
 * Renders filter buttons for campaign status selection
 *
 * @param {Object} props
 * @param {Array} props.filters - Array of CampaignFilter objects with key and label
 * @param {string} props.activeFilter - Currently active filter key ('all', 'active', 'paused', 'expired')
 * @param {Function} props.onSelect - Callback function when a filter is selected
 */
export default function CampaignStatusFilters({
  filters,
  activeFilter,
  onSelect,
}) {
  return (
    <div
      role="tablist"
      aria-label="Campaign status filters"
      className="flex flex-wrap gap-2 sm:gap-3"
    >
      {filters.map((filter) => (
        <CustomButton
          key={filter.key}
          onClick={() => onSelect(filter.key)}
          variant={activeFilter === filter.key ? 'black' : 'white'}
          disableHover
          className="text-xs sm:text-sm py-2 px-3 sm:px-4"
        >
          {filter.label}
        </CustomButton>
      ))}
    </div>
  );
}
