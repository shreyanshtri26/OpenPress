// src/components/settings/ManageRolesModal.jsx
import CustomButton from "../common/CustomButton";

const ManageRolesModal = ({
  open,
  onClose,
  searchRole,
  onSearchChange,
  filteredRoles,
  editIndex,
  editValue,
  onEditClick,
  onEditChange,
  onEditSave,
  onDeleteRole,
  newRoleName,
  onNewRoleChange,
  onAddRole,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md mx-4 sm:mx-0 p-6 border border-black shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Manage Roles</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:text-black">
            ×
          </button>
        </div>

        <input
          type="text"
          placeholder="Search roles..."
          value={searchRole}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full border border-gray-300 px-3 py-2 text-sm mb-4"
        />

        <div className="border max-h-64 overflow-y-auto mb-4">
          {filteredRoles.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">No roles found</div>
          ) : (
            filteredRoles.map((role) => (
              <div
                key={role.key}
                className="flex justify-between items-center px-3 py-2 border-b text-sm hover:bg-gray-50"
              >
                {editIndex === role.originalIndex ? (
                  <input
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onBlur={() => onEditSave(role.originalIndex)}
                    className="flex-1 border border-gray-300 px-2 py-1"
                    autoFocus
                  />
                ) : ( 
                  <span>{role.label}</span>
                )}
                <div className="flex gap-2">
                  <button onClick={() => onEditClick(role.originalIndex, role.label)}>
                    <img
                      src="/images/edit.svg"
                      alt="Edit"
                      className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                    />
                  </button>
                  <button onClick={() => {
                    onDeleteRole(role.key);
                  }}>
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
          <input
            type="text"
            placeholder="+ Add new"
            value={newRoleName}
            onChange={(e) => onNewRoleChange(e.target.value)}
            className="flex-1 border border-gray-300 px-3 py-2 text-sm"
          />
          <CustomButton onClick={onAddRole}>Add</CustomButton>
        </div>
      </div>
    </div>
  );
};

export default ManageRolesModal;
