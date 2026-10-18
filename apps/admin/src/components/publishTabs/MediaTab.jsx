// src/components/publishTabs/MediaTab.jsx
import React, { useState, useEffect } from "react";
import { TextBox } from "@/components/ui/dx/text-box";
import { Button } from "@/components/ui/dx/button";
import toast from 'react-hot-toast';

const MediaTab = ({ storyData, hasEditPermission, storyDetails, onFieldChange }) => {

    const isValidHttpUrl = (url) => /^(https?:\/\/)[^\s$.?#].[^\s]*$/i.test(url || "");

    console.log("story details >>>>>>>>>", storyDetails);
    console.log("story data >>>>>>>>>", storyData);



    // Helper function to generate alt text from title (snake_case)
    const generateAltText = (title) => {
        if (!title) return "";
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .trim();
    };


    // Get caption value: prioritize storyDetails (current edits), then storyData (saved)
    const getCaptionValue = () => {
        // 1. First check storyDetails for current session edits
        if (storyDetails?.mediaCaption !== undefined && storyDetails?.mediaCaption !== "") {
            return storyDetails.mediaCaption;
        }
        // 2. Then check storyData for previously saved values
        if (storyData?.mediaCaption !== undefined && storyData?.mediaCaption !== "") {
            return storyData.mediaCaption;
        }
        // No default pre-fill from description
        return "";
    };

    // Get alt text value: generate from caption
    const getAltTextValue = () => {
        const caption = getCaptionValue();
        if (caption) {
            return generateAltText(caption);
        }
        return "";
    };

    const handleAltTextChange = (e) => {
        if (!hasEditPermission) {
            toast.error("You are not authorised to edit");
            return;
        }

        if (onFieldChange) {
            onFieldChange("mediaAltText", e.value);
        }
    };


    const handleCaptionChange = (e) => {
        if (!hasEditPermission) {
            toast.error("You are not authorised to edit");
            return;
        }
        // Update via onFieldChange to persist in storyDetails
        if (onFieldChange) {
            onFieldChange('mediaCaption', e.value);
            onFieldChange('mediaAltText', generateAltText(e.value));
        }
    };

    const getCanonicalUrlValue = () => {
        if (storyDetails?.canonicalUrl !== undefined && storyDetails?.canonicalUrl !== null) {
            return storyDetails.canonicalUrl;
        }
        if (storyData?.canonicalUrl !== undefined && storyData?.canonicalUrl !== null) {
            return storyData.canonicalUrl;
        }
        return "";
    };

    const handleCanonicalUrlChange = (e) => {
        if (!hasEditPermission) {
            toast.error("You are not authorised to edit");
            return;
        }

        if (onFieldChange) {
            onFieldChange("canonicalUrl", e.value);
        }
    };

    const handlePublish = () => {
        console.log("Publishing media data:", {
            altText: getAltTextValue(),
            caption: getCaptionValue()
        });
    };

    const canonicalUrlValue = getCanonicalUrlValue();
    const isCanonicalUrlValid = isValidHttpUrl(canonicalUrlValue);

    return (
        <div className="flex flex-col bg-white px-6 py-4">
            <div className="flex flex-col gap-6">
                {/* Alt Text Field */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-500">
                        Alt text <span className="text-gray-500 font-bold">*</span>
                    </label>
                    <TextBox
                        value={getAltTextValue()}
                        readOnly={!hasEditPermission}
                        onValueChanged={handleAltTextChange}
                        placeholder="Enter alt text"
                        stylingMode="outlined"
                        className="border border-black"
                    />
                </div>

                {/* Caption Field */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-500">
                        Caption <span className="text-gray-500 font-bold">*</span>
                    </label>
                    <TextBox
                        value={getCaptionValue()}
                        readOnly={!hasEditPermission}
                        onValueChanged={handleCaptionChange}
                        placeholder="Enter caption"
                        stylingMode="outlined"
                        className="border border-black"
                    />
                </div>

                {/* Canonical URL Field (Optional) */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-500">
                        Canonical URL <span className="text-gray-400">(used for Google indexing and verifying)</span>
                    </label>
                    <TextBox
                        value={getCanonicalUrlValue()}
                        readOnly={!hasEditPermission}
                        onValueChanged={handleCanonicalUrlChange}
                        placeholder="https://example.com/original-story"
                        stylingMode="outlined"
                        className="border border-black"
                    />

                    <div className="mt-2 flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (isCanonicalUrlValid) {
                                    window.open(canonicalUrlValue, "_blank", "noopener,noreferrer");
                                } else {
                                    toast.error("Please enter a valid URL starting with http:// or https://");
                                }
                            }}
                            className="bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded transition-all inline-flex items-center gap-1.5"
                        >
                            Demo Link ↗
                        </button>
                    </div>
                </div>
            </div>

            {/* Inline CSS for TextBox styling */}
            <style>{`
                .dx-texteditor-input {
                    border-radius: 0 !important;
                }
                .dx-placeholder {
                    color: #9ca3af !important; /* gray-400 */
                    padding: 2px;
                }
                .dx-texteditor.dx-editor-outlined {
                    border-radius: 0px;
                }  
            `}</style>
        </div>
    );
};

export default MediaTab;