import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import AssetDrawer from '../Drawer/AssetDrawer';
import AssetHeader from './../AssetHeader';
import toast from 'react-hot-toast';

const AssetLibraryDrawer = ({
  isOpen,
  selectedAsset = null,
  setDrawerOpened,
  accordionArrowTemplate,
  onAssetUpdate,
  onClose,
}) => {
  const [isCaptionMissing, setIsCaptionMissing] = useState(false);
  const drawerRef = useRef(null);

  if (!isOpen || !selectedAsset) {
    return null;
  }

  const handleBack = () => {
    if (drawerRef.current) {
      drawerRef.current.handleSaveAndClose();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed top-0 right-0 bottom-0 bg-white transition-all duration-300 ease-in-out overflow-hidden z-30"
      style={{
        left: 'var(--sidebar-width, 0px)'
      }}
    >
      <div className="h-full flex flex-col">
        <AssetHeader asset={selectedAsset} onBack={handleBack} preview={true} />
        <AssetDrawer
          ref={drawerRef}
          accordionArrowTemplate={accordionArrowTemplate}
          setDrawerOpened={setDrawerOpened}
          asset={selectedAsset}
          onAssetUpdate={onAssetUpdate}
          handleCloseDrawer={onClose}
          preview={true}
          onValidationChange={setIsCaptionMissing}
        />
      </div>
    </div>
  );
};

AssetLibraryDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  selectedAsset: PropTypes.object,
  setDrawerOpened: PropTypes.func,
  accordionArrowTemplate: PropTypes.func,
  onAssetUpdate: PropTypes.func,
  onClose: PropTypes.func,
};

export default AssetLibraryDrawer;
