import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import env from '@/utils/env';
import apiFetch from '../../utils/api';
import {
  DEFAULT_TAXONOMY_GROUPS,
  TAXONOMY_STATUSES,
} from "./constants";
import {
  createEmptyTaxonomySelection,
  createInitialTaxonomySelections,
} from "./utils";
import CustomButton from "../common/CustomButton";
import ManageTaxonomyGroupsModal from "./ManageTaxonomyGroupsModal";
import ManageTaxonomyValuesModal from "./ManageTaxonomyValuesModal";
import ManageMoreStoryCardTaxonomiesModal from "./ManageMoreStoryCardTaxonomiesModal";
import toast from "react-hot-toast";
import { UserContext } from "../../context/UserContext";



const normalizeSelectionType = (value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes("multi")) {
      return "multi";
    }
    if (normalized.includes("single")) {
      return "single";
    }
    return normalized === "true" ? "multi" : "single";
  }
  if (typeof value === "boolean") {
    return value ? "multi" : "single";
  }
  return "single";
};

const WIDGET_STATUS_KEYS = new Set(["more-story-card", "thumbnail-grid"]);
const VISIBLE_TAXONOMY_STATUSES = TAXONOMY_STATUSES.filter(
  (status) => !WIDGET_STATUS_KEYS.has(status.key)
);

