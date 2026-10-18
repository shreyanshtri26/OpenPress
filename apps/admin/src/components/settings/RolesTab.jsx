import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import CustomButton from "../common/CustomButton";
import RoleAccordion from "./RoleAccordion";

const RolesTab = ({
  roleTabs,
  activeRoleTab,
  onRoleTabChange,
  onAddRoleClick,
  activeRolePermissions,
  expandedAccordionItems,
  onExpandedChange,
  onTogglePermission,
}) => {
  const { user, permissions } = useContext(UserContext) ?? {};
  const isSuperUser = user?.role?.toLowerCase() === "super user";
  const canCreateRole = isSuperUser || permissions?.admin?.Roles?.Create;

  const activeRoleLabel =
    roleTabs.find((tab) => tab.key === activeRoleTab)?.label || roleTabs[0]?.label || "";

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center pb-3">
        <div className="flex flex-wrap gap-6">
          {roleTabs.map((tab) => {
            const isActive = tab.key === activeRoleTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onRoleTabChange(tab.key)}
                className={`pb-2 text-sm font-semibold uppercase tracking-wide transition-colors duration-200 ${
                  isActive ? "border-b-2 border-black text-black" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {canCreateRole && <CustomButton onClick={onAddRoleClick}>Add Role</CustomButton>}
      </div>
      <div className="mt-6">
        <RoleAccordion
          roleLabel={activeRoleLabel}
          activeRolePermissions={activeRolePermissions}
          expandedItems={expandedAccordionItems}
          onExpandedChange={onExpandedChange}
          onTogglePermission={onTogglePermission}
        />
      </div>
    </div>
  );
};

export default RolesTab;
