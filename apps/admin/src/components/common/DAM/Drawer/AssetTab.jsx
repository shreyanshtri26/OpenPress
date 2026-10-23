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

        /* the grid kit components borders */

        /* Input container */

        /* Input fields */

        /* Textarea specific */

        /* Placeholder text */

        /* SelectBox dropdown button */

        /* TagBox tags */

        /* Loading text */
        .asset-tab-container :global(.loading-text) {
          color: #0066cc;
          font-size: 10px;
          font-weight: 500;
          font-style: italic;
        }

        /* Hide empty messages */

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

        /* Scrollbar */

        /* Search input in dropdown */

  /* Blue checkmark inside */

  /* Hover effect */

  /* Remove default checkmark */

  /* List item spacing */

  /* Select All styling */
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
