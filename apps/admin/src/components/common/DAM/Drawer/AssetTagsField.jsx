// components/common/DAM/AssetTab/AssetTagsField.jsx
import React from "react";
import TagBox from "@/components/ui/kit/tag-box";

export default function AssetTagsField({
  availableTags,
  formData,
  handleInputChange,
}) {
  return (
    <div className="form-field">
      <div className="form-label">Tags * ({availableTags.length})</div>
      {availableTags.length > 0 ? (
        <TagBox
          dataSource={availableTags}
          value={formData.tags}
          onValueChanged={(e) => handleInputChange("tags", e.value)}
          width="100%"
          stylingMode="outlined"
          acceptCustomValue
          searchEnabled
          showSelectionControls
        />
      ) : (
        <div style={{ padding: "8px", color: "#999" }}>⏳ Loading tags...</div>
      )}
    </div>
  );
}
