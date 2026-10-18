import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { ACTION_FIELDS, PERMISSION_FIELDS } from "./constants";

const RolePermissionTable = ({
  roleLabel,
  sectionTitle,
  rows,
  permissions,
  onToggle,
}) => {
  const { user, permissions: userPermissions } = useContext(UserContext) ?? {};
  const isSuperUser = user?.role?.toLowerCase() === "super user";
  const canEditRole = isSuperUser || userPermissions?.admin?.Roles?.Edit;

  return (
  <div className="mt-6">
    <div className="overflow-x-auto">
      <table
        className="min-w-full table-fixed border border-black text-left text-sm border-collapse"
        aria-label={`${roleLabel} ${sectionTitle} permissions`}
      >
        <thead>
          <tr className="border-t border-b border-black">
            {PERMISSION_FIELDS.map((field, index) => (
              <th
                key={field}
                scope="col"
                className={`px-4 py-3 font-medium uppercase tracking-wide text-gray-900 ${index === 0 ? "text-left" : "text-center"
                  }`}
              >
                {field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-t border-b border-black">
              <th scope="row" className="px-4 py-3 text-left font-medium text-gray-900">
                {row}
              </th>
              {ACTION_FIELDS.map((field) => {
                const isChecked = permissions?.[row]?.[field] ?? false;
                return (
                  <td key={`${row}-${field}`} className="px-4 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(row, field)}
                      disabled={!canEditRole}
                      aria-label={`${row} ${field} permission`}
                      className={`h-4 w-4 accent-black ${
                        canEditRole ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                      }`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default RolePermissionTable;
