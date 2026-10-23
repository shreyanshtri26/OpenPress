// src/components/common/DAM/AssetModal/AssetGrid.jsx
import CardView, {
  HeaderPanel,
  Pager,
  Paging,
  SearchPanel,
  Selection,
  Sorting,
} from "@/components/ui/kit/card-view";
import { FileText, Music, Play, Trash2 } from "lucide-react";
import PropTypes from "prop-types";
import AssetModalStyles from "./AssetModalStyles";


const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// 🔥 Consistent card height control
const MEDIA_HEIGHT = 140;

const AssetGrid = ({ assets, onAssetSelect, onDelete, gridHeight }) => {
  const CardTemplate = ({ card }) => {
    const asset = card.data;
    const fileName = asset.fileName || "Untitled Asset";
    const displayName =
      fileName.length > 30 ? fileName.substring(0, 30) + "..." : fileName;

    const fileExtension = asset.type?.split("/")[1]?.toUpperCase() || "FILE";
    const assetLabel = asset.fileName || asset.name || "this asset";

    const handleDelete = (e) => {
      e.stopPropagation();

      const identifier = asset.fileName || asset.name;
      if (!identifier) return;

      if (window.confirm(`Are you sure you want to delete ${assetLabel}?`)) {
        onDelete(identifier);
      }
    };

    return (
      <div
        className="group relative flex flex-col h-full w-full cursor-pointer border border-black bg-white overflow-hidden"
        onClick={() => onAssetSelect(asset)}
      >
        {/* IMAGE / VIDEO / FILE PREVIEW */}
        <div
          className="relative bg-gray-100 flex items-center justify-center w-full overflow-hidden"
          style={{ height: MEDIA_HEIGHT }}
        >
          {asset.type?.startsWith("image") ? (
            <img
              src={asset.previewUrl || asset.url || asset.fileUrl}
              alt={assetLabel}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src =
                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWNlY2VjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2EwYTBiMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFByZXZpZXc8L3RleHQ+PC9zdmc+";
              }}
            />
          ) : asset.type?.startsWith("video") ? (
            <>
              <video
                src={asset.url}
                className="w-full h-full object-cover"
                poster={asset.previewUrl || ""}
                muted
                preload="none"
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                <Play className="h-12 w-12 text-white opacity-80" />
              </div>
            </>
          ) : asset.type?.startsWith("audio") ? (
            <div className="flex h-full w-full items-center justify-center bg-gray-800">
              <Music className="h-12 w-12 text-white opacity-70" />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200">
              <FileText className="h-12 w-12 text-gray-500" />
            </div>
          )}

          {/* FILE EXT BADGE */}
          <div className="absolute bottom-2 right-2">
            <span className="rounded bg-black bg-opacity-60 px-2 py-1 text-[10px] text-white">
              {fileExtension}
            </span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex flex-col p-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">
            {displayName}
          </h3>

          {/* divider */}
          <div className="h-px w-full bg-black my-2" />

          <span className="text-xs text-gray-500">
            {formatDate(asset.createdAt)}
          </span>
        </div>

        {/* DELETE BUTTON */}
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 z-10 rounded-full bg-white p-1.5 text-gray-700 opacity-0 shadow-md transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <>
      <AssetModalStyles />
      <div style={{ height: gridHeight }}>
        <CardView
          key={`asset-grid-modal-${assets.length}-${assets.map(a => a.assetId || a.id || '').slice(0, 10).join('-')}`}
          dataSource={assets}
          keyExpr="assetId"
          height="100%"
          className="asset-grid"
          cardRender={CardTemplate}
          cardsPerRow="auto"
          cardMinWidth={265}

        >
          <HeaderPanel visible={false} />
          <Paging pageSize={8} /> {/* ALWAYS 8 per page (2 rows × 4 cols) */}
          <Pager
            showInfo
            showNavigationButtons
            displayMode="full"
            showPageSizeSelector={false}
          />
          <Sorting mode="single" allowUnsort />
          <SearchPanel visible={false} />
          <Selection mode="none" />
        </CardView>
      </div>
    </>
  );
};

AssetGrid.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.object).isRequired,
  onAssetSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  gridHeight: PropTypes.string.isRequired,
};

export default AssetGrid;
