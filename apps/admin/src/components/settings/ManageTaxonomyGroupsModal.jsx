import CustomButton from "../common/CustomButton";

const ManageTaxonomyGroupsModal = ({
  open,
  onClose,
  groups,
  searchTerm,
  onSearchChange,
  onStartEdit,
  editingId,
  editingValue,
  onEditChange,
  onEditSave,
  onDeleteGroup,
  newGroupName,
  onNewGroupChange,
  onAddGroup,
}) => {
  if (!open) {
    return null;
  }

  console.log("groups>>>", groups);

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      lower: group.name.toLowerCase(),
    }))
    .filter((group) => group.lower.includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 sm:mx-0 bg-white p-6 border border-black shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold ">Manage taxonomy</h2>
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
          className="mb-4 w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-0 outline-none"
        />

        <div className="mb-4 max-h-64 overflow-y-auto border">
          {filteredGroups.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">No taxonomy groups found</div>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between border-b px-3 py-2 text-sm hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  {editingId === group.id ? (
                    <input
                      value={editingValue}
                      onChange={(event) => onEditChange(event.target.value)}
                      onBlur={() => onEditSave(group.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          onEditSave(group.id);
                        }
                      }}
                      className="w-40 border border-black px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{group.name}</span>
                  )}
                  <span className=" bg-gray-100 px-2 py-0.5 text-sm text-black">
                    {group.values.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-lg">
                  <button
                    type="button"
                    onClick={() => onStartEdit(group.id, group.name)}
                    className="transition hover:text-black"
                    aria-label={`Edit ${group.name}`}
                  >
                    <img
                      src="/images/edit.svg"
                      alt="Edit"
                      className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                    />
                  </button>
                  {!group.isMendatory && <button
                    type="button"
                    onClick={() => onDeleteGroup(group.id)}
                    className="transition hover:text-black"
                    aria-label={`Delete ${group.name}`}
                  >
                    <img
                      src="/images/delete.svg"
                      alt="Edit"
                      className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                    />
                  </button>
                  }
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          <input
            type="text"
            placeholder="+ Add new"
            value={newGroupName}
            onChange={(event) => onNewGroupChange(event.target.value)}
            className="flex-1 border border-gray-300 px-3 py-2 text-sm"
          />
          <CustomButton type="button" onClick={onAddGroup}>
            Add
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default ManageTaxonomyGroupsModal;
