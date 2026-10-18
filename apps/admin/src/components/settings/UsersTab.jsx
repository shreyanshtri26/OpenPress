import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import env from "@/utils/env";
import apiFetch from '../../utils/api';
import DataGrid, {
    Column,
    ColumnChooser,
    Editing,
    Export,
    FilterRow,
    GroupPanel,
    Grouping,
    HeaderFilter,
    Lookup,
    Pager,
    Paging,
    Selection,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/dx/data-grid';
import { ROLE_OPTIONS, STATUS_OPTIONS } from "./constants";
import { UserContext } from "../../context/UserContext";
import toast from "react-hot-toast";
import { createGridExportHandler } from "../../utils/dataGridExport";

const UsersTab = ({ onRegisterAddUser }) => {
  const { user, permissions } = useContext(UserContext) ?? {};
  const token = user?.token;
  const isSuperUser = user?.role?.toLowerCase() === "super user";

  const canCreate = isSuperUser || permissions?.admin?.Users?.Create;
  const canEdit = isSuperUser || permissions?.admin?.Users?.Edit;
  const canDelete = isSuperUser || permissions?.admin?.Users?.Decide; // Mapping Decide to Delete in this context

  const gridRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState(ROLE_OPTIONS);
  const [loading, setLoading] = useState(true);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const getDefaultRoleValue = useCallback(
    () => roleOptions?.[0]?.value ?? ROLE_OPTIONS?.[0]?.value ?? "",
    [roleOptions]
  );

  const getDefaultStatusValue = useCallback(() => STATUS_OPTIONS?.[0]?.value ?? "", []);

  // ✅ NEW: normalize backend status to match Lookup values exactly ("Active"/"Inactive")
  const normalizeStatus = useCallback(
    (s) => {
      const fallback = getDefaultStatusValue();
      if (!s) return fallback;

      const str = String(s).trim();
      const match = STATUS_OPTIONS.find(
        (o) => o.value.toLowerCase() === str.toLowerCase()
      );

      return match ? match.value : fallback;
    },
    [getDefaultStatusValue]
  );

  const updateUserInState = useCallback((id, patch) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const removeUserFromState = useCallback((id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${env.backendApi}/getAllUsers`, { method: "GET", headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch users");

      const formatted = (json.users || []).map((dbUser) => ({
        id: dbUser.userId,
        name: dbUser.fullName,
        email: dbUser.email,
        role: dbUser.role || "",
        // ✅ CHANGED: use normalizeStatus so Lookup always matches
        status: normalizeStatus(dbUser.status),
        createdAt: dbUser.createdAt || Date.now(),
        password: "",
      }));

      setUsers(formatted);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load users: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, normalizeStatus]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiFetch(`${env.backendApi}/roles/list`, { method: "GET", headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch roles");

      setRoleOptions((json.roles || []).map((r) => ({ value: r.roleId, label: r.roleId })));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load roles: " + (e?.message || "Unknown error"));
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const onInitialized = useCallback((e) => {
    gridRef.current = e.component;
  }, []);

  const handleAddUser = useCallback(async () => {
    const grid = gridRef.current;
    if (!grid) return;

    const editing = grid.getController("editing");
    if (editing?.isEditing()) {
      const saved = await grid.saveEditData();
      if (saved === false) return;
      grid.cancelEditData();
    }

    await grid.addRow();
    grid.editRow(0);
    grid.editCell(0, "name");
  }, []);

  useEffect(() => {
    onRegisterAddUser?.(canCreate ? handleAddUser : null);
    return () => onRegisterAddUser?.(null);
  }, [handleAddUser, onRegisterAddUser, canCreate]);

  const onInitNewRow = useCallback(
    (e) => {
      e.data = {
        role: getDefaultRoleValue(),
        status: getDefaultStatusValue(),
        password: "",
      };
    },
    [getDefaultRoleValue, getDefaultStatusValue]
  );

  // CREATE
  const onRowInserting = useCallback(
    async (e) => {
      e.cancel = true;
      if (!canCreate) {
        toast.error("You do not have permission to add users.");
        return;
      }

      const { name, email, password } = e.data || {};

      // ✅ CHANGED: role default logic consistent
      const role =
        (e.data && typeof e.data.role === "string" && e.data.role.length > 0)
          ? e.data.role
          : getDefaultRoleValue();

      // ✅ CHANGED: ensure we always send a valid status
      const status =
        (e.data && typeof e.data.status === "string" && e.data.status.length > 0)
          ? e.data.status
          : getDefaultStatusValue();

      if (!name || !email || !password) {
        toast.error("Name, email, and password are required.");
        return;
      }

      try {
        const res = await apiFetch(`${env.backendApi}/addUser`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ fullName: name, email, password, role, status }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to add user");

        const created = {
          id: json.user.userId,
          name: json.user.fullName,
          email: json.user.email,
          role: json.user.role,
          // ✅ CHANGED: normalize backend status so Lookup matches immediately
          status: normalizeStatus(json.user.status ?? status),
          createdAt: json.user.createdAt || Date.now(),
          password: "",
        };

        setUsers((prev) => [created, ...prev]);
        gridRef.current?.cancelEditData();
        toast.success("User added successfully!");
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Failed to add user.");
      }
    },
    [authHeaders, getDefaultRoleValue, getDefaultStatusValue, normalizeStatus]
  );

  // UPDATE
  const onRowUpdating = useCallback(
    async (e) => {
      e.cancel = true;
      if (!canEdit) {
        toast.error("You do not have permission to update users.");
        return;
      }

      const userId = e.key;
      if (!userId) {
        toast.error("Missing userId; cannot update.");
        return;
      }

      const updated = { ...e.oldData, ...e.newData };
      const oldEmail = e.oldData?.email;
      const newEmail = updated.email;

      const passwordChanged = typeof updated.password === "string" && updated.password.trim().length > 0;

      const changed =
        newEmail !== e.oldData.email ||
        updated.name !== e.oldData.name ||
        passwordChanged ||
        updated.role !== e.oldData.role ||
        updated.status !== e.oldData.status;

      if (!changed) return;

      const payload = {
        userId,
        email: oldEmail,
        originalEmail: oldEmail,
        newEmail,
        ...(updated.name && { fullName: updated.name }),
        ...(passwordChanged && { password: updated.password }),
        ...(updated.role && { role: updated.role }),
        ...(updated.status && { status: updated.status }),
      };

      try {
        const res = await apiFetch(`${env.backendApi}/editUser`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to update user");

        updateUserInState(userId, { ...updated, password: "" });
        toast.success("User updated successfully!");
      } catch (err) {
        console.error(err);
        updateUserInState(userId, { ...e.oldData, password: "" });
        toast.error(err?.message || "Failed to update user.");
      } finally {
        gridRef.current?.cancelEditData();
      }
    },
    [authHeaders, updateUserInState]
  );

  // DELETE
  const deleteUser = useCallback(
    async (rowData, row) => {
      if (!canDelete) {
        toast.error("You do not have permission to delete users.");
        return;
      }
      const id = rowData?.id;
      const email = rowData?.email;

      if (row?.isNewRow || !id || !email) {
        gridRef.current?.cancelEditData();
        if (row?.rowIndex != null) gridRef.current?.deleteRow(row.rowIndex);
        removeUserFromState(id);
        toast.success("Row removed.");
        return;
      }

      try {
        const res = await apiFetch(`${env.backendApi}/deleteUser`, {
          method: "DELETE",
          headers: authHeaders,
          body: JSON.stringify({ email }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to delete user");

        removeUserFromState(id);
        toast.success("User deleted successfully!");
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Failed to delete user.");
      }
    },
    [authHeaders, removeUserFromState]
  );

  const onToolbarPreparing = useCallback((e) => {
    e.toolbarOptions.visible = true;
  }, []);

  return (
    <div className="mt-6 bg-white border border-black overflow-hidden">
      <DataGrid
        onToolbarPreparing={onToolbarPreparing}
        onInitialized={onInitialized}
        dataSource={users}
        keyExpr="id"
        showBorders={false}
        hoverStateEnabled
        showColumnLines={false}
        showRowLines={false}
        allowColumnResizing
        allowColumnReordering
        wordWrapEnabled
        columnAutoWidth
        elementAttr={{ class: "allstories-datagrid" }}
        repaintChangesOnly={true}
        noDataText={loading ? "Loading..." : "No users found"}
        columnResizingMode="nextColumn"
        scrolling={{ showScrollbar: "always" }}
        onInitNewRow={onInitNewRow}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
        onRowRemoving={(e) => {
          e.cancel = true;
        }}
        onExporting={createGridExportHandler('Users')}
      >
        <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
        <Grouping autoExpandAll={false} />
        <ColumnChooser enabled={true} mode="select" />
        <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
        <Selection mode="multiple" showCheckBoxesMode="always" />
        <FilterRow visible={true} applyFilter="auto" />
        <FilterPanel visible={true} />
        <FilterBuilderPopup width={700} height={500} />
        <HeaderFilter visible />

        <Editing
          mode="row"
          allowAdding={canCreate}
          allowUpdating={canEdit}
          allowDeleting={false}
          useIcons
          newRowPosition="top"
          confirmDelete={false}
          texts={{ addRow: "" }}
        />

        <Column dataField="name" caption="Name" minWidth={200} allowGrouping />
        <Column dataField="email" caption="Email" minWidth={180} allowGrouping={false} />
        <Column dataField="password" caption="Password" dataType="string" calculateCellValue={() => ""} minWidth={120} allowExporting={false} allowGrouping={false} allowFiltering={false} />

        <Column dataField="role" caption="Role" minWidth={150} allowGrouping>
          <Lookup dataSource={roleOptions} valueExpr="value" displayExpr="label" />
        </Column>

        <Column dataField="status" caption="Status" minWidth={120} allowGrouping>
          <Lookup dataSource={STATUS_OPTIONS} valueExpr="value" displayExpr="label" />
        </Column>

        <Column dataField="createdAt" sortOrder="desc" sortIndex={0} visible={false} />

        <Column
          caption="Action"
          type="buttons"
          width={120}
          allowExporting={false}
          allowGrouping={false}
          allowFiltering={false}
          buttons={[
            { name: "edit", visible: canEdit },
            { name: "save" },
            { name: "cancel" },
            {
              hint: "Delete",
              icon: "trash",
              visible: (e) => canDelete && !e.row.isEditing,
              onClick: (e) => deleteUser(e.row.data, e.row),
            },
          ]}
        />

        <Paging defaultPageSize={8} />
        <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[8, 10, 20, 50, 'all']} />
      </DataGrid>
    </div>
  );
};

export default UsersTab;
