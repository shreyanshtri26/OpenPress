import React, { useState, useEffect, useContext } from "react";
import TextBox from "@/components/ui/kit/text-box";
import TextArea from "@/components/ui/kit/text-area";
import SelectBox from "@/components/ui/kit/select-box";
import TagBox from "@/components/ui/kit/tag-box";
import env from '@/utils/env';
import apiFetch from '../../../utils/api';
import { buildImagePayload } from "./utils/imagePayload";
import { UserContext } from "../../../context/UserContext";

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
  { id: "creator1", name: "Creator 1" },
  { id: "creator2", name: "Creator 2" },
  { id: "creator3", name: "Creator 3" },
];

export default function AssetTab({ asset, apiMetadata, onSave }) {
  const [formData, setFormData] = useState({
    title: asset?.fileName || asset?.name || "",
    summary: asset?.description || "",
    category: "",
    licensing: "",
    creator: "",
    tags: [],
    location: "",
    // celebrities: [], // removed: celebrity detection feature deprecated
  });

  const [availableTags, setAvailableTags] = useState([]);
  // const [availableCelebrities, setAvailableCelebrities] = useState([]); // removed: celebrity detection feature deprecated
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  const generateAISummary = async () => {
    const labels = availableTags;
    // const celebrities = formData.celebrities || []; // removed: celebrity detection feature deprecated


    if (labels.length === 0) {
      return;
    }

    setIsGeneratingSummary(true);

    try {
      let prompt = `You are a professional news journalist. Write a compelling 2-3 sentence caption for this image suitable for news publication and media archives. Focus on newsworthy elements and narrative value.\n\nImage contains: ${labels.join(", ")}`;

      // if (celebrities && celebrities.length > 0) { // removed: celebrity detection feature deprecated
      //   prompt += `\nNotable people featured: ${celebrities.join(", ")}`;
      // }

      prompt += `\n\nRequirements:
- Write ONLY the caption. No introduction or prefix.
- Use active voice and journalistic style
- Make it informative and engaging
- Include context about who, what, where, or why if evident
- Keep it 2-3 sentences`;


      const imagePayload = await buildImagePayload(asset, apiMetadata);

      if (!imagePayload) {
        setSummary("Failed to generate AI summary due to issues with the image.");
        setLoading(false);
        return;
      }

      const image = imagePayload
        ? {
          format: imagePayload.format,
          source: { bytes: imagePayload.bytes },
        }
        : null;

      const response = await apiFetch(
        `${env.aiApi}/normal_stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            image
              ? {
                query: prompt,
                sessionId,
                image,
              }
              : { query: prompt, sessionId }
          ),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let summaryText = "";
      let sessionReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        if (!sessionReceived && chunk.includes("SESSION:")) {
          const lines = chunk.split("\n");
          const sessionLine = lines.find((l) => l.startsWith("SESSION:"));
          if (sessionLine) {
            const newSessionId = sessionLine.replace("SESSION:", "").trim();
            setSessionId(newSessionId);
            sessionReceived = true;

            const remainingContent = lines
              .filter((l) => !l.startsWith("SESSION:"))
              .join("\n");

            if (remainingContent) {
              summaryText += remainingContent;
            }
            continue;
          }
        }

        summaryText += chunk;
      }

      let cleanedSummary = summaryText.trim();

      const prefixes = [
        "Here is a",
        "Here's a",
        "Here is the",
        "Here's the",
        "The caption",
        "Caption:",
        "Image caption:",
        "News caption:",
        "Journalist caption:",
        "Professional caption:",
      ];

      prefixes.forEach((prefix) => {
        const regex = new RegExp(`^${prefix}[:\\s]*`, "i");
        cleanedSummary = cleanedSummary.replace(regex, "");
      });

      cleanedSummary = cleanedSummary.replace(/^[\*\-\#\s]+/, "").trim();

      if (
        (cleanedSummary.startsWith('"') && cleanedSummary.endsWith('"')) ||
        (cleanedSummary.startsWith("'") && cleanedSummary.endsWith("'"))
      ) {
        cleanedSummary = cleanedSummary.slice(1, -1).trim();
      }


      setFormData((prev) => ({
        ...prev,
        summary: cleanedSummary,
      }));
    } catch (error) {
      console.error("❌ Error generating AI summary:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (!apiMetadata) {
      return;
    }


    let allTags = [];
    let autoSelectedTags = [];
    // let allCelebrities = []; // removed: celebrity detection feature deprecated

    if (
      apiMetadata.analysis?.labels?.data &&
      Array.isArray(apiMetadata.analysis.labels.data)
    ) {
      const labelData = apiMetadata.analysis.labels.data;

      const uniqueLabels = {};
      labelData.forEach((item) => {
        if (item.label && !uniqueLabels[item.label]) {
          uniqueLabels[item.label] = item.confidence;
        }
      });

      const labelNames = Object.keys(uniqueLabels);
      allTags = [...allTags, ...labelNames];

      const highConfidenceLabels = Object.entries(uniqueLabels)
        .filter(([_, confidence]) => confidence > 90)
        .map(([label, _]) => label);
      autoSelectedTags = [...autoSelectedTags, ...highConfidenceLabels];

      // if ( // removed: celebrity detection feature deprecated
      //   apiMetadata.analysis?.celebrities?.data &&
      //   Array.isArray(apiMetadata.analysis.celebrities.data)
      // ) {
      //   const celebrityNames = apiMetadata.analysis.celebrities.data.map(
      //     (celeb) => celeb.name
      //   );
      //   allCelebrities = celebrityNames;
      // }

    } else if (apiMetadata.imageAnalysis) {
      const analysis = apiMetadata.imageAnalysis;

      if (
        analysis.labels?.labels &&
        Array.isArray(analysis.labels.labels)
      ) {
        const labelNames = analysis.labels.labels.map((label) => label.name);
        allTags = [...allTags, ...labelNames];

        const highConfidenceLabels = analysis.labels.labels
          .filter((label) => label.confidence > 90)
          .map((label) => label.name);
        autoSelectedTags = [...autoSelectedTags, ...highConfidenceLabels];

      }

      if (
        analysis.text?.fullText &&
        analysis.text.fullText.trim() !== ""
      ) {
        allTags = [...allTags, analysis.text.fullText];
      }

      // Extract celebrities correctly - removed: celebrity detection feature deprecated
      // if (
      //   analysis?.celebrities?.celebrities &&
      //   Array.isArray(analysis.celebrities.celebrities)
      // ) {
      //   allCelebrities = analysis.celebrities.celebrities.map(
      //     (celeb) => celeb.name
      //   );
      // }

    }

    const location =
      apiMetadata.metadata?.dimensions ||
      apiMetadata.extractedMetadata?.dimensions ||
      "";

    const validAutoSelectedTags = autoSelectedTags.filter((tag) =>
      allTags.includes(tag)
    );

    setAvailableTags(allTags);
    // setAvailableCelebrities(allCelebrities); // removed: celebrity detection feature deprecated

    setFormData((prev) => ({
      ...prev,
      tags: validAutoSelectedTags,
      // celebrities: allCelebrities, // removed: celebrity detection feature deprecated
      location: location,
    }));
  }, [apiMetadata]);

  useEffect(() => {
    if (availableTags.length > 0 && !isGeneratingSummary) {
      generateAISummary();
    }
  }, [availableTags]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const assetId = asset?.assetId || apiMetadata?.assetId;

      if (!assetId) {
        alert("Asset ID not found");
        return;
      }

      // Prepare data to save
      const dataToSave = {
        assetId: assetId,
        title: formData.title,
        summary: formData.summary,
        category: formData.category,
        licensing: formData.licensing,
        creator: formData.creator,
        tags: formData.tags,
        // celebrities: formData.celebrities, // removed: celebrity detection feature deprecated
        location: formData.location,
      };


      const response = await apiFetch(`${env.backendApi}/api/assets/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        throw new Error(`Failed to save metadata: ${response.status}`);
      }

      const result = await response.json();

      if (onSave) {
        onSave(dataToSave);
      }

      alert("✅ Asset metadata saved successfully!");
    } catch (error) {
      console.error("❌ Error saving metadata:", error);
      alert(`Error saving metadata: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const accordionArrowTemplate = (buttonData, buttonElement) => {
    buttonElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"
           viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
  };

  return (
    <div className="asset-tab-container px-4 pb-4">
      <style>
        {`
          .asset-tab-container .form-field {
            margin-bottom: 16px;
          }
          
          .asset-tab-container .form-label {
            font-size: 14px;
            color: #999999;
            margin-bottom: 4px;
            padding-left: 4px;
          }
          
          .asset-tab-container .form-field + .form-field {
            border-top: none;
          }
          
          .asset-tab-container hr,
          .asset-tab-container .divider,
          .asset-tab-container .separator {
            display: none !important;
          }

          .generating-summary {
            opacity: 0.6;
            pointer-events: none;
          }

          .save-button-container {
            display: flex;
            gap: 8px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
          }

          .save-button, .cancel-button {
            padding: 10px 20px;
            font-size: 14px;
            border: 1px solid #000;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
          }

          .save-button {
            background-color: #000;
            color: #fff;
          }

          .save-button:hover:not(:disabled) {
            background-color: #333;
          }

          .save-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .cancel-button {
            background-color: #fff;
            color: #000;
          }

          .cancel-button:hover {
            background-color: #f0f0f0;
          }
        `}
      </style>

      <div className="form-field">
        <div className="form-label">Title *</div>
        <TextBox
          value={formData.title}
          onValueChanged={(e) => handleInputChange("title", e.value)}
          placeholder=""
          width="100%"
          stylingMode="outlined"
        />
      </div>

      <div className="form-field">
        <div className="form-label">
          Summary *
          {isGeneratingSummary && (
            <span style={{ color: "#0066cc", marginLeft: "8px" }}>
              ⏳ Generating AI summary...
            </span>
          )}
        </div>
        <TextArea
          value={formData.summary}
          onValueChanged={(e) => handleInputChange("summary", e.value)}
          placeholder="Tell me more about this."
          width="100%"
          height={120}
          stylingMode="outlined"
          className={isGeneratingSummary ? "generating-summary" : ""}
          readOnly={isGeneratingSummary}
        />
      </div>

      <div className="form-field">
        <SelectBox
          dataSource={categoryOptions}
          displayExpr="name"
          valueExpr="id"
          value={formData.category}
          onValueChanged={(e) => handleInputChange("category", e.value)}
          placeholder="News"
          width="100%"
          stylingMode="outlined"
          searchEnabled={true}
          showClearButton={false}
          dropDownButtonTemplate={accordionArrowTemplate}
        />
      </div>

      <div className="form-field">
        <SelectBox
          dataSource={rightsOptions}
          displayExpr="name"
          valueExpr="id"
          value={formData.licensing}
          onValueChanged={(e) => handleInputChange("licensing", e.value)}
          placeholder="License 1"
          width="100%"
          stylingMode="outlined"
          searchEnabled={true}
          showClearButton={false}
          dropDownButtonTemplate={accordionArrowTemplate}
        />
      </div>

      <div className="form-field">
        <SelectBox
          dataSource={creatorOptions}
          displayExpr="name"
          valueExpr="id"
          value={formData.creator}
          onValueChanged={(e) => handleInputChange("creator", e.value)}
          placeholder="Creator 1"
          width="100%"
          stylingMode="outlined"
          searchEnabled={true}
          showClearButton={false}
          dropDownButtonTemplate={accordionArrowTemplate}
        />
      </div>

      <div className="form-field">
        <div className="form-label">Tags *</div>
        {availableTags.length > 0 ? (
          <TagBox
            dataSource={availableTags}
            value={formData.tags}
            onValueChanged={(e) => handleInputChange("tags", e.value)}
            placeholder="Tags *"
            acceptCustomValue={true}
            width="100%"
            stylingMode="outlined"
            noDataText=""
            showSelectionControls={true}
            searchEnabled={true}
          />
        ) : (
          <div style={{ padding: "8px", color: "#999", fontSize: "14px" }}>
            ⏳ Loading tags from analysis...
          </div>
        )}
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

      {/* removed: celebrity detection feature deprecated */}
      {/* <div className="form-field">
        <div className="form-label">Celebrities ({availableCelebrities.length})</div>
        {availableCelebrities.length > 0 ? (
          <TagBox
            dataSource={availableCelebrities}
            value={formData.celebrities}
            onValueChanged={(e) => handleInputChange("celebrities", e.value)}
            placeholder="Celebrities"
            acceptCustomValue={true}
            width="100%"
            stylingMode="outlined"
            noDataText=""
            showSelectionControls={true}
            searchEnabled={true}
          />
        ) : (
          <div style={{ padding: "8px", color: "#999", fontSize: "14px" }}>
            No celebrities detected
          </div>
        )}
      </div> */}

      <div className="save-button-container">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={isSaving || isGeneratingSummary}
        >
          {isSaving ? " Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
