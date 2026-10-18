import React from 'react';
import BackToDashboardButton from '../../common/BackToDashboardButton';

interface AllStoriesHeaderProps {
  onBack: () => void;
}

export function AllStoriesHeader({ onBack }: AllStoriesHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200/80 px-4 sm:px-6 py-3 sm:py-3.5 backdrop-blur-md">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <BackToDashboardButton onClick={onBack} />
      </div>
    </div>
  );
}
