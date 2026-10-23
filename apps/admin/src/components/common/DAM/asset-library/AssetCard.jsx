import PropTypes from 'prop-types';
import { FileText, Image, Music, Play, Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/utils/appleMotion';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AssetCard = ({ asset = null, onOpen, onDelete }) => {
  if (!asset) {
    return null;
  }

  const fileExtension = asset.type?.split('/')[1]?.toUpperCase() || 'FILE';
  const fileName = asset.fileName || 'Untitled Asset';

  return (
    <div
      className="group relative flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-white transition-[box-shadow,border-color] duration-200 hover:border-[var(--color-border)] hover:shadow-md"
      onClick={() => {
        triggerHaptic('selection');
        onOpen(asset);
      }}
    >
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gray-100 aspect-video">
        {asset.type?.startsWith('image') ? (
          <img
            src={asset.previewUrl || asset.previewUrl}
            alt={asset.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            onError={(e) => {
              e.target.src =
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWNlY2VjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2EwYTBiMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFByZXZpZXc8L3RleHQ+PC9zdmc+';
            }}
          />
        ) : asset.type?.startsWith('video') ? (
          <>
            <video
              src={asset.url}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
              poster={
                asset.videoMetadata?.selectedThumbnail?.url ||
                asset.videoMetadata?.customThumbnail?.url ||
                asset.videoMetadata?.autoThumbnails?.[0]?.url ||
                asset.previewUrl ||
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
        ) : asset.type?.startsWith('audio') ? (
          <div className="flex h-full w-full items-center justify-center bg-gray-800">
            <Music className="h-10 w-10 text-white opacity-70" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <FileText className="h-10 w-10 text-gray-400" />
          </div>
        )}

        <div className="absolute bottom-2 right-2">
          <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-white shadow-xs">
            {fileExtension}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 tracking-tight text-[var(--color-text-primary)]" title={fileName}>
            {fileName}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('selection');
              onDelete(asset.assetId);
            }}
            className="-mr-1 flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-error-subtle)] hover:text-[var(--color-error)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-error)]"
            title="Delete asset"
            aria-label={`Delete ${fileName}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2 text-xs text-[var(--color-text-secondary)]">
          <span>{formatDate(asset.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

AssetCard.propTypes = {
  asset: PropTypes.object,
  onOpen: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default AssetCard;
