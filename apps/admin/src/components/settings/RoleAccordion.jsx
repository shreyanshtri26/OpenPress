// src/components/settings/RoleAccordion.jsx

import Accordion from "@/components/ui/kit/accordion";
import {
  ROLE_ACCORDION_ITEMS,
  ROLE_ACCORDION_TITLES,
  SECTION_ROWS,
} from "./constants";
import RolePermissionTable from "./RolePermissionTable";

const RoleAccordion = ({
  roleLabel,
  activeRolePermissions,
  expandedItems,
  onExpandedChange,
  onTogglePermission,
}) => (
  <Accordion
    dataSource={ROLE_ACCORDION_ITEMS}
    keyExpr="id"
    displayExpr="title"
    collapsible
    multiple={false}
    deferRendering={false}
    selectedItemKeys={expandedItems}
    onSelectionChanged={(event) => {
      const keys = event.component?.option("selectedItemKeys") || [];

      // ✅ If user clicks the same open accordion again → collapse it
      if (
        expandedItems.length === 1 &&
        keys.length === 1 &&
        expandedItems[0] === keys[0]
      ) {
        onExpandedChange([]); // collapse all
        return;
      }

      // ✅ Otherwise open the clicked one
      onExpandedChange(keys);
    }}
    className="settings-role-accordion"
    itemTitleRender={(item) => (
      <div className="flex items-center justify-between text-base font-semibold text-gray-900">
        {item.title}
      </div>
    )}
    itemRender={(item) => (
      <div>
        <RolePermissionTable
          roleLabel={roleLabel}
          sectionTitle={ROLE_ACCORDION_TITLES[item?.id]}
          rows={SECTION_ROWS[item?.id] || []}
          permissions={activeRolePermissions[item?.id]}
          onToggle={(row, field) => onTogglePermission(item?.id, row, field)}
        />
      </div>
    )}
  />
);

export default RoleAccordion;
