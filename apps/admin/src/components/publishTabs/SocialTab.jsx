import React, { useState, useEffect } from "react";
import { TextBox } from "@/components/ui/dx/text-box";
import { TextArea } from "@/components/ui/dx/text-area";
import toast from 'react-hot-toast';

const SocialTab = ({ storyData, hasEditPermission, storyDetails, onFieldChange, description }) => {
    const [socialData, setSocialData] = useState({
        headline: "",
        socialImage: "",
    });

    const [imagePreview, setImagePreview] = useState(null);

    // Prefill data when storyData or storyDetails changes
    useEffect(() => {
        if (storyData) {
            const title = storyDetails?.socialHeadline || storyData.socialHeadline || storyData.title || '';
            const img = storyDetails?.image || storyData.image || storyDetails?.socialImage || storyData.socialImage || ''; // Prioritize featured image

            setSocialData({
                headline: title,
                socialImage: img,
            });

            // Set image preview: Prioritize featured image over social image so cropping is instantly visible
            const displayImage = storyDetails?.image || storyData.image || storyDetails?.socialImage || storyData.socialImage || null;
            setImagePreview(displayImage);
        }
    }, [storyData, storyDetails?.socialImage, storyDetails?.socialHeadline, storyDetails?.image]);

    const handleHeadlineChange = (e) => {
        if (!hasEditPermission) {
            toast.error("You are not authorised to edit");
            return;
        }
        setSocialData((prev) => ({
            ...prev,
            headline: e.value,
        }));
        if (onFieldChange) {
            onFieldChange("socialHeadline", e.value);
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6 ">
            {/* Headline Field */}
            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-500">
                    Headline <span className="text-gray-500 font-bold">*</span>
                </label>
                <TextBox
                    value={socialData.headline}
                    readOnly={!hasEditPermission}
                    onFocus={() => {
                        if (!hasEditPermission) {
                            toast.error("You are not authorised to edit");
                        }
                    }}
                    onValueChanged={handleHeadlineChange}
                    placeholder="Enter social headline"
                    stylingMode="outlined"
                    className="w-full border border-black"
                />
            </div>

            {/* Description Field */}
            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-500">
                    Description <span className="text-gray-500 font-bold">*</span>
                </label>
                <TextArea
                    value={description}
                    readOnly={true}
                    stylingMode="outlined"
                    className="w-full border border-black"
                />
            </div>

            {/* Image Preview Field */}
            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-500">
                    Image <span className="text-gray-500 font-bold">*</span>
                </label>
                <div className="border border-black p-4 flex items-center justify-center " style={{ minHeight: "200px" }}>
                    {imagePreview ? (
                        <div className="relative w-full h-full">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="max-w-full max-h-[200px] object-contain mx-auto"
                            />
                        </div>
                    ) : (
                        <div className="text-center w-full">
                            <p className="text-gray-400 mb-3">No featured image set yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Inline CSS for styling */}
            <style>{`
                .dx-placeholder{
                    color: #9ca3af !important; /* gray-400 */
                }
                .dx-texteditor.dx-editor-outlined{
                    border-radius:0px;
                    border: 1px solid #000000 !important;
                }
                
            `}</style>
        </div>
    );
};

export default SocialTab;
