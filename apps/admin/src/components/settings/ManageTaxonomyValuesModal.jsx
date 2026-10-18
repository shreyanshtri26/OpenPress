import { useEffect, useMemo, useState } from "react";
import CustomButton from "../common/CustomButton";
import apiFetch from "@/utils/api";
import env from "@/utils/env";

const ManageTaxonomyValuesModal = ({
  open,
  onClose,
  taxonomyName,
  values,
  searchTerm,
  onSearchChange,
  onStartEdit,
  editingIndex,
  editingValue,
  onEditChange,
  onEditSave,
  onDeleteValue,
  newValueName,
  onNewValueChange,
  onAddValue,
  isUserDropdown = false,
  userDropdownOptions = [],
  onAddUserValue,
  isUserOptionsLoading = false,
}) => {
  // Accent colour per value: shown on that value's chips and pills on the site and in the editor.
  const [colors, setColors] = useState({});
  useEffect(() => {
    if (!open || isUserDropdown) return;
    apiFetch(`${env.backendApi}/taxonomy/colors`)
      .then((res) => (res.ok ? res.json() : { colors: {} }))
      .then((json) => setColors(json.colors || {}))
      .catch(() => setColors({}));
  }, [open, isUserDropdown]);

  const saveColor = async (value, color) => {
    setColors((prev) => {
      const next = { ...prev };
      if (color) next[value] = color; else delete next[value];
      return next;
    });
    try {
      await apiFetch(`${env.backendApi}/taxonomy/colors`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxonomy: taxonomyName, value, color }),
      });
    } catch (err) {
      console.error("Could not save colour", err);
    }
  };

  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserValue, setSelectedUserValue] = useState("");

  useEffect(() => {
    if (open) {
      setUserSearchTerm("");
      setSelectedUserValue("");
    }
  }, [open, taxonomyName, isUserDropdown]);

  const filteredValues = values
    .map((value, index) => ({
      value,
      index,
      lower: value.toLowerCase(),
    }))
    .filter((entry) => entry.lower.includes(searchTerm.toLowerCase()));

  const filteredUserOptions = useMemo(() => {
    if (!isUserDropdown) {
      return [];
    }

    const normalizedSearch = userSearchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return userDropdownOptions;
    }

    return userDropdownOptions.filter((option) => {
      const label = option?.label?.toLowerCase() || "";
      const email = option?.email?.toLowerCase() || "";
      return label.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [isUserDropdown, userDropdownOptions, userSearchTerm]);

  const handleSelectUser = (event) => {
    const { value } = event.target;
    setSelectedUserValue(value);
  };

  const handleAddUserClick = async () => {
    if (!selectedUserValue || !onAddUserValue) {
      return;
    }

    const didAdd = await onAddUserValue(selectedUserValue);
    if (didAdd) {
      setSelectedUserValue("");
      setUserSearchTerm("");
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 sm:mx-0 bg-white p-6 border border-black shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Manage {taxonomyName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-500 transition hover:text-black"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="mb-4 w-full border border-gray-300 px-3 py-2 text-sm"
        />

        <div className="mb-4 max-h-64 overflow-y-auto border">
          {filteredValues.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">No items found</div>
          ) : (
            filteredValues.map((entry) => (
              <div
                key={`${entry.value}-${entry.index}`}
                className="flex items-center justify-between border-b px-3 py-2 text-sm hover:bg-gray-50"
              >
                {editingIndex === entry.index ? (
                  <input
                    value={editingValue}
                    onChange={(event) => onEditChange(event.target.value)}
                    onBlur={() => onEditSave(entry.index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onEditSave(entry.index);
                      }
                    }}
                    className="mr-4 flex-1 border border-gray-300 px-2 py-1"
                    autoFocus
                  />
                ) : (
                  <span className="mr-4 flex-1 text-gray-900">{entry.value}</span>
                )}
                <div className="flex items-center gap-2 text-lg">
                  {!isUserDropdown && (
                    <span className="flex items-center gap-1">
                      <input
                        type="color"
                        value={colors[entry.value] || "#6e6e73"}
                        onChange={(event) => saveColor(entry.value, event.target.value)}
                        className="h-5 w-7 cursor-pointer rounded border border-gray-300 bg-white p-0"
                        aria-label={`Colour for ${entry.value}`}
                        title="Accent colour"
                      />
                      {colors[entry.value] && (
                        <button type="button" onClick={() => saveColor(entry.value, "")} className="text-xs text-gray-500 hover:text-black" aria-label={`Clear colour for ${entry.value}`} title="Clear colour">
                          ✕
                        </button>
                      )}
                    </span>
                  )}
                  {/* Hide edit button for editor/reporter taxonomies (user dropdowns) */}
                  {!isUserDropdown && (
                    <button
                      type="button"
                      onClick={() => onStartEdit(entry.index, entry.value)}
                      className="transition hover:text-black"
                      aria-label={`Edit ${entry.value}`}
                    >
                      <img
                        src="/images/edit.svg"
                        alt="Edit"
                        className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteValue(entry.index)}
                    className="transition hover:text-black"
                    aria-label={`Delete ${entry.value}`}
                  >
                    <img
                      src="/images/delete.svg"
                      alt="Delete"
                      className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          {isUserDropdown ? (
            <div className="flex w-full items-start gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(event) => setUserSearchTerm(event.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="mt-2 border border-gray-200">
                  {isUserOptionsLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Loading users...</div>
                  ) : filteredUserOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                  ) : (
                    <select
                      value={selectedUserValue}
                      onChange={handleSelectUser}
                      className="w-full border-0 px-3 py-2 text-sm focus:outline-none"
                      size={Math.min(filteredUserOptions.length, 5)}
                    >
                      <option value="" disabled>
                        Select a user
                      </option>
                      {filteredUserOptions.map((option) => (
                        <option key={`${option.value}-${option.email || option.role}`}
                          value={option.value}
                        >
                          {option.label}
                          {option.email ? ` (${option.email})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <CustomButton
                type="button"
                onClick={handleAddUserClick}
                disabled={!selectedUserValue}
              >
                Add
              </CustomButton>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="+ Add new"
                value={newValueName}
                onChange={(event) => onNewValueChange(event.target.value)}
                className="flex-1 border border-gray-300 px-3 py-2 text-sm"
              />
              <CustomButton type="button" onClick={onAddValue}>
                Add
              </CustomButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageTaxonomyValuesModal;
