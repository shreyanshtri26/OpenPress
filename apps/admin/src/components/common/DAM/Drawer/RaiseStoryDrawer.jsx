// src/components/common/DAM/Drawer/RaiseStoryDrawer.jsx
import Accordion from '@/components/ui/kit/accordion';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import CustomButton from '../../CustomButton';
import CustomCalendar from '../../CustomCalendar';
import toast from 'react-hot-toast';

/**
 * @typedef {import('../../../../StoryEditor/RaiseStory').EditorOption} EditorOption
 */

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

// NEW: Permission helper function
const checkStoryPermission = (permissions, status, action) => {

  if (!permissions) return false;

  if (!status) return true;

  const statusMap = {
    "raise_a_story": "Raise a story",
    'ideas': 'Ideas',
    'in_progress': 'In progress',
    'in_review': 'In review',
    'ready_to_publish': 'Ready to publish',
    'published': 'Published',
  };

  const permissionKey = statusMap[status.toLowerCase().replace(/ /g, '_')];
  if (!permissionKey) return false;

  return permissions?.editorial?.[permissionKey]?.[action] ?? false;
};


/**
 * @param {Record<string, any> & { users?: EditorOption[] }} props
 */
export default function RaiseStoryDrawer({
  accordionArrowTemplate = (_, buttonElement) => { },
  taxonomies,
  /** @type {EditorOption[]} */ users = [],
  storyDetails,
  onFieldChange,
  taxonomySelections,
  onSaveDraft,
  isSaving,
  handleStoryAction,
  isSubmitting,
  onClose,
  showDecisionDropdown,
  permissions, //  NEW: Accept permissions
  storyStatus, //  NEW: Accept current story status
  onSubmit
}) {



  const [decision, setDecision] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState("");
  const publishDateRef = useRef(null);
  const drawerRef = useRef(null);
  const highlightedIndexRef = useRef(-1);
  const selectedItemsRef = useRef([]);
  const optionsListRef = useRef(null);

  const selectionTypeMap = useMemo(() => {
    const map = new Map();
    (taxonomies || []).forEach((taxonomy) => {
      if (!taxonomy?.name) return;
      // Check selectionType first, then permissions.Selection, then allowMultiple
      const selectionTypeValue = taxonomy.selectionType ?? taxonomy.permissions?.Selection ?? taxonomy.allowMultiple;
      const mode = normalizeSelectionType(selectionTypeValue);
      map.set(taxonomy.name, mode);
      map.set(taxonomy.name.toLowerCase(), mode);
    });
    return map;
  }, [taxonomies]);

  const getSelectionModeForField = useCallback(
    (field) => {
      if (!field) return 'single';
      const normalizedKey = typeof field === 'string' ? field.toLowerCase() : field;
      const direct = selectionTypeMap.get(field) || selectionTypeMap.get(normalizedKey);
      if (direct) {
        return direct;
      }

      const taxonomy = (taxonomies || []).find(
        (t) => t?.name && t.name.toLowerCase() === normalizedKey
      );

      if (taxonomy) {
        const mode = normalizeSelectionType(
          taxonomy.selectionType ?? taxonomy.allowMultiple
        );
        return mode;
      }
      return 'single';
    },
    [selectionTypeMap, taxonomies]
  );

  const getSelectedValues = useCallback(
    (field) => {
      const value = storyDetails[field];
      if (Array.isArray(value)) {
        return value;
      }
      if (value === undefined || value === null || value === '') {
        return [];
      }
      return [value];
    },
    [storyDetails]
  );

  const firstOf = (val) => {
    if (Array.isArray(val)) return val.length > 0 ? val[0] : null;
    if (val === undefined || val === null) return null;
    return val;
  };

  const storyDetailsRef = useRef(storyDetails);
  const onFieldChangeRef = useRef(onFieldChange);

  useEffect(() => {
    storyDetailsRef.current = storyDetails;
  }, [storyDetails]);

  useEffect(() => {
    onFieldChangeRef.current = onFieldChange;
  }, [onFieldChange]);

  // Set default Publish Date to today if not already set
  useEffect(() => {
    const latestDetails = storyDetailsRef.current;
    const changeHandler = onFieldChangeRef.current;
    if (typeof changeHandler !== 'function') return;

    if (!latestDetails["Publish Date"] || latestDetails["Publish Date"] === '') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const formatted = today.toISOString();
      changeHandler("Publish Date", formatted);
    }
  }, []);

  // Ensure that when a taxonomy switches from multi to single selection we coerce
  // any existing array value into a single primitive so the UI stays consistent.
  useEffect(() => {
    if (!Array.isArray(taxonomies) || taxonomies.length === 0) return;
    const latestDetails = storyDetailsRef.current;
    const changeHandler = onFieldChangeRef.current;
    if (typeof changeHandler !== 'function') return;

    taxonomies.forEach((taxonomy) => {
      const field = taxonomy?.name;
      if (!field) return;

      const mode = normalizeSelectionType(
        taxonomy.selectionType ?? taxonomy.allowMultiple
      );

      if (mode !== 'single') return;

      const currentValue = latestDetails?.[field];
      if (Array.isArray(currentValue)) {
        const coerced = firstOf(currentValue);
        if (currentValue.length !== 1 || currentValue[0] !== coerced) {
          changeHandler(field, coerced ?? '');
        } else if (currentValue.length === 1) {
          changeHandler(field, coerced ?? '');
        }
      }
    });
  }, [taxonomies]);

  const handleMultiSelectToggle = useCallback(
    (field, optionId) => {
      if (error) setError('');

      if (!checkStoryPermission(permissions ?? null, storyStatus || 'raise_a_story', 'Edit')) {
        toast.error("You don't have permission to edit this field.");
        return;
      }

      const existingValues = getSelectedValues(field);
      const isSelected = existingValues.includes(optionId);
      const updated = isSelected
        ? existingValues.filter((value) => value !== optionId)
        : [...existingValues, optionId];

      onFieldChange(field, updated);
    },
    [error, getSelectedValues, permissions, storyStatus, onFieldChange]
  );



  // ----- Replace buildTaxonomyAccordionItems with this robust version -----
  const buildTaxonomyAccordionItems = () => {
    const drawerKey = "raise-a-story";


    if (!Array.isArray(taxonomies) || taxonomies.length === 0) return [];

    const filtered = taxonomies.filter((t) => {
      // Mandatory taxonomies must always be shown
      if (t.isMendatory) return true;

      if (taxonomySelections && Object.keys(taxonomySelections).length > 0) {
        const byId = taxonomySelections?.[t.taxonomyId];
        const byName = taxonomySelections?.[t.name];

        const explicitTrue =
          (byId && byId?.[drawerKey] === true) || (byName && byName?.[drawerKey] === true);

        const explicitFalse =
          (byId && byId?.[drawerKey] === false) || (byName && byName?.[drawerKey] === false);

        if (explicitTrue) return true;
        if (explicitFalse) return false;
      }

      const apiPerm = t.permissions && (t.permissions["Raise a story"] ?? t.permissions["Raise a story".toLowerCase()]);
      if (typeof apiPerm === "boolean") {
        return apiPerm === true;
      }

      return true;
    });

    console.debug("RaiseStoryDrawer -> filtered taxonomies for drawer:", filtered.map(f => ({ name: f.name, taxonomyId: f.taxonomyId })));

    return filtered.map((t, index) => {
      const options = (t.values || []).map((v) => ({ id: v, name: v }));

      const normalizedName = String(t.name).toLowerCase();
      const selectionType = getSelectionModeForField(t.name);
      // Pass taxonomy values to filter users for editor/reporter fields
      const taxonomyValues = t.values || [];
      const content = normalizedName === "editor"
        ? renderUserList(users, t.name, selectionType, { filterRole: 'editor', allowedValues: taxonomyValues })
        : normalizedName === "author" || normalizedName === "reporter" || normalizedName === "journalist"
          ? renderUserList(users, t.name, selectionType, { filterRole: 'reporter', allowedValues: taxonomyValues })
          : selectionType === 'multi'
            ? renderMultiSelectList(options, t.name)
            : renderOptionsList(options, t.name);

      return {
        ID: index + 100, // keep away from static IDs (1,2...)
        title: `${t.name}${t.isMendatory ? "*" : ""}`,
        field: t.name,
        placeholder: `${t.name}${t.isMendatory ? " *" : ""}`,
        options,
        selectionType,
        content,
      };
    });
  };


  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        document.activeElement.blur();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);


  const validateFields = () => {
    const missing = [];

    // System fields
    const publishDate = storyDetails["Publish Date"];
    if (!publishDate || publishDate === '' || isNaN(new Date(publishDate).getTime())) {
      missing.push("Publish Date");
    }

    const editorMode = getSelectionModeForField('Editor');
    const editorValue = storyDetails['Editor'];
    const hasEditor = editorMode === 'multi'
      ? Array.isArray(editorValue) && editorValue.length > 0
      : Boolean(editorValue);
    if (!hasEditor) missing.push('Editor');

    // Dynamic taxonomy fields (check admin rules)
    taxonomies.forEach(t => {
      if (!t.isMendatory) {
        return;
      }

      const mode = getSelectionModeForField(t.name);
      const value = storyDetails[t.name];
      const hasValue = mode === 'multi'
        ? Array.isArray(value) && value.length > 0
        : Boolean(value);

      if (!hasValue) {
        missing.push(t.name);
      }
    });

    // if (showDecisionDropdown && !decision) missing.push("Decision");

    return missing;
  };

  // save changes (Auto save)
  const handleSaveChanges = async () => {
    try {
      const result = await onSaveDraft();
      // Only show success toast if actual changes were saved
      if (result === true) {
        toast.success("Changes have been saved successfully!");
      }
      // If result is false, the parent component handles the toast (permission denied, no changes, etc.)
    } catch (error) {
      toast.error("Failed to save story.");
      console.error("Save error:", error);
    }
  }

  // NEW: Submit handler with validation
  const handleSubmit = async () => {
    const missingFields = validateFields();

    console.log("missing fields >>>>", missingFields);

    if (missingFields.length > 0) {
      setError(`Please complete all required fields: ${missingFields.join(', ')}`);
      toast.error(`Missing fields: ${missingFields.join(', ')}`);
      return;
    }

    setError("");
    await handleSaveChanges();

    if (decision) {
      console.log("decision >>>", decision);
      await handleStoryAction(decision);
    }
  };

  const handleDecisionClick = (selectedDecision) => {
    setDecision(selectedDecision);
  };

  const handleInputChange = (field, value) => {
    if (error) setError("");

    if (field !== 'decision' && !checkStoryPermission(permissions ?? null, storyStatus || 'raise_a_story', 'Edit')) {
      toast.error("You don't have permission to edit this field.");
      return;
    }

    if (field === "Decision") {
      setDecision(value);
      return;
    }

    if (field === "Publish Date") {
      if (!value) {
        onFieldChange(field, "");
        return;
      }
      const selected = new Date(value);

      // Check if date is valid
      if (isNaN(selected.getTime())) {
        toast.error("Invalid date format");
        return;
      }

      const selectedDateOnly = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
      const todayDateOnly = new Date();
      todayDateOnly.setHours(0, 0, 0, 0);

      if (selectedDateOnly < todayDateOnly) {
        toast.error("Publish date cannot be in the past");
        return;
      }

      const formatted = selected.toISOString();
      onFieldChange(field, formatted);
      return;
    }

    onFieldChange(field, value);
    setSelectedItems([]);
  };





  const handleAccordionSelectionChanged = useCallback((e) => {
    const selectedItems = e.component.option('selectedItems') || [];
    setSelectedItems(selectedItems);
    highlightedIndexRef.current = -1;

    // Clear all highlights when accordion changes
    document.querySelectorAll('.option-item.highlighted').forEach(el => {
      el.classList.remove('highlighted');
    });
  }, []);

  //Added drawer click handler for calendar collapse
  const handleDrawerClick = useCallback((e) => {
    // First check: ensure the click is within the drawer boundaries
    if (!drawerRef.current || !drawerRef.current.contains(e.target)) {
      return;
    }

    // prevent closing if clicking on calendar or accordion elements
    const isCalendarClick = e.target.closest('.custom-date-box') ||
      e.target.closest('input[type="date"]') ||
      e.target.closest('input[type="datetime-local"]');

    const isAccordionClick = e.target.closest('.kit-accordion') ||
      e.target.closest('.kit-accordion-item');
  }, []);



  const getDisplayValue = (field, options, selectionType = 'single') => {
    const mode = normalizeSelectionType(selectionType);
    if (mode === 'multi') {
      const values = getSelectedValues(field);
      if (values.length === 0) {
        return null;
      }

      const labels = values
        .map((value) => {
          const match = options?.find((opt) => opt.id === value);
          return match?.name || value;
        })
        .filter(Boolean);

      return labels.length > 0 ? labels.join(', ') : null;
    }

    const value = storyDetails[field];
    if (!value) return null;

    const selected = options?.find(opt => opt.id === value);
    return selected?.name || null;
  };




  const getUserLabel = (id) => {
    if (!id) return null;
    const user = (users || []).find((candidate) => candidate.userId === id);
    return user?.fullName || user?.email || id;
  };

  const getUserDisplayValue = (field, selectionType = 'single') => {
    const mode = normalizeSelectionType(selectionType);

    if (mode === 'multi') {
      const ids = getSelectedValues(field);
      if (ids.length === 0) {
        return null;
      }

      const names = ids
        .map((id) => getUserLabel(id))
        .filter(Boolean);

      return names.length > 0 ? names.join(', ') : null;
    }

    const id = firstOf(storyDetails[field]);
    if (!id) return null;

    return getUserLabel(id);
  };


  const renderOptionsList = (options, field) => {
    const mode = getSelectionModeForField(field);
    const selectedValues = getSelectedValues(field);
    const singleSelected = firstOf(storyDetails[field]);

    //  This function should only render single-select lists.
    // If it's a multi-select field, delegate to the correct renderer.
    if (mode === 'multi') {
      return renderMultiSelectList(options, field);
    }

    return (
      <div className="options-list max-h-60 overflow-y-auto" ref={optionsListRef} data-field={field}>
        {options.map((option) => {
          const isSelected = singleSelected === option.id;
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
                  <button type="button" onClick={() => handleMultiSelectToggle(field, value)} aria-label={`Remove ${label}`}>
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <div className="options-list multi-select max-h-60 overflow-y-auto" ref={optionsListRef} data-field={field}>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.id);
            return (
              <div
                key={option.id}
                className={`option-item multi ${isSelected ? 'selected' : ''}`.trim()}
                data-value={option.id}
                onClick={() => handleMultiSelectToggle(field, option.id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                />
                <span>{option.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  const renderUserList = (options, field, selectionType = 'single', config = {}) => {
    const allowedValues = config.allowedValues || [];
    const filterRole = config.filterRole?.toLowerCase();

    // Filter users:
    // If filterRole is specified, match option.role (or Super User)
    // If allowedValues is configured (> 0), match fullName or userId
    const userOptions = (options || []).filter((option) => {
      const userFullName = option?.fullName || '';
      const userRole = (option?.role || '').toLowerCase();

      const roleMatches = !filterRole ||
        userRole === filterRole ||
        (filterRole === 'reporter' && (userRole === 'journalist' || userRole === 'author' || option?.isAuthor)) ||
        userRole === 'super user';

      const valueMatches = allowedValues.length === 0 || allowedValues.includes(userFullName) || allowedValues.includes(option?.userId);

      return roleMatches && valueMatches;
    });

    if (!userOptions || userOptions.length === 0) {
      return <div className="options-list"><div className="option-item text-gray-400">No {config.filterRole || 'users'} available</div></div>;
    }

    if (normalizeSelectionType(selectionType) === 'multi') {
      const editorOptions = userOptions.map((option) => ({
        id: option.userId,
        name: option.fullName || option.userId,
      }));
      return renderMultiSelectList(editorOptions, field);
    }
    const mode = getSelectionModeForField(field);
    const selectedValues = getSelectedValues(field);
    const singleSelected = firstOf(storyDetails[field]);

    return (
      <div className="options-list max-h-60 overflow-y-auto" ref={optionsListRef} data-field={field}>
        {userOptions.map((option) => {
          const optionId = option.userId;
          const optionLabel = option.fullName || option.userId;
          const isSelected = mode === 'multi'
            ? selectedValues.includes(optionId)
            : singleSelected === optionId;
          return (
            <div
              key={optionId}
              className={`option-item ${isSelected ? 'selected' : ''}`.trim()}
              data-value={optionId}
              onClick={() => handleInputChange(field, optionId)}
            >
              {optionLabel}
            </div>
          );
        })}
      </div>
    );
  };


  // Format publish date display
  const formatPublishDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  console.log("story status ...", storyStatus);
  // ✨ NEW: Check Edit and Decide permissions
  const hasEditPermission = storyStatus
    ? checkStoryPermission(permissions ?? null, storyStatus ? storyStatus : "raise_a_story", 'Edit')
    : true; // Allow edit for new stories (no status)

  const hasDecidePermission = storyStatus
    ? checkStoryPermission(permissions ?? null, storyStatus ? storyStatus : "raise_a_story", 'Decide')
    : false;

  // For super users, always allow
  const isSuperUser = false; // This should ideally come from user context, but we check via permissions




  const staticFields = [
    {
      ID: 1,
      title: "Publish Date*",
      field: "Publish Date",
      placeholder: "Publish Date *",
      isCalendar: true,
      content: (
        <div className={`calendar-container ${(storyStatus?.toLowerCase() === 'published' || !!storyDetails.publishedUrl) ? 'opacity-75 pointer-events-none' : ''}`}>
          <CustomCalendar
            value={storyDetails["Publish Date"] ? new Date(storyDetails["Publish Date"]) : null}
            onValueChanged={(e) => {
              if (storyStatus?.toLowerCase() === 'published' || !!storyDetails.publishedUrl) return;
              handleInputChange("Publish Date", e.value);
            }}
            disabled={storyStatus?.toLowerCase() === 'published' || !!storyDetails.publishedUrl}
            placeholder="Publish date *"
            showTimeHeader={true}
          />
        </div>
      ),
    },

  ];
  const taxonomyFields = buildTaxonomyAccordionItems();

  console.log("Taxonomy fields available:", taxonomyFields.map(f => ({ title: f.title, isMandatory: f.title.includes('*') })));

  const accordionData = [
    ...taxonomyFields,
    ...staticFields,
  ];

  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.activeElement.blur();

        const currentItemID = selectedItemsRef.current[0]?.ID || 0;
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
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);


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
  }, []);


  return (
    <>
      <div
        ref={drawerRef}
        className="h-full flex flex-col bg-white raise-story-drawer-container"
        onClick={handleDrawerClick}
        style={{
          position: 'relative'
        }}
      >
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">
          <Accordion
            dataSource={accordionData}
            keyExpr="ID"
            displayExpr="title"
            selectedItems={selectedItems}
            onSelectionChanged={handleAccordionSelectionChanged}
            collapsible={true}
            multiple={false}
            animationDuration={200}
            itemTitleRender={(item) => {
              let displayValue;
              if (item.field === "decision") {
                const selected = descision.find((opt) => opt.id === decision);
                displayValue = selected?.name || null;
              } else if (item.field === "Publish Date") {
                displayValue = storyDetails["Publish Date"]
                  ? new Date(storyDetails["Publish Date"]).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                  : null;
              }
              else if (typeof item.field === 'string' && ['editor', 'author', 'reporter', 'journalist'].includes(item.field.toLowerCase())) {
                displayValue = getUserDisplayValue(item.field, item.selectionType);
              } else {
                displayValue = getDisplayValue(item.field, item.options, item.selectionType);
              }

              const hasValue = Boolean(displayValue);
              const isMandatory = item.title?.includes('*');
              const cleanTitle = item.title?.replace('*', '').trim();

              return (
                <div
                  ref={item.field === "Publish Date" ? publishDateRef : null}
                  className="accordion-title-wrapper flex flex-col justify-center py-0.5"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {cleanTitle}
                    </span>
                    {isMandatory && <span className="text-red-500 text-xs font-bold leading-none">*</span>}
                  </div>
                  <div className="mt-0.5">
                    {hasValue ? (
                      <span className="text-sm font-semibold text-gray-900 block truncate">
                        {displayValue}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 block truncate font-normal">
                        Select {cleanTitle.toLowerCase()}...
                      </span>
                    )}
                  </div>
                </div>
              );
            }}
            itemRender={(item) => (
              <div className="accordion-content-wrapper">{item.content}</div>
            )}
          />


          {/* Updated Submit Button Section */}
          <div className="mt-8 flex flex-col justify-center items-center gap-2">
            {error && (
              <div className="text-red-500 text-sm font-medium mb-2">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <CustomButton
                variant="black"
                className="px-8"
                onClick={() => {
                  console.log("has edit permission", hasEditPermission);
                  if (!hasEditPermission) {
                    toast.error("You don't have permission to save changes.");
                    return;
                  }
                  handleSaveChanges();
                }}
                disabled={!hasEditPermission || isSaving}
                style={!hasEditPermission ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </CustomButton>
              {(onSubmit && (storyStatus === undefined || storyStatus?.toLowerCase() === 'in_progress' || storyStatus?.toLowerCase() === 'raise_a_story')) && (
                <CustomButton
                  variant="white"
                  className="w-full sm:w-auto border border-black text-black hover:bg-black hover:text-white transition-colors"
                  onClick={async () => {
                    if (!hasEditPermission) {
                      toast.error("You don't have permission to submit this story.");
                      return;
                    }
                    if (storyStatus?.toLowerCase() === 'in_progress') {
                      await handleStoryAction("in_review");
                    } else {
                      onSubmit();
                    }
                  }}
                  disabled={isSubmitting || !hasEditPermission || isSaving}
                  style={!hasEditPermission ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </CustomButton>
              )}
            </div>
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
          margin-bottom: 0px !important;
          position: relative;
          border-bottom: 1px solid black !important;
          padding-bottom: 12px;
          margin-bottom: 2px !important;
        }
        /* Hide accordion arrow */
        /* Closed items */
 
        /* Opened items */
 
        .accordion-title-wrapper {
          font-family: 'Inter', sans-serif !important;
          font-size: 15px !important;
          font-weight: 400 !important;
          width: 100%;
          cursor: pointer;
          padding: 5px 0;
        }
 
        .accordion-content-wrapper {
          padding: 0 !important;
        }
 
        .options-list {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background-color: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          padding: 6px;
          margin-top: 4px;
        }
 
        .option-item {
          font-family: inherit;
          font-size: 14px !important;
          color: #374151 !important;
          font-weight: 400 !important;
          padding: 7px 12px !important;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
 
        .option-item:hover {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
        }

        .option-item.highlighted {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
          font-weight: 500 !important;
        }

        .option-item.selected {
          background-color: #111827 !important;
          color: #ffffff !important;
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
          gap: 6px;
          background-color: white;
          color: black;
          padding: 4px 4px;
          border-radius: 9999px;
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
 
        /* Custom single-letter day abbreviations */
        table[role="grid"] thead th {
          font-size: 0 !important;
          position: relative;
        }
 
        table[role="grid"] thead th::before {
          font-size: 14px !important;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: normal;
        }
 
        /* Individual day letters */
        table[role="grid"] thead th:nth-child(1)::before {
          content: 'S' !important;
        }
        table[role="grid"] thead th:nth-child(2)::before {
          content: 'M' !important;
        }
        table[role="grid"] thead th:nth-child(3)::before {
          content: 'T' !important;
        }
        table[role="grid"] thead th:nth-child(4)::before {
          content: 'W' !important;
        }
        table[role="grid"] thead th:nth-child(5)::before {
          content: 'T' !important;
        }
        table[role="grid"] thead th:nth-child(6)::before {
          content: 'F' !important;
        }
        table[role="grid"] thead th:nth-child(7)::before {
          content: 'S' !important;
        }
 
        /* Calendar Navigator Layout Fix */
 
        /* Limit the width of the month title button */
 
        /* Ensure navigation buttons maintain consistent size */
 
        /* Center the month text within the button */
 
        /* Calendar Container */
        .calendar-container {
          padding: 8px 0px;
        }
 
        .calendar-container input[type="date"],
        .calendar-container input[type="datetime-local"] {
          width: 100% !important;
          padding: 8px 12px;
          border: 1px solid black;
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
        }
      `}</style>
    </>
  );

}