const TaxonomyTab = () => {

  const [taxonomyGroups, setTaxonomyGroups] = useState([]);
  const [taxonomySelections, setTaxonomySelections] = useState([]);
  const [activeTaxonomyTab, setActiveTaxonomyTab] = useState("editorial");
  const [isLoading, setIsLoading] = useState(true);
  const userContext = useContext(UserContext);
  const user = userContext?.user;

  const [editorUserOptions, setEditorUserOptions] = useState([]);
  const [reporterUserOptions, setReporterUserOptions] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [groupsSearch, setGroupsSearch] = useState("");
  const [groupEditId, setGroupEditId] = useState(null);
  const [groupEditValue, setGroupEditValue] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  const [showMoreStoryModal, setShowMoreStoryModal] = useState(false);

  const [activeValuesGroupId, setActiveValuesGroupId] = useState(null);
  const [valuesSearch, setValuesSearch] = useState("");
  const [valueEditIndex, setValueEditIndex] = useState(null);
  const [valueEditValue, setValueEditValue] = useState("");
  const [newValueName, setNewValueName] = useState("");


  const activeGroup = useMemo(
    () => taxonomyGroups.find((group) => group.id === activeValuesGroupId) || null,
    [taxonomyGroups, activeValuesGroupId]
  );

  const fetchTaxonomies = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
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

      if (!response.ok) {
        console.error("Failed to fetch taxonomies:", data.message);
        return;
      }
      // const hiddenTaxonomies = ["editor", "author", "reporter", "journalist"];

      const groups = data.taxonomies
        .map((t) => {
          const isCampaign = t.name?.startsWith("[C] ");
          return {
            id: t.taxonomyId,
            name: isCampaign ? t.name.slice(4) : t.name,
            rawName: t.name,
            values: t.values || [],
            category: isCampaign ? "marketing" : "editorial",
            isMendatory: t.isMendatory ?? false,
            selectionType: normalizeSelectionType(t.permissions?.Selection ?? (t.allowMultiple ? "multi" : "single")),
            permissions: t.permissions || {},
          };
        });

      const selections = data.taxonomies.reduce((acc, t) => {
        const normalized = {};
        TAXONOMY_STATUSES.forEach((status) => {
          const label = status.label;
          const isWidgetStatus = status.key === "more-story-card" || status.key === "thumbnail-grid";
          if (isWidgetStatus) {
            const hasExplicitPermission = Boolean(t.permissions && label in t.permissions);
            if (hasExplicitPermission) {
              normalized[status.key] = Boolean(t.permissions[label]);
            } else {
              normalized[status.key] = Boolean(t.isMendatory);
            }
          } else {
            normalized[status.key] = t.isMendatory ? true : Boolean(t.permissions?.[label]);
          }
        });
        acc[t.taxonomyId] = normalized;
        return acc;
      }, {});

      setTaxonomyGroups(groups);
      setTaxonomySelections(selections);
    } catch (err) {
      console.error("Error fetching taxonomies:", err);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchAssignableUsers = useCallback(async () => {
    const apiBase = env.backendApi;
    if (!apiBase) {
      console.warn("VITE_BACKEND_API is not configured; skipping user fetch.");
      return;
    }

    try {
      setIsUsersLoading(true);
      const response = await apiFetch(`${apiBase}/getAllUsers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch users");
      }

      const editors = [];
      const reporters = [];

      (data?.users || []).forEach((dbUser) => {
        const role = (dbUser?.role || "").toLowerCase();
        const option = {
          value: dbUser?.fullName || dbUser?.email || dbUser?.userId || "",
          label: dbUser?.fullName || dbUser?.email || "Unnamed user",
          email: dbUser?.email,
          role,
        };

        if (!option.value) {
          return;
        }

        const isSuperUser = role.includes("super");

        // For Editor Taxonomy: Only show users with "editor" role (exclude super users)
        if (role.includes("editor") && !isSuperUser) {
          editors.push(option);
        }

        // For Reporters: Show all users 
        reporters.push(option);
      });

      const sortByLabel = (a, b) => a.label.localeCompare(b.label);

      setEditorUserOptions(editors.sort(sortByLabel));
      setReporterUserOptions(reporters.sort(sortByLabel));
    } catch (error) {
      console.error("Failed to fetch assignable users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  }, [user?.token]);



  const handleToggleSelection = useCallback(
    async (groupId, statusKey) => {
      try {
        // 1️⃣ Find current permissions for the group
        const currentSelections = taxonomySelections[groupId] || createEmptyTaxonomySelection();

        // 2️⃣ Determine the new toggled state
        const newSelections = {
          ...currentSelections,
          [statusKey]: !currentSelections[statusKey],
        };

        // 3️⃣ Update UI immediately (optimistic update)
        setTaxonomySelections((prev) => ({
          ...prev,
          [groupId]: newSelections,
        }));

        // 4️⃣ Prepare permissions object in backend label form
        // Convert statusKey-based object → label-based (e.g., "raise-a-story" → "Raise a story")
        const permissionsPayload = {};
        TAXONOMY_STATUSES.forEach((status) => {
          const group = taxonomyGroups.find((g) => g.id === groupId);
          const isWidgetStatus = status.key === "more-story-card" || status.key === "thumbnail-grid";
          const isMandatoryGroup = group?.isMendatory === true && !isWidgetStatus;

          const currentValue = newSelections[status.key] ?? taxonomySelections[groupId]?.[status.key] ?? false;
          permissionsPayload[status.label] = isMandatoryGroup ? true : currentValue === true;
        });

        permissionsPayload["Selection"] = taxonomySelections[groupId]?.["Selection"] ? taxonomySelections[groupId]?.["Selection"] : false;

        // 5️⃣ Call backend API
        const response = await apiFetch(
          `${env.backendApi}/taxonomy/permissions`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify({
              taxonomyId: groupId,
              permissions: permissionsPayload,
            }),
          }
        );

        const data = await response.json();

        // 6️⃣ Handle errors from API
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Taxonomy not found.");
          } else {
            toast.error(data.message || "Failed to update permissions.");
          }
          return;
        }

        // 7️⃣ Success toast
        toast.success("Permissions updated successfully.");
      } catch (err) {
        console.error("❌ Error updating taxonomy permissions:", err);
        toast.error("Something went wrong while updating permissions.");
      }
    },
    [taxonomySelections, taxonomyGroups]
  );




  // groups function
  const persistSelectionType = useCallback(async (groupId, selectionType) => {
    const apiBase = env.backendApi;
    if (!apiBase) {
      throw new Error("Missing VITE_BACKEND_API environment variable.");
    }


    const permission = {};
    TAXONOMY_STATUSES.forEach((status) => {
      permission[status.label] =
        taxonomySelections[groupId][status.key] || false;
    });
    permission["Selection"] = selectionType;


    // const permission = {
    //   ...taxonomySelections[groupId],
    //   "Selection": selectionType
    // }



    const response = await apiFetch(
      `${env.backendApi}/taxonomy/permissions`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(user?.token && { Authorization: `Bearer ${user.token}` }), },
        body: JSON.stringify({
          taxonomyId: groupId,
          permissions: permission,
        }),
      }
    );

    if (response.ok) {
      return;
    }

    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || `Failed to update selection type (status ${response.status}).`);
  }, [taxonomySelections, taxonomyGroups]);

  const handleSelectionTypeChange = useCallback(
    async (groupId, selectionType) => {
      const previousType = taxonomyGroups.find((group) => group.id === groupId)?.selectionType || "single";

      setTaxonomyGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
              ...group,
              selectionType,
            }
            : group
        )
      );

      try {
        await persistSelectionType(groupId, selectionType);
        toast.success("Selection type updated successfully.");
        await fetchTaxonomies();
      } catch (err) {
        console.error("❌ Error updating taxonomy selection type:", err);

        setTaxonomyGroups((prev) =>
          prev.map((group) =>
            group.id === groupId
              ? {
                ...group,
                selectionType: previousType,
              }
              : group
          )
        );

        toast.error(
          err?.message === "Missing VITE_BACKEND_API environment variable."
            ? "Backend API URL is not configured. Please set VITE_BACKEND_API."
            : "Something went wrong while updating the selection type."
        );
      }
    },
    [fetchTaxonomies, persistSelectionType, taxonomyGroups]
  );

  const handleOpenGroupsModal = useCallback(() => {
    setShowGroupsModal(true);
    setGroupsSearch("");
    setGroupEditId(null);
    setGroupEditValue("");
  }, []);

  const handleCloseGroupsModal = useCallback(() => {
    setShowGroupsModal(false);
    setGroupsSearch("");
    setGroupEditId(null);
    setGroupEditValue("");
    setNewGroupName("");
  }, []);

  const handleStartGroupEdit = useCallback((groupId, groupName) => {
    setGroupEditId(groupId);
    setGroupEditValue(groupName);
  }, []);

  const handleSaveGroupEdit = useCallback(
    async (groupId) => {
      const trimmed = groupEditValue.trim();

      if (!trimmed) {
        setGroupEditId(null);
        setGroupEditValue("");
        return;
      }

      try {
        // Call backend to update taxonomy name
        const response = await apiFetch(`${env.backendApi}/taxonomy/name`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({
            taxonomyId: groupId,
            newName: activeTaxonomyTab === "marketing" ? `[C] ${trimmed}` : trimmed,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Taxonomy not found.");
          } else {
            toast.error(data.message || "Failed to update taxonomy name.");
          }
          return;
        }
        setNewGroupName("");
        setGroupEditId(null);
        setGroupEditValue("");
        await fetchTaxonomies();
      } catch (err) {
        console.error("❌ Error updating taxonomy name:", err);
        toast.error("Something went wrong while updating the taxonomy name.");
      }
    },
    [groupEditValue]
  );

  const handleDeleteGroup = useCallback(async (groupId) => {
    if (!groupId) return;

    // const confirmDelete = window.confirm("Are you sure you want to delete this taxonomy?");
    // if (!confirmDelete) return;

    try {
      const response = await apiFetch(`${env.backendApi}/taxonomy`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify({ taxonomyId: groupId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Taxonomy not found.");
        } else {
          toast.error(data.message || "Failed to delete taxonomy.");
        }
        return;
      }
      handleCloseGroupsModal();
      await fetchTaxonomies();

    } catch (err) {
      toast.error("Something went wrong while deleting taxonomy.");
    }
  }, []);

  const handleAddGroup = useCallback(async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    try {
      // Call the backend API to create taxonomy
      const response = await apiFetch(`${env.backendApi}/taxonomy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify({ 
          name: activeTaxonomyTab === "marketing" ? `[C] ${trimmed}` : trimmed 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(`Taxonomy "${trimmed}" already exists.`);
        } else {
          toast.error(data.message || "Failed to create taxonomy.");
        }
        return;
      }
      setNewGroupName("");
      setGroupEditId(null);
      setGroupEditValue("");
      await fetchTaxonomies();
    } catch (err) {
      alert("Something went wrong while creating taxonomy.");
    }
  }, [newGroupName, activeTaxonomyTab, fetchTaxonomies, user?.token]);
  // values functions 
  const handleOpenValuesModal = useCallback((groupId) => {
    setActiveValuesGroupId(groupId);
    setValuesSearch("");
    setValueEditIndex(null);
    setValueEditValue("");
    setNewValueName("");
  }, []);

  const handleCloseValuesModal = useCallback(() => {
    setActiveValuesGroupId(null);
    setValuesSearch("");
    setValueEditIndex(null);
    setValueEditValue("");
    setNewValueName("");
  }, []);

  const handleStartValueEdit = useCallback((index, value) => {
    setValueEditIndex(index);
    setValueEditValue(value);
  }, []);

  const handleSaveValueEdit = useCallback(
    async (index) => {
      const trimmed = valueEditValue.trim();
      if (!activeGroup || !trimmed) {
        setValueEditIndex(null);
        setValueEditValue("");
        return;
      }

      const oldValue = activeGroup.values[index];
      if (!oldValue) {
        toast.error("Invalid value selected for editing.");
        return;
      }
      // ✅ No change
      if (oldValue === trimmed) {
        setValueEditIndex(null);
        setValueEditValue("");
        return;
      }
      try {
        const response = await apiFetch(
          `${env.backendApi}/taxonomy/updateValue`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify({
              taxonomyId: activeGroup.id,
              oldValue,
              newValue: trimmed,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 404) {
            toast.error(data.message || "Taxonomy or old value not found.");
          } else if (response.status === 409) {
            toast.error(`Value "${trimmed}" already exists.`);
          } else {
            toast.error(data.message || "Failed to update value.");
          }
          return;
        }

        setValueEditIndex(null);
        setValueEditValue("");
        await fetchTaxonomies();
      } catch (err) {
        console.error("❌ Error updating taxonomy value:", err);
        toast.error("Something went wrong while updating the value.");
      }
    },
    [activeGroup, valueEditValue]
  );

  const handleDeleteValue = useCallback(
    async (index) => {
      if (!activeGroup) {
        toast.error("Please select a taxonomy group first.");
        return;
      }
      const valueToDelete = activeGroup.values[index];
      if (!valueToDelete) {
        toast.error("Invalid value selected for deletion.");
        return;
      }
      try {
        const response = await apiFetch(`${env.backendApi}/taxonomy/value`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({
            taxonomyId: activeGroup.id,
            value: valueToDelete,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 404) {
            toast.error(data.message || "Taxonomy or value not found.");
          } else {
            toast.error(data.message || "Failed to delete value.");
          }
          return;
        }
        setValueEditIndex(null);
        setValueEditValue("");
        await fetchTaxonomies();

      } catch (err) {
        console.error("❌ Error deleting taxonomy value:", err);
        toast.error("Something went wrong while deleting the value.");
      }
    },
    [activeGroup]
  );

  const addValuesToActiveGroup = useCallback(async (values) => {
    if (!activeGroup) {
      toast.error("Please select a taxonomy group first.");
      return false;
    }

    const parsedValues = values
      .map((value) => value?.trim())
      .filter(Boolean);

    if (parsedValues.length === 0) {
      toast.error("Value name cannot be empty.");
      return false;
    }

    const uniqueValues = Array.from(new Set(parsedValues));

    const newValues = uniqueValues.filter(
      (value) => !activeGroup.values.includes(value)
    );

    if (newValues.length === 0) {
      toast.error("All provided values already exist.");
      return false;
    }

    try {
      const addedValues = [];

      for (const value of newValues) {
        const response = await apiFetch(
          `${env.backendApi}/taxonomy/addValue`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify({
              taxonomyId: activeGroup.id,
              value,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Taxonomy not found.");
          } else if (response.status === 409) {
            toast.error(
              `Value "${value}" already exists in ${activeGroup.name}.`
            );
          } else {
            toast.error(data.message || "Failed to add value.");
          }
          continue;
        }

        addedValues.push(value);
      }

      if (addedValues.length > 0) {
        toast.success(
          addedValues.length === 1
            ? `Value "${addedValues[0]}" added successfully.`
            : `Values added successfully: ${addedValues.join(", ")}.`
        );

        await fetchTaxonomies();
        return true;
      }

      return false;
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while adding the value.");
      return false;
    }
  }, [activeGroup, fetchTaxonomies]);

  const handleAddValue = useCallback(async () => {
    const parsedValues = newValueName
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const didAdd = await addValuesToActiveGroup(parsedValues);

    if (didAdd) {
      setNewValueName("");
    }
  }, [addValuesToActiveGroup, newValueName]);

  const handleAddUserValue = useCallback(
    async (value) => {
      const didAdd = await addValuesToActiveGroup([value]);
      return didAdd;
    },
    [addValuesToActiveGroup]
  );

  const handleSaveMoreStoryTaxonomies = useCallback(
    async (selectedMap) => {
      const promises = Object.entries(selectedMap).map(async ([groupId, isEnabled]) => {
        const group = taxonomyGroups.find((g) => g.id === groupId);
        if (!group) return;

        const currentSelections = taxonomySelections[groupId] || createEmptyTaxonomySelection();
        const updatedSelections = {
          ...currentSelections,
          "more-story-card": isEnabled,
          "thumbnail-grid": isEnabled,
        };

        const permissionsPayload = {};
        TAXONOMY_STATUSES.forEach((status) => {
          const isWidgetStatus = status.key === "more-story-card" || status.key === "thumbnail-grid";
          const isMandatoryGroup = group.isMendatory === true && !isWidgetStatus;
          const currentValue = updatedSelections[status.key] ?? false;
          permissionsPayload[status.label] = isMandatoryGroup ? true : currentValue === true;
        });

        permissionsPayload["Selection"] = currentSelections["Selection"] || false;

        return apiFetch(`${env.backendApi}/taxonomy/permissions`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({
            taxonomyId: groupId,
            permissions: permissionsPayload,
          }),
        });
      });

      await Promise.all(promises);
      await fetchTaxonomies();
    },
    [taxonomyGroups, taxonomySelections, user?.token, fetchTaxonomies]
  );

  // Fetch all taxonomies from backend on mount
  useEffect(() => {
    fetchTaxonomies(true);
  }, [fetchTaxonomies]);

  useEffect(() => {
    fetchAssignableUsers();
  }, [fetchAssignableUsers]);

  const activeGroupName = activeGroup?.name?.toLowerCase() ?? "";
  const isEditorGroup = activeGroupName.includes("editor");
  const isReporterGroup =
    activeGroupName.includes("author") ||
    activeGroupName.includes("reporter") ||
    activeGroupName.includes("journalist");

  const userDropdownOptions = useMemo(() => {
    if (isEditorGroup) {
      return editorUserOptions;
    }
    if (isReporterGroup) {
      return reporterUserOptions;
    }
    return [];
  }, [editorUserOptions, reporterUserOptions, isReporterGroup, isEditorGroup]);

  if (isLoading) {
    return <div className="p-4 text-gray-600">Loading taxonomies...</div>;
  }

  return (
    <div className="mt-8 space-y-6 min-w-0 w-full">
      {/* Tabs Switcher & Right Hand Action Button */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTaxonomyTab("editorial")}
            className={`pb-4 px-2 text-sm font-semibold uppercase tracking-wider transition-all ${
              activeTaxonomyTab === "editorial"
                ? "border-b-2 border-black text-black"
                : "text-gray-400 hover:text-black"
            }`}
          >
            Editorial
          </button>
          <button
            onClick={() => setActiveTaxonomyTab("marketing")}
            className={`pb-4 px-2 text-sm font-semibold uppercase tracking-wider transition-all ${
              activeTaxonomyTab === "marketing"
                ? "border-b-2 border-black text-black"
                : "text-gray-400 hover:text-black"
            }`}
          >
            Marketing
          </button>
        </div>

        {activeTaxonomyTab === "editorial" && (
          <CustomButton
            type="button"
            onClick={() => setShowMoreStoryModal(true)}
            variant="white"
            className="mb-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
          >
            <span>Automatic Filter Taxonomies</span>
            <span>⚙️</span>
          </CustomButton>
        )}
      </div>

      <div className="flex flex-col gap-6 xl:flex-row min-w-0">
        <div className="flex-1 min-w-0 overflow-x-auto">
          <table className="min-w-full border border-black bg-white">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  Item
                </th>
                {activeTaxonomyTab === "editorial" && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-bold">Selection</th>
                    {VISIBLE_TAXONOMY_STATUSES.map((status) => (
                      <th
                        key={status.key}
                        className="px-4 py-3 text-center text-sm font-bold"
                      >
                        {status.label}
                      </th>
                    ))}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {taxonomyGroups
                .filter((group) => group.category === activeTaxonomyTab)
                .map((group) => (
                <tr key={group.id} className="border-t">
                  <td className="px-6 py-3 text-sm text-black align-top">
                    <div className="flex items-start justify-between">

                      {/* Left: Keep name and View values flush-left */}
                      <div className="pl-[2px] flex-shrink">
                        <div className="font-medium text-gray-900">{group.name}</div>
                        <button
                          type="button"
                          onClick={() => handleOpenValuesModal(group.id)}
                          className="mt-1 text-xs text-gray-500 underline hover:text-black block text-left"
                        >
                          View values
                        </button>
                      </div>

                      {/* Right: Count + Edit */}
                      <div className="flex items-center gap-3 pl-6">
                        <span className="bg-gray-100 px-2 py-1 text-xs text-gray-600 rounded">
                          {group.values.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenValuesModal(group.id)}
                          className="text-gray-500 hover:text-black transition"
                          aria-label={`Manage ${group.name}`}
                        >
                          <img
                            src="/images/edit.svg"
                            alt="Edit"
                            className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                          />
                        </button>
                      </div>
                    </div>
                  </td>
                  {activeTaxonomyTab === "editorial" && (
                    <>
                      <td className="px-4 py-3 text-sm align-top">
                        <select
                          className="w-full border border-gray-300 px-2 py-1 text-sm focus:border-black focus:ring-black"
                          value={group.selectionType || "single"}
                          onChange={(event) => handleSelectionTypeChange(group.id, event.target.value)}
                        >
                          <option value="single">Single select</option>
                          <option value="multi">Multi select</option>
                        </select>
                      </td>

                      {VISIBLE_TAXONOMY_STATUSES.map((status) => {
                        const isWidgetStatus = status.key === "more-story-card" || status.key === "thumbnail-grid";
                        const isMandatory = group.isMendatory && !isWidgetStatus;

                        const isDisabled = isMandatory;
                        const checked = isMandatory
                          ? true
                          : Boolean(taxonomySelections[group.id]?.[status.key]);

                        return (
                          <td key={status.key} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              className={`h-4 w-4 border-black text-black accent-black focus:ring-black cursor-pointer ${
                                isDisabled ? "opacity-100 cursor-not-allowed" : ""
                              }`}
                              checked={checked}
                              disabled={isDisabled}
                              onChange={() =>
                                !isDisabled &&
                                handleToggleSelection(group.id, status.key)
                              }
                              aria-label={`${group.name} ${status.label}`}
                            />
                          </td>
                        );
                      })}
                    </>
                  )}
                </tr>
              ))}
              <tr className="border-t">
                <td className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={handleOpenGroupsModal}
                    className="flex items-center gap-2 text-black underline"
                  >
                    + Add new
                  </button>
                </td>
                {activeTaxonomyTab === "editorial" && (
                  <>
                    <td className="px-4 py-3 text-center text-sm text-black">—</td>
                    {VISIBLE_TAXONOMY_STATUSES.map((status) => (
                      <td key={status.key} className="px-4 py-3 text-center text-sm text-black">
                        —
                      </td>
                    ))}
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>


      </div>

      <ManageTaxonomyGroupsModal
        open={showGroupsModal}
        onClose={handleCloseGroupsModal}
        groups={taxonomyGroups.filter((g) => g.category === activeTaxonomyTab)}
        searchTerm={groupsSearch}
        onSearchChange={setGroupsSearch}
        onStartEdit={handleStartGroupEdit}
        editingId={groupEditId}
        editingValue={groupEditValue}
        onEditChange={setGroupEditValue}
        onEditSave={handleSaveGroupEdit}
        onDeleteGroup={handleDeleteGroup}
        newGroupName={newGroupName}
        onNewGroupChange={setNewGroupName}
        onAddGroup={handleAddGroup}
      />

      <ManageTaxonomyValuesModal
        open={Boolean(activeGroup)}
        onClose={handleCloseValuesModal}
        taxonomyName={activeGroup?.name || ""}
        values={activeGroup?.values || []}
        searchTerm={valuesSearch}
        onSearchChange={setValuesSearch}
        onStartEdit={handleStartValueEdit}
        editingIndex={valueEditIndex}
        editingValue={valueEditValue}
        onEditChange={setValueEditValue}
        onEditSave={handleSaveValueEdit}
        onDeleteValue={handleDeleteValue}
        newValueName={newValueName}
        onNewValueChange={setNewValueName}
        onAddValue={handleAddValue}
        isUserDropdown={isEditorGroup || isReporterGroup}
        userDropdownOptions={userDropdownOptions}
        onAddUserValue={handleAddUserValue}
        isUserOptionsLoading={isUsersLoading}
      />

      <ManageMoreStoryCardTaxonomiesModal
        open={showMoreStoryModal}
        onClose={() => setShowMoreStoryModal(false)}
        groups={taxonomyGroups.filter((g) => g.category === activeTaxonomyTab)}
        taxonomySelections={taxonomySelections}
        onSavePermissions={handleSaveMoreStoryTaxonomies}
      />
    </div>
  );
};

export default TaxonomyTab;
