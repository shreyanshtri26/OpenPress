// components/common/DAM/AssetTab/AssetCelebritiesField.jsx
import React from "react";
import TagBox from "@/components/ui/kit/tag-box";

export default function AssetCelebritiesField({
  availableCelebrities,
  formData,
  handleInputChange,
}) {
  return (
    <div className="form-field">
      <div className="form-label">
        Celebrities ({availableCelebrities.length})
      </div>
      {availableCelebrities.length > 0 ? (
        <TagBox
          dataSource={availableCelebrities}
          value={formData.celebrities}
          onValueChanged={(e) => handleInputChange("celebrities", e.value)}
          width="100%"
          stylingMode="outlined"
          acceptCustomValue
          searchEnabled
          showSelectionControls
        />
      ) : (
        <div style={{ padding: "8px", color: "#999" }}>No celebrities detected</div>
      )}
    </div>
  );
}
