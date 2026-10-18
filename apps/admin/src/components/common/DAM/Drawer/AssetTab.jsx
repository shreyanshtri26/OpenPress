// components/common/DAM/AssetTab/AssetTab.jsx
import React from "react";
import AssetFormFields from "./AssetFormFields";
import AssetTagsField from "./AssetTagsField";
// import AssetCelebritiesField from "./AssetCelebritiesField"; // removed: celebrity detection feature deprecated

export default function AssetTab({ 
  asset, 
  apiMetadata,
  formData,              
  availableTags,         
  // availableCelebrities, // removed: celebrity detection feature deprecated
  isLoading,             
  isGeneratingSummary,   
  handleInputChange      
}) {
  return (
    <div className="asset-tab-container">
      <style jsx>{`
        .asset-tab-container {
          padding: 12px 16px;
        }

        /* Form field spacing */
        .asset-tab-container :global(.form-field) {
          margin-bottom: 12px;
        }

        /* Form labels */
        .asset-tab-container :global(.form-label) {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
          padding-left: 2px;
          font-weight: 500;
        }

        /* DevExtreme components borders */
        .asset-tab-container :global(.dx-textbox),
        .asset-tab-container :global(.dx-textarea),
        .asset-tab-container :global(.dx-selectbox),
        .asset-tab-container :global(.dx-tagbox) {
          border: 1px solid #d0d0d0 !important;
          border-radius: 4px !important;
          font-size: 12px !important;
        }

        /* Input container */
        .asset-tab-container :global(.dx-texteditor-container) {
          border: none !important;
        }

        .asset-tab-container :global(.dx-texteditor-input-container) {
          border: none !important;
        }

        /* Input fields */
        .asset-tab-container :global(.dx-texteditor-input) {
          min-height: 32px !important;
          padding: 6px 8px !important;
          font-size: 12px !important;
        }

        /* Textarea specific */
        .asset-tab-container :global(.dx-textarea) {
          min-height: 80px !important;
        }

        .asset-tab-container :global(.dx-textarea .dx-texteditor-input) {
          padding: 8px !important;
          line-height: 1.5 !important;
        }

        /* Placeholder text */
        .asset-tab-container :global(.dx-placeholder::before) {
          color: #999 !important;
          font-size: 12px !important;
        }

        /* SelectBox dropdown button */
        .asset-tab-container :global(.dx-dropdowneditor-button) {
          width: 32px !important;
        }

        /* TagBox tags */
        .asset-tab-container :global(.dx-tag) {
          background-color: #e3f2fd !important;
          color: #1976d2 !important;
          padding: 3px 8px !important;
          margin: 2px !important;
          border-radius: 3px !important;
          font-size: 11px !important;
        }

        .asset-tab-container :global(.dx-tag-remove-button) {
          margin-left: 4px !important;
        }

        /* Loading text */
        .asset-tab-container :global(.loading-text) {
          color: #0066cc;
          font-size: 10px;
          font-weight: 500;
          font-style: italic;
        }

        /* Hide empty messages */
        .asset-tab-container :global(.dx-empty-message),
        .asset-tab-container :global(.dx-list-empty-message) {
          display: none !important;
        }

        /* Hide dividers */
        .asset-tab-container :global(hr),
        .asset-tab-container :global(.divider) {
          display: none !important;
        }

        /* No data message */
        .asset-tab-container :global(.no-data-message) {
          padding: 8px 12px;
          color: #999;
          font-size: 11px;
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          text-align: center;
        }
      `}</style>

      <style jsx global>{`
        /* Global dropdown fixes */
        .dx-overlay-content.dx-popup-normal {
          max-width: 360px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-radius: 4px !important;
        }

        .dx-list.dx-list-select-decorator-enabled {
          max-height: 250px !important;
          overflow-y: auto !important;
        }

        .dx-list-item {
          padding: 6px 10px !important;
          font-size: 12px !important;
          min-height: 32px !important;
          border-bottom: 1px solid #f5f5f5 !important;
        }

        .dx-list-item:hover {
          background-color: #f5f5f5 !important;
        }

        .dx-list-item-selected {
          background-color: #e3f2fd !important;
          color: #1976d2 !important;
          font-weight: 500 !important;
        }

        .dx-list-select-all {
          padding: 8px 10px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          border-bottom: 2px solid #e0e0e0 !important;
          background-color: #fafafa !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }

        .dx-checkbox {
          margin-right: 6px !important;
        }

        .dx-checkbox-icon {
          width: 14px !important;
          height: 14px !important;
          border: 1px solid #bdbdbd !important;
          border-radius: 2px !important;
        }

        .dx-checkbox-checked .dx-checkbox-icon {
          background-color: #1976d2 !important;
          border-color: #1976d2 !important;
        }

        .dx-list-item-content {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }

        /* Scrollbar */
        .dx-scrollable-container::-webkit-scrollbar {
          width: 5px !important;
        }

        .dx-scrollable-container::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
        }

        .dx-scrollable-container::-webkit-scrollbar-thumb {
          background: #bdbdbd !important;
          border-radius: 3px !important;
        }

        .dx-scrollable-container::-webkit-scrollbar-thumb:hover {
          background: #9e9e9e !important;
        }

        /* Search input in dropdown */
        .dx-list-search {
          padding: 6px !important;
          border-bottom: 1px solid #e0e0e0 !important;
        }

        .dx-list-search .dx-texteditor-input {
          font-size: 12px !important;
          padding: 6px 8px !important;
          min-height: 30px !important;
        }
          .dx-checkbox-icon {
    width: 18px !important;
    height: 18px !important;
    border: 2px solid #2196F3 !important;
    border-radius: 3px !important;
    background-color: white !important;
  }

  .dx-checkbox-checked .dx-checkbox-icon {
    background-color: #2196F3 !important;
    border-color: #2196F3 !important;
    position: relative !important;
  }

  /* Blue checkmark inside */
  .dx-checkbox-checked .dx-checkbox-icon::after {
    content: '✓' !important;
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    color: white !important;
    font-size: 14px !important;
    font-weight: bold !important;
    line-height: 1 !important;
  }

  /* Hover effect */
  .dx-checkbox:hover .dx-checkbox-icon {
    border-color: #1976D2 !important;
  }

  /* Remove default checkmark */
  .dx-checkbox-checked .dx-checkbox-icon .dx-icon {
    display: none !important;
  }

  /* List item spacing */
  .dx-list-item {
    padding: 8px 12px !important;
    font-size: 14px !important;
    min-height: 40px !important;
    border-bottom: 1px solid #f0f0f0 !important;
  }

  .dx-list-item-content {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
  }

  /* Select All styling */
  .dx-list-select-all {
    padding: 10px 12px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    border-bottom: 2px solid #e0e0e0 !important;
    background-color: #fafafa !important;
  }

  .dx-list-select-all .dx-checkbox-icon {
    border-color: #2196F3 !important;
  }
      `}</style>

      {/* Section 1: Form Fields */}
      <AssetFormFields
        formData={formData}
        handleInputChange={handleInputChange}
        isLoading={isLoading}
        isGeneratingSummary={isGeneratingSummary}
      />
 
      {/* Section 2: Tags */}
      <AssetTagsField
        availableTags={availableTags}
        formData={formData}
        handleInputChange={handleInputChange}
      />

      {/* Section 3: Celebrities - removed: celebrity detection feature deprecated */}
      {/* <AssetCelebritiesField
        availableCelebrities={availableCelebrities}
        formData={formData}
        handleInputChange={handleInputChange}
      /> */}
    </div>
  );
}
