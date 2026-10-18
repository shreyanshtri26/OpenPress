import React from 'react';
import { Info, Edit, UsersIcon as Versions, BarChart3, Download, Share, FolderPlus } from 'lucide-react';
import BackToDashboardButton from '../BackToDashboardButton';

const AssetHeader = ({ asset, onBack, title, preview }) => {
  return (
    <div className="w-full z-10 bg-white/70 backdrop-blur-lg border-b">
      <div className="w-full flex justify-center md:ml-24 md:justify-start">
        <div
          className="py-4 md:py-6 px-4 md:px-0 flex items-center justify-between transition-all duration-300 ease-in-out w-full md:w-auto"
          style={{
            maxWidth: '1200px',
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <BackToDashboardButton
                onClick={onBack}
                label="Media"
                shortLabel="Media"
                variant="minimal"
              />
              {preview ? (
                <span className="text-xs sm:text-sm">
                  {'>'} <span className="underline">Asset preview</span>
                </span>
              ) : (
                <span className="text-xs sm:text-sm">
                  {'>'} <span className="underline">Upload asset</span>
                </span>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetHeader;