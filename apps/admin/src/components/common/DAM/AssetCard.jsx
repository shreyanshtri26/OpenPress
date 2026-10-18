import React from 'react';
import { Play, Music, FileText, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/utils/appleMotion';

const AssetCard = ({ asset, onClick, onDelete }) => {
  if (!asset) return null;

  const fileExtension = asset?.type?.split('/')[1]?.toUpperCase() || 'FILE';
  const fileName = asset?.fileName || 'Untitled Asset';
  const displayName = fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div
      className="group relative flex h-full w-full flex-col cursor-pointer overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
      onClick={() => {
        triggerHaptic('selection');
        asset && onClick?.(asset);
      }}
    >
      {/* Asset Preview */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gray-100 aspect-video">
        {asset?.type?.startsWith('image') ? (
          <img
            src={asset?.previewUrl || ''}
            alt={asset?.name || 'Asset'}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            onError={(e) => {
              e.target.src =
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWNlY2VjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2EwYTBiMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFByZXZpZXc8L3RleHQ+PC9zdmc+';
            }}
          />
        ) : asset?.type?.startsWith('video') ? (
          <>
            <video
              src={asset?.url || ''}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
              poster={
                asset?.videoMetadata?.selectedThumbnail?.url ||
                asset?.videoMetadata?.customThumbnail?.url ||
                asset?.videoMetadata?.autoThumbnails?.[0]?.url ||
                asset?.previewUrl ||
                ''
              }
              muted
              preload="none"
              controls={false}
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <Play className="h-10 w-10 text-white opacity-90 drop-shadow-md" />
            </div>
          </>
        ) : asset?.type?.startsWith('audio') ? (
          <div className="flex h-full w-full items-center justify-center bg-gray-800">
            <Music className="h-10 w-10 text-white opacity-70" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <FileText className="h-10 w-10 text-gray-400" />
          </div>
        )}

        {/* File Type Badge */}
        <div className="absolute bottom-2 right-2">
          <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-white shadow-xs">
            {fileExtension}
          </span>
        </div>
      </div>

      {/* Asset Details */}
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight mb-1 truncate" title={fileName}>
          {displayName}
        </h3>
        <div className="border-t border-black/[0.05] pt-2 mt-auto flex items-center justify-between text-xs text-gray-400">
          <span>{formatDate(asset?.createdAt)}</span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic('selection');
          if (asset && window.confirm(`Are you sure you want to delete ${asset?.name}?`)) {
            onDelete?.(asset?.name);
          }
        }}
        className="absolute top-2 left-2 z-10 rounded-full bg-white/90 backdrop-blur-md p-1.5 text-gray-700 opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100 hover:bg-red-500 hover:text-white"
        title="Delete Asset"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default AssetCard;
