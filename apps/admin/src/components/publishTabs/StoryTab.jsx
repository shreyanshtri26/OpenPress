import React, { useState, useEffect, useContext, useRef } from "react";
import { TextBox } from "@/components/ui/kit/text-box";
import { TextArea } from "@/components/ui/kit/text-area";
import CustomCalendar from "../common/CustomCalendar";
import toast from 'react-hot-toast';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
import { UserContext } from "@/context/UserContext";

export default function StoryTab({ storyData, hasEditPermission, onFieldChange, title, onTitleChange, slug, storyDetails }) {
  const [publishOption, setPublishOption] = useState("Now");
  const [publishDateTime, setPublishDateTime] = useState(null);
  const [showPublishDropdown, setShowPublishDropdown] = useState(false);
  const [showBylineDropdown, setShowBylineDropdown] = useState(false);
  const [newBylineName, setNewBylineName] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [authorOptions, setAuthorOptions] = useState([]);

  const publishDropdownRef = useRef(null);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  console.log("story details in story tab >>>>", storyDetails);
  console.log("story data in story tab >>>>", storyData);
  // Get byline from storyDetails or default to empty array
  const byline = Array.isArray(storyDetails?.byline) ? [...storyDetails.byline] : [];

  // ⬇️ Fetch Author taxonomy values
  useEffect(() => {
    async function fetchAuthorTaxonomy() {
      try {
        const response = await apiFetch(`${env.backendApi}/taxonomies`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            // ...(user?.role && { 'x-user-role': user.role }),
            // ...(user?.id && { 'x-user-id': user.id }),
          },
        });
        const data = await response.json();
        console.log("TAXONOMY RESPONSE:", data); // ⬅️ ADD THIS

        if (!response.ok) return;

        const authorGroup = data.taxonomies.find((t) =>
          t.name.toLowerCase().includes("author")
        );


        if (authorGroup?.values) {
          setAuthorOptions(authorGroup.values);
        }
      } catch (err) {
        console.error("Error fetching author taxonomy:", err);
      }
    }

    fetchAuthorTaxonomy();
  }, []);



  // ✅ Helper function to generate slug from title (always starts with '/')
  const generateSlug = (title) => {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // remove special chars
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .trim();

    return cleanTitle ? `/${cleanTitle}` : "";
  };

  // ✅ Extract text from EditorJS blocks
  const extractTextFromBlocks = (blocks) => {
    if (!blocks || !Array.isArray(blocks)) return "";

    return blocks
      .map((block) => {
        if (block.type === "paragraph" || block.type === "header") {
          const text = block.data?.text || "";
          // Strip all HTML tags including <a href="...">
          return text.replace(/<[^>]*>/g, '');  // ✅ THIS LINE FIXES THE ISSUE
        }
        return "";
      })
      .filter((text) => text.length > 0)
      .join(" ")
      .trim();
  };


  // ✅ Prefill from storyData (skip permission check on initial load)
  useEffect(() => {
    if (storyData?.authorName && !storyDetails?.byline?.length) {
      // Only update if we have authorName and byline isn't already set
      const authorName = storyData.authorName || "Author";
      // Directly update via onFieldChange with silent=true (initial prefill, no toast)
      onFieldChange('byline', [authorName], true);
    }
  }, [storyData, storyDetails?.byline]);

  // ✅ Auto-update slug when title changes
  useEffect(() => {
    if (title) {
      // The slug is now managed by the parent component (RaiseStory.tsx)
      // This effect is no longer needed for setting the slug.
    }
  }, [title]);

  const handlePublishOptionChange = (option) => {
    setPublishOption(option);
    if (option === "Now") {
      setShowPublishDropdown(false);
      setIsCalendarOpen(false);
    }
  };

  // Handle clicks outside the publish dropdown to close it
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showPublishDropdown &&
        publishDropdownRef.current &&
        !publishDropdownRef.current.contains(event.target) &&
        !event.target.closest('.kit-datebox')) {
        setShowPublishDropdown(false);
      }
    };

    if (showPublishDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showPublishDropdown]);

  const handleBylineChange = (newByline) => {
    if (!hasEditPermission) {
      toast.error("You are not authorised to edit");
      return;
    }

    // Update parent component's state
    onFieldChange('byline', [...newByline]);
  };

  const handleRemoveByline = (index) => {
    if (!hasEditPermission) {
      toast.error("You are not authorised to edit");
      return;
    }
    const updatedByline = byline.filter((_, i) => i !== index);
    handleBylineChange(updatedByline);
  };

  const handleAddByline = (name) => {
    if (!hasEditPermission) {
      toast.error("You are not authorised to edit");
      return;
    }
    if (!byline.includes(name)) {
      handleBylineChange([...byline, name]);
    }
    setShowBylineDropdown(false);
  };

  const handleAddCustomByline = () => {
    const trimmedName = newBylineName.trim();
    if (trimmedName && !byline.includes(trimmedName)) {
      handleBylineChange([...byline, trimmedName]);
      setNewBylineName("");
      setShowBylineDropdown(false);
    }
  };

  return (
    <>
      <style>
        {`
          .publish-dropdown-item {
            font-family: 'Inter', sans-serif !important;
            font-size: 15px !important;
          }
          .publish-dropdown-item:hover {
            background-color: #f9fafb !important;
          }
          .publish-dropdown-item.selected {
            background-color: #f3f4f6 !important;
            font-weight: 500 !important;
          }
        `}
      </style>

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Title Field */}
        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Title <span className="text-gray-500 font-semibold">*</span>
          </label>
          <TextBox
            value={title}
            readOnly={true}
            placeholder="Enter title"
            stylingMode="outlined"
            className="custom-textarea border border-black"
          />
        </div>

        {/* Slug Field */}
        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Slug <span className="text-gray-500 font-semibold">*</span>
          </label>
          <TextBox
            value={slug}
            readOnly={true}
            placeholder="/my-story"
            stylingMode="outlined"
            className="custom-textarea border border-black"
          />
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Description <span className="text-gray-500 font-semibold">*</span>
          </label>
          <TextArea
            value={storyDetails?.storySummary || storyData?.description?.blocks[0]?.data?.text || ""}
            readOnly={!hasEditPermission}
            onValueChanged={(e) => {
              if (!hasEditPermission) {
                toast.error("You are not authorised to edit");
                return;
              }
              // Update parent component's state
              onFieldChange('storySummary', e.value);
            }}
            placeholder=""
            height={80}
            stylingMode="outlined"
            className="custom-textarea border border-black"
          />
        </div>

        {/* Byline Field */}
        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Byline <span className="text-gray-500 font-semibold">*</span>
          </label>
          <div className="p-2 min-h-[40px] flex flex-wrap gap-2 items-center border border-black">
            {byline.map((name, index) => (
              <div
                key={index}
                className="inline-flex items-center bg-white border border-gray-300 px-3 py-1 text-sm"
              >
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveByline(index)}
                  className="ml-2 text-gray-500 hover:text-gray-500 font-bold"
                >
                  ×
                </button>
              </div>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBylineDropdown(!showBylineDropdown)}
                className="inline-flex items-center bg-white text-xl px-3 py-1 hover:bg-gray-50"
              >
                +
              </button>

              {showBylineDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-white border border-gray-300 shadow-lg z-10 min-w-[200px]">
                  <div className="max-h-[200px] overflow-y-auto">
                    {authorOptions
                      .filter((name) => !byline.includes(name))
                      .map((name, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-50 text-sm"
                          onClick={() => handleAddByline(name)}
                        >
                          {name}
                        </div>
                      ))}

                  </div>

                  <div className="border-t p-2">
                    <input
                      type="text"
                      value={newBylineName}
                      onChange={(e) => setNewBylineName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCustomByline();
                      }}
                      placeholder="Add custom name..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomByline}
                      className="w-full mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Publish Field */}
        {/* <div>
          <label className="block text-sm text-gray-500 mb-2">
            Publish <span className="text-gray-500 font-semibold">*</span>
          </label>

          <div className="relative" ref={publishDropdownRef}>
            <div
              className="border border-black cursor-pointer"
              onClick={() => {
                setShowPublishDropdown(true);
                setIsCalendarOpen(false);
                if (!hasEditPermission) {
                  toast.error("You are not authorised to edit");
                  return;
                }
                setShowPublishDropdown(!showPublishDropdown);
              }}
            >
              <div className="px-4 py-2.5 flex justify-between items-center bg-white">
                <span className="text-sm">
                  {publishOption === "Now"
                    ? "Now"
                    : publishDateTime
                      ? new Date(publishDateTime).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                      : "Select date"}
                </span>
                <span className="text-gray-400">▼</span>
              </div>
            </div>

            {showPublishDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-black shadow-lg z-10">
                <div
                  className={`px-4 py-2.5 cursor-pointer flex justify-between items-center publish-dropdown-item ${publishOption === "Now" ? "selected" : ""}`}
                  onClick={() => handlePublishOptionChange("Now")}
                >
                  <span className="text-sm">Now</span>
                  {publishOption === "Now" && (
                    <span className="text-blue-500">✓</span>
                  )}
                </div>

                <div
                  className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-t border-black publish-dropdown-item ${publishOption === "Later" ? "selected" : ""}`}
                  onClick={() => {
                    handlePublishOptionChange("Later");
                    setIsCalendarOpen((prev) => !prev);
                  }}
                >
                  <span className="text-sm">Later</span>
                  {publishOption === "Later" && (
                    <span className="text-blue-500">✓</span>
                  )}
                </div>

                {publishOption === "Later" && isCalendarOpen && (
                  <div className="border-t border-black flex justify-center">
                    <div className="w-full max-w-xs">
                      <CustomCalendar
                        value={publishDateTime}
                        onValueChanged={(e) => {
                          setPublishDateTime(e.value);
                          setIsCalendarOpen(false);
                          setShowPublishDropdown(false);
                        }}
                        placeholder="Select publish date"
                        displayFormat="MMMM d, yyyy"
                        showTimeHeader={true}
                        opened={isCalendarOpen}
                        dropDownOptions={{ shading: false }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div> */}
      </div>
    </>
  );
}
