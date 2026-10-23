// components/common/DAM/AssetTab/AssetFormFields.jsx
import React from "react";
import TextBox from "@/components/ui/kit/text-box";
import TextArea from "@/components/ui/kit/text-area";
import SelectBox from "@/components/ui/kit/select-box";

const categoryOptions = [
  { id: "news", name: "News" },
  { id: "politics", name: "Politics" },
  { id: "business", name: "Business" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "sports", name: "Sports" },
  { id: "culture", name: "Culture" },
];

const rightsOptions = [
  { id: "owned", name: "License 1" },
  { id: "freelancer", name: "License 2" },
  { id: "agency", name: "License 3" },
];

const creatorOptions = [
  { id: "author1", name: "Author 1" },
  { id: "author2", name: "Author 2" },
  { id: "author3", name: "Author 3" },
];

export default function AssetFormFields({
  formData,
  handleInputChange,
  isLoading,
  isGeneratingSummary,
}) {
  const arrowTemplate = (_, el) => {
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"
        viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>`;
  };

  return (
    <>
      <div className="form-field">
        <div className="form-label">Title *</div>
        <TextBox
          value={formData.title}
          onValueChanged={(e) => handleInputChange("title", e.value)}
          width="100%"
          stylingMode="outlined"
        />
      </div>

      <div className="form-field">
        <div className="form-label">
          Summary *
          {(isLoading || isGeneratingSummary) && (
            <span className="loading-text ml-2">
              {isGeneratingSummary ? "Generating..." : "⏳ Loading..."}
            </span>
          )}
        </div>
        <TextArea
          value={formData.summary}
          onValueChanged={(e) => handleInputChange("summary", e.value)}
          width="100%"
          height={120}
          stylingMode="outlined"
          className={isGeneratingSummary ? "generating-summary" : ""}
          readOnly={isLoading || isGeneratingSummary}
        />
      </div>

      <div className="form-field">
        <div className="form-label">Caption *</div>
        <TextArea
          value={formData.caption || ""}
          onValueChanged={(e) => handleInputChange("caption", e.value)}
          width="100%"
          height={90}
          stylingMode="outlined"
          placeholder="Enter caption for this asset"
        />
      </div>

      <div className="form-field">
        <div className="form-label">Dimensions</div>
        <TextBox
          value={formData.location}
          onValueChanged={(e) => handleInputChange("location", e.value)}
          placeholder="Dimensions"
          width="100%"
          stylingMode="outlined"
        />
      </div>
    </>
  );
}
