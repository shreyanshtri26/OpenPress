// src/pages/settings/index.jsx
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from '@/hooks/useRouter';
import env from '@/utils/env';
import apiFetch from '../../utils/api';

import { AuthGuard } from "../../context/AuthGuard";
import {
  AdminDashboardLayout,
  AdminMobileSidebarToggle,
} from "../../components/SideBar/AdminDashboardLayout";
import ManageRolesModal from "../../components/settings/ManageRolesModal";
import RolesTab from "../../components/settings/RolesTab";
import TaxonomyTab from "../../components/settings/TaxonomyTab";
import UsersTab from "../../components/settings/UsersTab";
import AuthorsTab from "../../components/settings/AuthorsTab";
import PlacementTab from "../../components/settings/PlacementTab";
import {
  ROLE_ACCORDION_ITEMS,
  ROLE_TABS,
  SECTION_ROWS,
  SETTINGS_TABS,
} from "../../components/settings/constants";
import {
  createInitialRolePermissions,
  createSectionState,
} from "../../components/settings/utils";
import toast from "react-hot-toast";
import { UserContext } from "../../context/UserContext";



export default function AdminSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");
  const [roleTabs, setRoleTabs] = useState(() => [...ROLE_TABS]);
  const [activeRoleTab, setActiveRoleTab] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(() =>
    createInitialRolePermissions(ROLE_TABS)
  );
  const [expandedAccordionItems, setExpandedAccordionItems] = useState([
    ROLE_ACCORDION_ITEMS[0].id,
  ]);
  const [showManageRoles, setShowManageRoles] = useState(false);
  const [searchRole, setSearchRole] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  const { user, permissions } = useContext(UserContext) ?? {};

  const addUserHandlerRef = useRef(null);
  const addAuthorHandlerRef = useRef(null);
  const addPlacementHandlerRef = useRef(null);

  const isSuperUser = user?.role?.toLowerCase() === "super user";
  const canCreateUser = isSuperUser || permissions?.admin?.Users?.Create;
  const canOpenUsers = isSuperUser || permissions?.admin?.Users?.Open;

  const canCreateRole = isSuperUser || permissions?.admin?.Roles?.Create;
  const canEditRole = isSuperUser || permissions?.admin?.Roles?.Edit;
  const canDeleteRolePerm = isSuperUser || permissions?.admin?.Roles?.Decide;

  const handleRegisterAddUser = useCallback((handler) => {
    addUserHandlerRef.current = handler;
  }, []);

  const handleRegisterAddAuthor = useCallback((handler) => {
    addAuthorHandlerRef.current = handler;
  }, []);

  const handleRegisterAddPlacement = useCallback((handler) => {
    addPlacementHandlerRef.current = handler;
  }, []);

  const handleAddAuthorClick = useCallback(() => {
    addAuthorHandlerRef.current?.();
  }, []);

  const handleAddPlacementClick = useCallback(() => {
    addPlacementHandlerRef.current?.();
  }, []);

  const handleAddUserClick = useCallback(() => {
    addUserHandlerRef.current?.();
  }, []);

  const handleShowDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleShowAllStories = useCallback(() => {
    router.push("/all_stories");
  }, [router]);

  const handleShowMediaLibrary = useCallback(() => {
    router.push("/media");
  }, [router]);



  const filteredSettingsTabs = useMemo(() => {
    return SETTINGS_TABS.filter(tab => {
      if (isSuperUser) return true;
      if (tab.key === 'users') return permissions?.admin?.Users?.Open;
      if (tab.key === 'roles') return permissions?.admin?.Roles?.Open;
      return true;
    });
  }, [isSuperUser, permissions]);

  useEffect(() => {
    if (activeTab === "roles") {
      setActiveRoleTab((current) => {
        const fallback = roleTabs[0]?.key || current;
        return roleTabs.some((tab) => tab.key === current) ? current : fallback;
      });
    }
  }, [activeTab, roleTabs]);

  console.log("new role name >>>", newRoleName);


  const fetchRoles = async () => {

    try {
      const response = await apiFetch(
        `${env.backendApi}/getAllRoles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
      }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch roles");
      }

      // Convert roles into app format { key, label }
      const formattedRoles = data.roles.map((r) => ({
        key: r.roleId,
        label:
          r.roleId.charAt(0).toUpperCase() +
          r.roleId.slice(1).replace(/-/g, " "),
      }));


      //  Update roleTabs state
      setRoleTabs(formattedRoles);
      setActiveRoleTab(formattedRoles[0].key);
      console.log("formatted roles >>>", formattedRoles);

      // Build permissions map directly from API response
      const permissionsMap = {};

      data.roles.forEach((role) => {
        const key = role.roleId;

        // Create complete permission structure for each role
        permissionsMap[key] = Object.entries(SECTION_ROWS).reduce(
          (sectionAcc, [sectionId, rows]) => {
            sectionAcc[sectionId] = rows.reduce((rowAcc, row) => {
              // Get permissions from API or use defaults (all false)
              rowAcc[row] = role.permissions?.[sectionId]?.[row] || {
                Create: false,
                Open: false,
                Edit: false,
                Decide: false,
              };
              return rowAcc;
            }, {});
            return sectionAcc;
          },
          {}
        );
      });

      console.log("permission map >>>", permissionsMap);

      setRolePermissions(permissionsMap);

      toast.success("Roles loaded successfully!");
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles. Please try again.");
    }
  };


  //  fetching all roles
  useEffect(() => {

    // Fetch roles when the "roles" tab becomes active
    if (activeTab === "roles") {
      fetchRoles();
    }

  }, [activeTab]);


  console.log("permissions >>>", rolePermissions[activeRoleTab]);
  console.log("roleTabs>>", roleTabs);

  useEffect(() => {
    setExpandedAccordionItems([ROLE_ACCORDION_ITEMS[0].id]);
  }, [activeRoleTab]);


  const filteredRoles = useMemo(
    () =>
      roleTabs
        .map((role, index) => ({ ...role, originalIndex: index }))
        .filter((role) =>
          role.label.toLowerCase().includes(searchRole.toLowerCase())
        ),
    [roleTabs, searchRole]
  );


  const handleAddRole = useCallback(async () => {
    if (!canCreateRole) {
      toast.error("You do not have permission to add roles.");
      return;
    }

    if (!newRoleName.trim()) {
      toast.error("Please enter a role name.");
      return;
    }

    const newKey = newRoleName.toLowerCase().replace(/\s+/g, "-");

    try {
      // ✅ Call the API to create the role
      const response = await apiFetch(`${env.backendApi}/addRole`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify({ roleId: newRoleName })
      });

      const data = await response.json();
      if (!response.ok) {
        // Handle duplicate or other errors
        if (response.status === 409) {
          toast.error("Role already exists.");
        } else {
          toast.error(data.message || "Error creating role.");
        }
        return;
      }

      // ✅ Successfully added role — now update UI
      toast.success("Role created successfully!");

      const newRole = { key: newKey, label: newRoleName };

      setRoleTabs((prev) => [newRole, ...prev]);
      setRolePermissions((prev) => ({
        ...prev,
        [newKey]: Object.entries(SECTION_ROWS).reduce((acc, [sectionId, rows]) => {
          acc[sectionId] = createSectionState(rows);
          return acc;
        }, {}),
      }));

      setNewRoleName("");
      setShowManageRoles(false);
      setActiveRoleTab(newKey);
      fetchRoles();
    } catch (error) {
      console.error("Add role error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  }, [newRoleName]);

  const handleEditClick = useCallback((index, value) => {
    setEditIndex(index);
    setEditValue(value);
  }, []);

  const handleSaveEdit = useCallback(
    (index) => {
      if (!canEditRole) {
        toast.error("You do not have permission to edit roles.");
        return;
      }
      if (!editValue.trim()) {
        setEditIndex(null);
        setEditValue("");
        return;
      }

      setRoleTabs((prev) =>
        prev.map((role, roleIndex) =>
          roleIndex === index ? { ...role, label: editValue } : role
        )
      );
      setEditIndex(null);
      setEditValue("");
    },
    [editValue]
  );


  const handleDeleteRole = async (roleId) => {
    if (!canDeleteRolePerm) {
      toast.error("You do not have permission to delete roles.");
      return;
    }
    console.log("roleId>>>", roleId);
    try {
      const response = await apiFetch(`${env.backendApi}/deleteRole?roleId=${roleId}`, {
        method: 'DELETE',
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
      });

      const result = await response.json();

      if (response.ok) {
        setShowManageRoles(false);
        fetchRoles();

        return result;
      } else {
        throw new Error(result.message || 'Failed to delete role');
      }
    } catch (error) {
      throw new Error(error.message || 'Failed to delete role');
    }
  };



  const updateRolePermissions = async (roleId, permissions) => {
    try {
      if (!roleId || !permissions) {
        throw new Error("roleId and permissions are required");
      }

      // Construct the API URL (adjust this to your deployed endpoint)
      const apiUrl = `${env.backendApi}/updateRole?roleId=${roleId}`;

      // Send the PUT request
      const response = await apiFetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify({ permissions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update role");
      }

      return data; // returns { message, role }
    } catch (error) {
      console.error("Error in updateRolePermissions:", error);
      throw error;
    }
  }

  const handlePermissionToggle = useCallback(
    (sectionId, row, field) => {
      if (!canEditRole) {
        toast.error("You do not have permission to modify role permissions.");
        return;
      }
      console.log("clicked>>>>");

      setRolePermissions((prev) => {
        const currentRoleState = prev[activeRoleTab] || {};
        const nextRoleState = { ...currentRoleState };
        const currentSectionState =
          nextRoleState[sectionId] || createSectionState(SECTION_ROWS[sectionId]);
        const nextSectionState = { ...currentSectionState };
        const currentRowState = nextSectionState[row] || {};
        const nextRowState = { ...currentRowState, [field]: !currentRowState[field] };

        nextSectionState[row] = nextRowState;
        nextRoleState[sectionId] = nextSectionState;

        const updatedPermissions = {
          ...prev,
          [activeRoleTab]: nextRoleState,
        };

        // Call API with the NEW state value directly
        updateRolePermissions(activeRoleTab, updatedPermissions[activeRoleTab])
          .then((data) => {
            toast.success("Role permissions updated successfully!");
          })
          .catch((error) => {
            toast.error("Failed to update role permissions.");
            console.error("Error updating role permissions:", error);
          });

        return updatedPermissions;
      });
    },
    [activeRoleTab]
  );



  const activeRolePermissions = rolePermissions[activeRoleTab] || {};

  return (
    <>
      <style jsx global>{`
        .settings-role-accordion {
          background-color: transparent;
        }

        .settings-role-accordion .dx-accordion-item {
          border-left: 0;
          border-right: 0;
          border-top: 1px solid #000;
        }

        .settings-role-accordion .dx-accordion-item:last-of-type {
          border-bottom: 1px solid #000;
        }

        .settings-role-accordion .dx-accordion-item .dx-accordion-item-title {
          padding: 16px;
          font-size: 1rem;
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        /* ✅ Keep borders always black, even on hover or focus */
        .settings-role-accordion .dx-accordion-item.dx-state-hover,
        .settings-role-accordion .dx-accordion-item.dx-state-active,
        .settings-role-accordion .dx-accordion-item.dx-state-focused {
          outline: none !important;
          box-shadow: none !important;
          background-color: transparent !important;
        }

        .settings-role-accordion .dx-accordion-item .dx-accordion-item-title.dx-state-hover,
        .settings-role-accordion .dx-accordion-item .dx-accordion-item-title.dx-state-active,
        .settings-role-accordion .dx-accordion-item .dx-accordion-item-title.dx-state-focused {
          background-color: transparent !important;
          border-color: #000 !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .settings-role-accordion .dx-accordion-item-body {
          background-color: #fff;
        }

        .dx-datagrid .dx-link {
          color: #000 !important;
        }

        .dx-datagrid-focus-overlay {
            border: 2px solid #000 !important;
        }

        /* Consistency for Tabs */
        .allstories-datagrid .dx-datagrid-addrow-button,
        .allstories-datagrid .dx-command-edit .dx-link-add,
        .placement-datagrid .dx-datagrid-addrow-button,
        .placement-datagrid .dx-command-edit .dx-link-add {
          display: none !important;
        }
        .allstories-datagrid .dx-datagrid-rowsview tbody tr.dx-data-row:last-child > td,
        .placement-datagrid .dx-datagrid-rowsview tbody tr.dx-data-row:last-child > td {
          border-bottom: 0 !important;
        }
      `}</style>

      <AuthGuard allowedRoles={["admin", "editor", "journalist"]}>
        <AdminDashboardLayout
          onShowDashboard={handleShowDashboard}
          onShowAllStories={handleShowAllStories}
          onShowMediaLibrary={handleShowMediaLibrary}
          defaultSidebarOpen={false}
        >
          <div className="flex flex-1 min-h-0 min-w-0">
            <aside className="w-64 border-r border-gray-200 bg-white hidden md:flex md:flex-col">
              <div className="px-3 pt-5 pb-0 text-xl font-semibold text-gray-900">
                Settings
              </div>
              <nav className="flex-1 px-2 space-y-1 mt-8">
                {filteredSettingsTabs.map((tab) => {
                  const isActive = tab.key === activeTab;
                  const baseItemClass =
                    "flex items-center w-full mb-2 p-2 rounded-none transition-all duration-200";
                  const stateClasses = isActive
                    ? "border border-black text-black"
                    : "hover:bg-gray-100 text-gray-900";
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`${baseItemClass} ${stateClasses}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="flex flex-1 flex-col min-w-0 overflow-hidden p-4">
              <main className="flex-1 overflow-auto">
                <div className="px-0 md:px-4 py-6">
                  <div className="mb-4 md:hidden">
                    <AdminMobileSidebarToggle className="border border-gray-300" />
                  </div>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900">
                      {activeTab === "users"
                        ? "Users"
                        : activeTab === "authors"
                          ? "Authors"
                          : activeTab === "roles"
                            ? "Role Administration"
                            : activeTab === "taxonomy"
                              ? "Taxonomy Administration"
                              : "Placement Administration"}
                    </h1>

                    {activeTab === "users" && canCreateUser && (
                      <button
                        onClick={handleAddUserClick}
                        className="self-start md:self-center inline-flex items-center justify-center px-4 py-2 border border-black text-sm font-medium text-white bg-black hover:bg-gray-800"
                        type="button"
                      >
                        Add user
                      </button>
                    )}

                    {activeTab === "placement" && (
                      <button
                        onClick={handleAddPlacementClick}
                        className="self-start md:self-center inline-flex items-center justify-center px-4 py-2 border border-black text-sm font-medium text-white bg-black hover:bg-gray-800"
                        type="button"
                      >
                        Add Placement
                      </button>
                    )}
                  </div>

                  {activeTab === "users" ? (
                    <UsersTab onRegisterAddUser={handleRegisterAddUser} />
                  ) : activeTab === "authors" ? (
                    <AuthorsTab onRegisterAddAuthor={handleRegisterAddAuthor} />
                  ) : activeTab === "roles" ? (
                    <RolesTab
                      roleTabs={roleTabs}
                      activeRoleTab={activeRoleTab}
                      onRoleTabChange={setActiveRoleTab}
                      onAddRoleClick={() => setShowManageRoles(true)}
                      activeRolePermissions={activeRolePermissions}
                      expandedAccordionItems={expandedAccordionItems}
                      onExpandedChange={setExpandedAccordionItems}
                      onTogglePermission={handlePermissionToggle}
                    />
                  ) : activeTab === "taxonomy" ? (
                    <TaxonomyTab />
                  ) : (
                    <PlacementTab onRegisterAddPlacement={handleRegisterAddPlacement} />
                  )}
                </div>
              </main>

              <ManageRolesModal
                open={showManageRoles}
                onClose={() => setShowManageRoles(false)}
                searchRole={searchRole}
                onSearchChange={setSearchRole}
                filteredRoles={filteredRoles}
                editIndex={editIndex}
                editValue={editValue}
                onEditClick={handleEditClick}
                onEditChange={setEditValue}
                onEditSave={handleSaveEdit}
                onDeleteRole={handleDeleteRole}
                newRoleName={newRoleName}
                onNewRoleChange={setNewRoleName}
                onAddRole={handleAddRole}
              />
            </div>
          </div>
        </AdminDashboardLayout>
      </AuthGuard>
    </>
  );
}