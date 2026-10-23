// src/components/publishTabs/PlacementTab.jsx
import Accordion from '@/components/ui/kit/accordion';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import CustomCalendar from '../common/CustomCalendar';

/**
 * @typedef {import('../StoryEditor/RaiseStory').EditorOption} EditorOption
 */

/**
 * @param {Record<string, any> & { users?: EditorOption[] }} props
 */
const PlacementTab = ({
  storyData,
  hasEditPermission,
  formData = {},
  onFieldChange = () => { },
  storyDetails = {},             // NEW
  setStoryDetails = () => { },    // NEW
  taxonomies = [],
  taxonomySelections = {},
  /** @type {EditorOption[]} */ users = [],
  isEditingPublishedArticle = false,
}) => {

  console.log('PlacementTab: isEditingPublishedArticle =', isEditingPublishedArticle);

  console.log("story data in placement Tab >>>", storyData);


  const normalizeSelectionType = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized.includes('multi')) {
        return 'multi';
      }
      if (normalized.includes('single')) {
        return 'single';
      }
      return normalized === 'true' ? 'multi' : 'single';
    }
    if (typeof value === 'boolean') {
      return value ? 'multi' : 'single';
    }
    return 'single';
  };

  const selectionTypeMap = useMemo(() => {
    const map = {};
    (taxonomies || []).forEach((taxonomy) => {
      if (!taxonomy?.name) return;
      map[taxonomy.name] = normalizeSelectionType(
        taxonomy.selectionType ?? taxonomy.allowMultiple ?? null,
      );
    });
    return map;
  }, [taxonomies]);

  const getSelectionModeForField = useCallback(
    (field) => selectionTypeMap[field] || 'single',
    [selectionTypeMap]
  );

  const getRawFieldValue = useCallback(
    (field) => {
      if (storyDetails && Object.prototype.hasOwnProperty.call(storyDetails, field)) {
        return storyDetails[field];
      }
      if (formData && Object.prototype.hasOwnProperty.call(formData, field)) {
        return formData[field];
      }
      return undefined;
    },
    [storyDetails, formData]
  );

  const getSelectedValues = useCallback(
    (field) => {
      const raw = getRawFieldValue(field);
      if (Array.isArray(raw)) {
        return raw;
      }
      if (raw === undefined || raw === null || raw === '') {
        return [];
      }
      return [raw];
    },
    [getRawFieldValue]
  );

  const handleMultiSelectToggle = useCallback(
    (field, optionId) => {
      if (!hasEditPermission) {
        toast.error("You are not authorised to edit");
        return;
      }

      const existingValues = getSelectedValues(field);
      const isSelected = existingValues.includes(optionId);
      const updated = isSelected
        ? existingValues.filter((value) => value !== optionId)
        : [...existingValues, optionId];

      onFieldChange(field, updated);
      setStoryDetails((prev) => ({
        ...prev,
        [field]: updated,
      }));
    },
    [getSelectedValues, hasEditPermission, onFieldChange, setStoryDetails]
  );


  const buildTaxonomyAccordionItems = () => {
    // Use the actual story status as the drawer key, defaulting to "ready_to_publish"
    const drawerKey = storyData?.status === "published" ? "published" : "ready_to_publish";

    console.log("PublishDrawer -> taxonomies:", taxonomies);
    console.log("PublishDrawer -> taxonomySelections:", taxonomySelections);

    if (!Array.isArray(taxonomies)) return [];

    const filtered = taxonomies.filter((t) => {
      if (taxonomySelections && Object.keys(taxonomySelections).length > 0) {
        const byId = taxonomySelections[t.taxonomyId];
        const byName = taxonomySelections[t.name];

        // Check for explicit match with the current drawerKey
        const explicitTrue =
          (byId && byId[drawerKey] === true) ||
          (byName && byName[drawerKey] === true);

        const explicitFalse =
          (byId && byId[drawerKey] === false) ||
          (byName && byName[drawerKey] === false);

        if (explicitTrue) return true;
        if (explicitFalse) return false;

        // For "published" status, also check "ready_to_publish" key as fallback
        if (drawerKey === "published") {
          const fallbackTrue =
            (byId && byId["ready_to_publish"] === true) ||
            (byName && byName["ready_to_publish"] === true);

          const fallbackFalse =
            (byId && byId["ready_to_publish"] === false) ||
            (byName && byName["ready_to_publish"] === false);

          if (fallbackTrue) return true;
          if (fallbackFalse) return false;
        }
      }

      // Fallback: taxonomy permissions
      const apiPerm = t.permissions?.["Publish drawer"];
      if (typeof apiPerm === "boolean") return apiPerm;

      return true;
    });

    return filtered.map((t, index) => {
      // Determine if this field should be read-only for published articles
      const isPublished = storyData?.status === "published";
      const isReadOnlyField = (isEditingPublishedArticle || isPublished) && t.name.toLowerCase() === 'section';

      if (t.name.toLowerCase() === 'section') {
        console.log('PlacementTab Section field: isEditingPublishedArticle =', isEditingPublishedArticle, 'isPublished =', isPublished, 'isReadOnlyField =', isReadOnlyField);
      }

      const options = (t.values || []).map(v => ({ id: v, name: v }));
      const normalizedName = t.name.toLowerCase();
      const selectionType = getSelectionModeForField(t.name);
      const content = isReadOnlyField
        ? renderReadOnlyValue(options, t.name, selectionType)
        : normalizedName === "editor"
          ? renderUserList(users, t.name, selectionType, { allowedValues: t.values || [] })
          : normalizedName === "author" || normalizedName === "reporter" || normalizedName === "journalist"
            ? renderUserList(users, t.name, selectionType, { allowedValues: t.values || [] })
            : selectionType === 'multi'
              ? renderMultiSelectList(options, t.name)
              : renderOptionsList(options, t.name);

      return {
        ID: index + 100,
        title: `${t.name}${t.isMendatory ? "*" : ""}`,
        field: t.name,
        placeholder: `${t.name}${t.isMendatory ? "*" : ""}`,
        options,
        selectionType,
        content,
        displayValue: null,
      };
    });
  };



  // Simplified state management using the kit's selectedItems approach
  const [selectedItems, setSelectedItems] = useState([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showPublishDropdown, setShowPublishDropdown] = useState(false);

  const drawerRef = useRef(null);
  const publishDropdownRef = useRef(null);
  const highlightedIndexRef = useRef(-1);
  const selectedItemsRef = useRef([]);
  const pendingDateRef = useRef(null);
  const [publishMode, setPublishMode] = useState(
    storyDetails["Publish Date"] ? "Later" : "Now"
  );

  // Dynamically build dropdown options (Now + Selected Date)
  const getPublishDropdownOptions = () => {
    const dateValue = storyDetails["Publish Date"] ?? formData["Publish Date"];

    if (dateValue) {
      // When a date exists → show: [Selected Date, Now]
      return [
        {
          value: "Later",
          label: new Date(dateValue).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        },
        { value: "Now", label: "Now" }
      ];
    }

    // First time → show: [Now, Later]
    return [
      { value: "Now", label: "Now" },
      { value: "Later", label: "Later" },
    ];
  };


  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);


  const handleAccordionSelectionChanged = useCallback((e) => {
    const selected = e.component.option("selectedItems") || [];
    setSelectedItems(selected);
    highlightedIndexRef.current = -1;

    document.querySelectorAll(".option-item.highlighted")
      .forEach(el => el.classList.remove("highlighted"));

    const publishItem = selected.find(i => i.field === "Publish Date");
    setIsCalendarOpen(!!publishItem);
  }, []);


  // Handle clicks outside the publish dropdown to close it
  useEffect(() => {
    const handlePublishOutsideClick = (event) => {
      if (showPublishDropdown &&
        publishDropdownRef.current &&
        !publishDropdownRef.current.contains(event.target) &&
        !event.target.closest('.kit-datebox')) {
        setShowPublishDropdown(false);
      }
    };

    if (showPublishDropdown) {
      document.addEventListener('mousedown', handlePublishOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handlePublishOutsideClick);
    };
  }, [showPublishDropdown]);

  const handleDrawerClick = useCallback((e) => {
    if (!drawerRef.current || !drawerRef.current.contains(e.target)) {
      return;
    }

    const isAccordionClick =
      e.target.closest(".kit-accordion") ||
      e.target.closest(".kit-accordion-item");

    if (!isAccordionClick && isCalendarOpen) {
      setSelectedItems(prev => prev.filter(item => item.field !== "Publish Date"));
      setIsCalendarOpen(false);
    }
  }, [isCalendarOpen]);



  const getOptionsFromTaxonomy = (taxonomy) =>
    taxonomy.values?.map(v => ({ id: v, name: v })) || [];


  const handleInputChange = useCallback((field, value) => {
    if (!hasEditPermission) {
      toast.error("You are not authorised to edit");
      return;
    }

    if (getSelectionModeForField(field) === 'multi') {
      handleMultiSelectToggle(field, value);
      return;
    }

    onFieldChange(field, value);
    setStoryDetails(prev => ({
      ...prev,
      [field]: value,
    }));

    setSelectedItems([]);
  }, [getSelectionModeForField, handleMultiSelectToggle, hasEditPermission, onFieldChange, setStoryDetails]);




  const getDisplayValue = (field, options, selectionType = 'single') => {
    const mode = normalizeSelectionType(selectionType);
    const selectedValues = getSelectedValues(field);

    if (mode === 'multi') {
      if (selectedValues.length === 0) {
        return null;
      }

      const labels = selectedValues
        .map((value) => {
          const match = options?.find((opt) => opt.id === value);
          return match?.name || value;
        })
        .filter(Boolean);

      return labels.length > 0 ? labels.join(', ') : null;
    }

    const value = selectedValues[0];
    if (!value) {
      return null;
    }
    const selected = options?.find((opt) => opt.id === value);
    return selected?.name || value || null;
  };

  const renderUserList = (userOptions, field, selectionType = 'single', config = {}) => {
    const allowedValues = config.allowedValues || [];

    // Filter users: only show users whose fullName is in the taxonomy values array
    // Role-based filtering is already handled in TaxonomyTab when adding values
    const filteredUsers = (userOptions || []).filter((user) => {
      const userFullName = user?.fullName || '';
      // If no allowed values are configured, show all users; otherwise filter by taxonomy values
      return allowedValues.length === 0 || allowedValues.includes(userFullName);
    });

    if (!Array.isArray(filteredUsers) || filteredUsers.length === 0) {
      return (
        <div className="options-list" data-field={field}>
          <div className="option-item">No users available</div>
        </div>
      );
    }

    if (normalizeSelectionType(selectionType) === 'multi') {
      const transformed = filteredUsers.map((user) => ({
        id: user.userId,
        name: user.fullName || user.email || user.userId,
      }));
      return renderMultiSelectList(transformed, field);
    }

    const selectedValues = getSelectedValues(field);

    return (
      <div className="options-list max-h-60 overflow-y-auto" data-field={field}>
        {filteredUsers.map((user) => {
          const isSelected = selectedValues.includes(user.userId);
          return (
            <div
              key={user.userId}
              className={`option-item ${isSelected ? 'selected' : ''}`.trim()}
              data-value={user.userId}
              onClick={() => handleInputChange(field, user.userId)}
            >
              {user.fullName || user.email || user.userId}
            </div>
          );
        })}
      </div>
    );
  };


  const renderOptionsList = (options, field) => {
    const selectedValues = getSelectedValues(field);
    return (
      <div className="options-list max-h-60 overflow-y-auto" data-field={field}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.id);
          return (
            <div
              key={option.id}
              className={`option-item ${isSelected ? 'selected' : ''}`.trim()}
              data-value={option.id}
              onClick={() => handleInputChange(field, option.id)}
            >
              {option.name}
            </div>
          );
        })}
      </div>
    );
  };


  const renderMultiSelectList = (options, field) => {
    const selectedValues = getSelectedValues(field);
    return (
      <div className="multi-select-wrapper">
        {selectedValues.length > 0 && (
          <div className="selected-tags">
            {selectedValues.map((value) => {
              const option = options.find((opt) => opt.id === value);
              const label = option?.name || value;
              return (
                <span key={value} className="selected-tag">
                  {label}
                  <button
                    type="button"
                    onClick={() => handleMultiSelectToggle(field, value)}
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <div className="options-list multi-select max-h-60 overflow-y-auto" data-field={field}>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.id);
            return (
              <div
                key={option.id}
                className={`option-item multi ${isSelected ? 'selected' : ''}`.trim()}
                data-value={option.id}
                onClick={() => handleMultiSelectToggle(field, option.id)}
              >
                <input type="checkbox" readOnly checked={isSelected} />
                <span>{option.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  // Render a read-only display value (used for Section when editing published articles)
  const renderReadOnlyValue = (options, field, selectionType) => {
    const displayValue = getDisplayValue(field, options, selectionType);
    return (
      <div className="read-only-field px-4 py-2 text-gray-700 bg-gray-50 cursor-not-allowed">
        {displayValue || <span className="text-gray-400 italic">Not selected</span>}
        <span className="ml-2 text-xs text-gray-400">(locked)</span>
      </div>
    );
  };


  const taxonomyFields = buildTaxonomyAccordionItems();




  const accordionData = [
    ...taxonomyFields,
  ];




  useEffect(() => {
    setSelectedItems([{ ID: 1, field: "section" }]);
  }, []);


  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();

        const currentItemID = selectedItems[0]?.ID || 0;
        let nextItemID = currentItemID + 1;

        // Get max ID from accordionData
        const maxID = accordionData.length > 0 ? Math.max(...accordionData.map(item => item.ID)) : 1;

        // Circular navigation: if nextItemID exceeds maxID, go back to 1
        if (nextItemID > maxID) {
          nextItemID = 1;
        }

        const nextItem = accordionData.find(item => item.ID === nextItemID);

        if (nextItem) {
          setSelectedItems([nextItem]);

          if (nextItem.field === "Publish Date") {
            setIsCalendarOpen(true);
          } else {
            setIsCalendarOpen(false);
          }
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [selectedItems, accordionData]);


  // Arrow key handler with direct DOM manipulation (NO REACT RE-RENDERS)
  useEffect(() => {
    const handleArrowKeys = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();

        // Get currently open options list
        const optionsList = document.querySelector('.accordion-content-wrapper:not([style*="display: none"]) .options-list');
        if (!optionsList) return;

        const items = optionsList.querySelectorAll('.option-item');
        if (items.length === 0) return;

        // Calculate new index
        let newIndex = highlightedIndexRef.current;

        if (e.key === 'ArrowDown') {
          newIndex = newIndex < items.length - 1 ? newIndex + 1 : 0;
        } else if (e.key === 'ArrowUp') {
          newIndex = newIndex > 0 ? newIndex - 1 : items.length - 1;
        }

        // Update ref (no React state change)
        highlightedIndexRef.current = newIndex;

        // Direct DOM manipulation - update all items' classes
        items.forEach((item, idx) => {
          if (idx === newIndex) {
            item.classList.add('highlighted');
          } else {
            item.classList.remove('highlighted');
          }
        });
      }
    };

    document.addEventListener('keydown', handleArrowKeys);
    return () => document.removeEventListener('keydown', handleArrowKeys);
  }, []);


  // NEW: Enter key handler to select highlighted item
  useEffect(() => {
    const handleEnterKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        // Get currently open options list
        const optionsList = document.querySelector('.accordion-content-wrapper:not([style*="display: none"]) .options-list');
        if (!optionsList) return;

        const items = optionsList.querySelectorAll('.option-item');
        if (items.length === 0) return;

        // Check if there's a highlighted item
        if (highlightedIndexRef.current === -1 || highlightedIndexRef.current >= items.length) return;

        // Get the highlighted item and its value
        const highlightedItem = items[highlightedIndexRef.current];
        const value = highlightedItem.getAttribute('data-value');
        const field = optionsList.getAttribute('data-field');

        if (value && field) {
          // Call the existing click handler to select the item
          handleInputChange(field, value);
        }
      }
    };

    document.addEventListener('keydown', handleEnterKey);
    return () => document.removeEventListener('keydown', handleEnterKey);
  }, [handleInputChange]);

  const getUserLabel = (id) => {
    if (!id) return null;
    const user = (users || []).find((candidate) => candidate.userId === id);
    return user?.fullName || user?.email || id;
  };

  const getUserDisplayValue = (field, selectionType) => {
    const mode = selectionType
      ? normalizeSelectionType(selectionType)
      : getSelectionModeForField(field);
    const selectedValues = getSelectedValues(field);

    if (mode === 'multi') {
      if (selectedValues.length === 0) {
        return null;
      }

      const names = selectedValues
        .map((id) => getUserLabel(id))
        .filter(Boolean);

      return names.length > 0 ? names.join(', ') : null;
    }

    const id = selectedValues[0];
    if (!id) {
      return null;
    }

    return getUserLabel(id);
  };


  console.log("form data >>>", formData);


  return (
    <>
      {(storyData?.status === "ready_to_publish" || storyData?.status === "published" || storyData?.status === "scheduled") && (
        <div className="p-4 flex flex-col gap-4" ref={drawerRef} onClick={handleDrawerClick}>
          <Accordion
            dataSource={accordionData}
            keyExpr="ID"
            displayExpr="title"
            selectedItems={selectedItems}
            onSelectionChanged={handleAccordionSelectionChanged}
            collapsible={true}
            multiple={false}
            animationDuration={200}
            height="auto"
            className="custom-accordion"
            itemTitleRender={(item) => {
              let displayValue = null;

              if (item.field === "Publish Date") {
                const dateValue = storyDetails["Publish Date"] ?? formData["Publish Date"];
                displayValue = dateValue
                  ? new Date(dateValue).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                  : null;
              } else if (typeof item.field === 'string' && ['editor', 'author', 'reporter', 'journalist'].includes(item.field.toLowerCase())) {
                displayValue = getUserDisplayValue(item.field, item.selectionType);
              } else {
                displayValue = getDisplayValue(item.field, item.options, item.selectionType);
              }

              return (
                <div className="accordion-title-wrapper">
                  <span className={displayValue ? "text-black" : "text-gray-500"}>
                    {displayValue || item.placeholder}
                  </span>
                </div>
              );
            }}
            itemRender={(item) => (
              <div className="accordion-content-wrapper">
                {item.content}
              </div>
            )}
          />
        </div>
      )}


      <div className=' -mt-4'>

        {/* Keywords Field */}
        <div className="p-4 pt-0">
          <label className="block text-sm text-gray-500 mb-2">
            Keywords
          </label>
          <div className="p-2 min-h-[40px] flex flex-wrap gap-2 items-center border border-black">
            {(Array.isArray(storyDetails?.keywords) ? storyDetails.keywords : []).map((keyword, index) => (
              <div
                key={index}
                className="inline-flex items-center bg-white border border-gray-300 px-3 py-1 text-sm"
              >
                <span>{keyword}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasEditPermission) {
                      toast.error("You are not authorised to edit");
                      return;
                    }
                    const updatedKeywords = (storyDetails?.keywords || []).filter((_, i) => i !== index);
                    onFieldChange('keywords', updatedKeywords);
                    setStoryDetails(prev => ({
                      ...prev,
                      keywords: updatedKeywords,
                    }));
                  }}
                  className="ml-2 text-gray-500 hover:text-gray-500 font-bold"
                >
                  ×
                </button>
              </div>
            ))}

            <div className="relative">
              <input
                type="text"
                placeholder="Add keyword..."
                className="px-2 py-1 text-sm border-none outline-none bg-transparent"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes(',')) {
                    if (!hasEditPermission) {
                      toast.error("You are not authorised to edit");
                      e.target.value = val.replace(/,/g, '');
                      return;
                    }

                    const parts = val.split(',');
                    const lastPart = parts.pop().trim();
                    const finishedParts = parts.filter(p => p.trim() !== '').map(p => p.trim());

                    if (finishedParts.length > 0) {
                      const currentKeywords = Array.isArray(storyDetails?.keywords) ? storyDetails.keywords : [];
                      const newKeywords = finishedParts.filter(p => !currentKeywords.includes(p));

                      if (newKeywords.length > 0) {
                        const updatedKeywords = [...currentKeywords, ...newKeywords];
                        onFieldChange('keywords', updatedKeywords);
                        setStoryDetails(prev => ({
                          ...prev,
                          keywords: updatedKeywords,
                        }));
                      }

                      e.target.value = lastPart;
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (!hasEditPermission) {
                      toast.error("You are not authorised to edit");
                      return;
                    }
                    if (value) {
                      const parts = value.split(',').map(p => p.trim()).filter(p => p !== '');
                      const currentKeywords = Array.isArray(storyDetails?.keywords) ? storyDetails.keywords : [];
                      const newUniqueKeywords = parts.filter(p => !currentKeywords.includes(p));

                      if (newUniqueKeywords.length > 0) {
                        const updatedKeywords = [...currentKeywords, ...newUniqueKeywords];
                        onFieldChange('keywords', updatedKeywords);
                        setStoryDetails(prev => ({
                          ...prev,
                          keywords: updatedKeywords,
                        }));
                      }
                      e.target.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-4 pt-0">
          <label className="block text-sm text-gray-500 mb-2">
            Publish <span className="text-gray-500 font-semibold">*</span>
          </label>

          <div className="relative" ref={publishDropdownRef}>

            <div
              className={`border border-black bg-white ${(!hasEditPermission || isEditingPublishedArticle || (storyData?.status?.toLowerCase() === 'published') || !!storyDetails.publishedUrl) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
              onClick={() => {
                if (!hasEditPermission) {
                  toast.error("You are not authorised to edit");
                  return;
                }
                if (isEditingPublishedArticle || (storyData?.status?.toLowerCase() === 'published') || !!storyDetails.publishedUrl) {
                  toast.error("Publish date cannot be changed for published stories");
                  return;
                }
                setShowPublishDropdown((prev) => !prev);
              }}
            >
              <div className="px-4 py-2.5 flex justify-between items-center bg-white">
                <span className="text-sm">
                  {publishMode === "Now"
                    ? "Now"
                    : storyDetails["Publish Date"] || formData["Publish Date"]
                      ? new Date(
                        storyDetails["Publish Date"] ??
                        formData["Publish Date"]
                      ).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                      : "Select date"}
                </span>
                <span className="text-gray-400">▼</span>
              </div>
            </div>

            {/* DROPDOWN */}
            {showPublishDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-black shadow-lg z-10">

                {/* NOW OPTION */}
                <div
                  className={`px-4 py-2.5 flex justify-between items-center ${storyData?.status?.toLowerCase() === 'published' || !!storyDetails.publishedUrl ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'} ${publishMode === "Now" ? "bg-gray-100 font-medium" : ""}`}
                  onClick={() => {
                    if (storyData?.status?.toLowerCase() === 'published' || !!storyDetails.publishedUrl) return;
                    setPublishMode("Now");
                    const now = new Date();
                    handleInputChange("Publish Date", now);
                    setShowPublishDropdown(false);
                    setIsCalendarOpen(false);
                  }}
                >
                  <span className="text-sm">Now</span>
                  {publishMode === "Now" && <span className="text-blue-500">✓</span>}
                </div>

                {/* LATER OPTION */}
                <div
                  className={`px-4 py-2.5 flex justify-between items-center border-t border-black ${storyData?.status?.toLowerCase() === 'published' || !!storyDetails.publishedUrl ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'} ${publishMode === "Later" ? "bg-gray-100 font-medium" : ""}`}
                  onClick={() => {
                    if (storyData?.status?.toLowerCase() === 'published' || !!storyDetails.publishedUrl) return;
                    setPublishMode("Later");
                    setIsCalendarOpen((prev) => !prev);
                  }}
                >
                  <span className="text-sm">Later</span>
                  {publishMode === "Later" && (
                    <span className="text-blue-500">✓</span>
                  )}
                </div>

                {/* CALENDAR WHEN "LATER" SELECTED */}
                {publishMode === "Later" && isCalendarOpen && (
                  <div className="border-t border-black py-4 flex justify-center">
                    <div className="w-full max-w-xs">
                      <CustomCalendar
                        value={
                          storyDetails["Publish Date"]
                            ? new Date(storyDetails["Publish Date"])
                            : new Date()
                        }
                        onValueChanged={({ value }) => {
                          if (storyData?.status?.toLowerCase() === 'published' || !!storyDetails.publishedUrl) return;
                          handleInputChange("Publish Date", value);
                          setPublishMode("Later");
                        }}
                        onClosed={() => {
                          setSelectedItems(prev => prev.filter(item => item.field !== "Publish Date"));
                          setIsCalendarOpen(false);
                        }}
                        disabled={storyData?.status?.toLowerCase() === 'published' || !!storyDetails.publishedUrl}
                        placeholder="Select date and time"
                        displayFormat="MMMM d, yyyy hh:mm a"
                        showTimeHeader={true}
                        opened={isCalendarOpen}
                        dropDownOptions={{
                          shading: false,
                          hideOnOutsideClick: true,
                          closeOnBackButton: true
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Global Styles */}
      <style jsx global>{`
        /* Accordion styling to look like SelectBox */
        .kit-accordion {
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }


        .kit-accordion-item {
          border: none !important;
          margin-bottom: 0 !important;
          position: relative;
          border-bottom: 1px solid black !important;
          padding-bottom: 12px !important;
          margin-bottom: 2px !important;
        }


        /* Hide accordion arrow */

        .publish-mode {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.publish-label {
  font-size: 14px;
  font-family: "Inter", sans-serif;
}

.publish-select {
  border: 1px solid #000;
  padding: 8px;
  font-size: 15px;
  font-family: "Inter", sans-serif;
  background: #fff;
  cursor: pointer;
}


        /* Collapsed state - no extra height */


        /* Opened state */


        .accordion-title-wrapper {
          font-family: "Inter", sans-serif !important;
          font-size: 15px !important;
          font-weight: 400 !important;
          width: 100%;
        }


        .accordion-content-wrapper {
          padding: 0 !important;
        }


        /* Options List Styling */
        .options-list {
          display: flex;
          flex-direction: column;
          padding-top: 8px;
          padding-bottom: 8px;
          border: 1px solid black;
        }


        .option-item {
          font-family: "Inter", sans-serif !important;
          font-size: 15px !important;
          color: #111 !important;
          font-weight: 400 !important;
          padding: 4px 16px !important;
          cursor: pointer;
          transition: background-color 0.1s ease;
        }


        .option-item:last-child {
          border-bottom: none;
        }


        .option-item:hover {
          background-color: #f9fafb;
        }

        .option-item.highlighted {
          background-color: #e5e7eb !important;
          font-weight: 500 !important;
        }

        .option-item.selected {
          background-color: #f3f4f6 !important;
          font-weight: 500 !important;
        }

        .multi-select-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .selected-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .selected-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: white;
          color: black;
          padding: 4px 4px;
          font-size: 13px;
        }

        .selected-tag button {
          color: inherit;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          padding: 0;
        }

        .options-list.multi-select .option-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .options-list.multi-select input[type="checkbox"] {
          pointer-events: none;
        }


        /* Calendar Container */
.calendar-container {
  padding: 8px 0px;
}

.calendar-container .kit-datebox {
  width: 100% !important;
}

/* Hide the input of DateBox */

/* Single letter week labels */
table[role="grid"] thead th {
  font-size: 0 !important;
  position: relative;
}

table[role="grid"] thead th::before {
  font-size: 14px !important;
  font-weight: normal;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

table[role="grid"] thead th:nth-child(1)::before { content: 'S'; }
table[role="grid"] thead th:nth-child(2)::before { content: 'M'; }
table[role="grid"] thead th:nth-child(3)::before { content: 'T'; }
table[role="grid"] thead th:nth-child(4)::before { content: 'W'; }
table[role="grid"] thead th:nth-child(5)::before { content: 'T'; }
table[role="grid"] thead th:nth-child(6)::before { content: 'F'; }
table[role="grid"] thead th:nth-child(7)::before { content: 'S'; }

      `}</style>
    </>
  );
};


export default PlacementTab;
