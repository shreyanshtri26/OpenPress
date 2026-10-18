import PropTypes from 'prop-types';
import { Image } from 'lucide-react';

const EmptyState = ({ hasActiveFilters = false }) => (
  <div className="flex h-full w-full items-center justify-center text-sm text-gray-600 font-sans">
    <div className="flex flex-col items-center">
      <Image className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
      <p className="text-gray-500 mb-4">
        {hasActiveFilters ? 'No assets match your current filters' : 'Upload your first asset to get started'}
      </p>
    </div>
  </div>
);

EmptyState.propTypes = {
  hasActiveFilters: PropTypes.bool,
};

export default EmptyState;
