import { useEffect, useState } from "react";
import CustomButton from "../common/CustomButton";
import toast from "react-hot-toast";

const ManageMoreStoryCardTaxonomiesModal = ({
  open,
  onClose,
  groups = [],
  taxonomySelections = {},
  onSavePermissions,
}) => {
  const [selectedMap, setSelectedMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Populate selectedMap based on taxonomySelections
      const initialMap = {};
      groups.forEach((group) => {
        const isChecked = Boolean(
          taxonomySelections[group.id]?.["more-story-card"] ??
            taxonomySelections[group.id]?.["thumbnail-grid"] ??
            group.permissions?.["More Story Card"] ??
            group.permissions?.["Thumbnail Grid"]
        );
        initialMap[group.id] = isChecked;
      });
      setSelectedMap(initialMap);
      setSearchTerm("");
    }
  }, [open, groups, taxonomySelections]);

  if (!open) return null;

  const filteredGroups = groups.filter((group) =>
    (group.name || "").toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleToggle = (groupId) => {
    setSelectedMap((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleSelectAll = () => {
    const updated = { ...selectedMap };
    filteredGroups.forEach((group) => {
      updated[group.id] = true;
    });
    setSelectedMap(updated);
  };

  const handleDeselectAll = () => {
    const updated = { ...selectedMap };
    filteredGroups.forEach((group) => {
      updated[group.id] = false;
    });
    setSelectedMap(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSavePermissions) {
        await onSavePermissions(selectedMap);
      }
      toast.success("Automatic filter taxonomy options updated.");
      onClose();
    } catch (err) {
      console.error("Failed to save automatic filter taxonomies:", err);
      toast.error("Failed to save taxonomy settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 sm:mx-0 bg-white p-6 border border-black shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Automatic Filter Taxonomies
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Select which taxonomies will be visible as filter fields across all PageBuilder cards with automatic option.
            </p>
          </div>
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
          placeholder="Search taxonomies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-3 w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-0 outline-none"
        />

        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-gray-500 font-medium">
            {Object.values(selectedMap).filter(Boolean).length} of {groups.length} enabled
          </span>
          <div className="space-x-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-black underline font-medium hover:text-gray-600"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-gray-500 underline hover:text-black"
            >
              Deselect all
            </button>
          </div>
        </div>

        <div className="mb-5 max-h-64 overflow-y-auto border border-gray-200">
          {filteredGroups.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No taxonomies found
            </div>
          ) : (
            filteredGroups.map((group) => {
              const checked = Boolean(selectedMap[group.id]);
              return (
                <label
                  key={group.id}
                  className={`flex items-center justify-between border-b px-4 py-3 text-sm cursor-pointer transition-colors ${
                    checked ? "bg-gray-50 font-medium text-black" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(group.id)}
                      className="h-4 w-4 border-black text-black accent-black focus:ring-black cursor-pointer"
                    />
                    <span>{group.name}</span>
                  </div>
                  <span className="bg-gray-100 px-2 py-0.5 text-xs text-gray-600 rounded">
                    {group.values?.length || 0} values
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <CustomButton
            type="button"
            onClick={onClose}
            variant="white"
          >
            Cancel
          </CustomButton>
          <CustomButton
            type="button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default ManageMoreStoryCardTaxonomiesModal;
