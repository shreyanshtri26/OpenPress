import { useState, useMemo, useEffect, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import env from "@/utils/env";
import apiFetch from "../../utils/api";
import { UserContext } from "../../context/UserContext";
import DataGrid, {
    Column,
    ColumnChooser,
    Export,
    FilterRow,
    GroupPanel,
    Grouping,
    HeaderFilter,
    Pager,
    Paging,
    Selection,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/kit/data-grid';
import SelectBox from '@/components/ui/kit/select-box';
import { mapBackendCampaignToFrontend } from "../../helpers/campaignMapper";
import { AlertCircle, X } from "lucide-react";
import { createGridExportHandler } from "../../utils/dataGridExport";
import { CURRENCY_DISPLAY_ITEMS } from "../../utils/currencies";

const PlacementTab = ({ onRegisterAddPlacement }) => {
  const { user } = useContext(UserContext) ?? {};
  const [placements, setPlacements] = useState([]);
  const [placementTypes, setPlacementTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    desktopDimensions: "",
    mobileDimensions: "",
    currency: "INR",
    price: "",
    fillPriority: "Direct",
    status: "Active",
  });

  // Campaigns state for deletion check
  const [campaigns, setCampaigns] = useState([]);
  const [blockInfo, setBlockInfo] = useState({
    show: false,
    campaigns: [],
    placementName: ""
  });
  const [confirmDeleteInfo, setConfirmDeleteInfo] = useState({
    show: false,
    id: null,
    name: ""
  });

  // Fetch Placements & Taxonomies
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(user?.token && { Authorization: `Bearer ${user?.token}` }),
      };

      // 1. Fetch Taxonomies to find the "Placement type" values
      const taxResponse = await apiFetch(`${env.backendApi}/taxonomies`, { headers });
      if (taxResponse.ok) {
        const taxData = await taxResponse.json();
        const placementTax = taxData.taxonomies?.find((t) => {
          const lowerName = t.name?.toLowerCase() || "";
          return (
            lowerName === "placement type" ||
            lowerName === "placement_type" ||
            lowerName === "[c] placement type" ||
            lowerName === "[c] placement_type"
          );
        });
        if (placementTax?.values) {
          setPlacementTypes(placementTax.values);
        } else {
          // Fallback or empty if not configured yet
          setPlacementTypes([]);
        }
      }

      // 2. Fetch Placements
      const placementResponse = await apiFetch(`${env.backendApi}/placements`, { headers });
      if (placementResponse.ok) {
        const placementResData = await placementResponse.json();
        const rawPlacements = placementResData.placements || placementResData || [];
        // Ensure each row has an 'id' to satisfy DataGrid keyExpr
        const normalized = rawPlacements.map((p) => ({
          ...p,
          id: p.id || p.placementId,
        }));
        setPlacements(normalized);
      } else if (placementResponse.status === 404) {
        // endpoint might not exist yet, treat as empty
        setPlacements([]);
      }

      // 3. Fetch Campaigns for deletion pre-flight check
      const campResponse = await apiFetch(`${env.backendApi}/getCampaigns`, { headers });
      if (campResponse.ok) {
        const campData = await campResponse.json();
        const apiCampaigns = (campData.campaigns || []).map(mapBackendCampaignToFrontend);
        setCampaigns(apiCampaigns);
      }
    } catch (err) {
      console.error("Failed to fetch placement data", err);
      toast.error("Failed to load placement configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.token]);

  const handleOpenModal = useCallback(async (placement = null) => {
    if (placement) {
      const headers = {
        "Content-Type": "application/json",
        ...(user?.token && { Authorization: `Bearer ${user?.token}` }),
      };

      // Use latest campaign data before allowing placement edit.
      let latestCampaigns = campaigns;
      try {
        const campResponse = await apiFetch(`${env.backendApi}/getCampaigns`, { headers });
        if (campResponse.ok) {
          const campData = await campResponse.json();
          latestCampaigns = (campData.campaigns || []).map(mapBackendCampaignToFrontend);
          setCampaigns(latestCampaigns);
        }
      } catch (err) {
        console.warn("Could not fetch latest campaigns for edit validation, falling back to state.", err);
      }

      const normalize = (val) => (val || "").toLowerCase().replace(/[\s_-]+/g, "");
      const now = new Date();
      const normalizedPlacementName = normalize(placement.name);

      const blockingCampaign = latestCampaigns.find((cp) => {
        const status = (cp.status || "").toLowerCase();
        const isRunningStatus =
          status === "start now" ||
          status === "start_now" ||
          status === "active" ||
          status === "running";

        const end = cp.endDate ? new Date(cp.endDate) : (cp.endTime ? new Date(cp.endTime) : null);
        const isExpired = end && now > end;
        if (!isRunningStatus || isExpired) return false;

        const isInJobs = cp.jobs?.some((job) => normalize(job.placement) === normalizedPlacementName);
        if (isInJobs) return true;

        return cp.placements?.some((p) => normalize(p) === normalizedPlacementName);
      });

      if (blockingCampaign) {
        toast.error("Campaign is running, unable to edit this placement.");
        return;
      }

      setEditingId(placement.id || placement.placementId);
      setFormData({
        name: placement.name || "",
        type: placement.type || "",
        desktopDimensions: placement.desktopDimensions || "",
        mobileDimensions: placement.mobileDimensions || "",
        currency: placement.currency || "INR",
        price: placement.price ?? "",
        fillPriority: placement.fillPriority || "Direct",
        status: placement.status || "Active",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        type: placementTypes[0] || "",
        desktopDimensions: "",
        mobileDimensions: "",
        currency: "INR",
        price: "",
        fillPriority: "Direct",
        status: "Active",
      });
    }
    setShowModal(true);
  }, [campaigns, placementTypes, user?.token]);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  useEffect(() => {
    onRegisterAddPlacement?.(handleOpenModal);
    return () => onRegisterAddPlacement?.(null);
  }, [onRegisterAddPlacement, handleOpenModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.type || !formData.currency || formData.price === "") {
      toast.error("Name, Type, Currency, and Price are required.");
      return;
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(user?.token && { Authorization: `Bearer ${user?.token}` }),
      };

      const payload = { ...formData };
      let response;

      if (editingId) {
        response = await apiFetch(`${env.backendApi}/placement`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ id: editingId, placementId: editingId, ...payload }),
        });
      } else {
        response = await apiFetch(`${env.backendApi}/placement`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        toast.success(`Placement ${editingId ? "updated" : "created"} successfully.`);
        setShowModal(false);
        fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save placement.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save placement.");
    }
  };

  const handleDelete = async (id) => {
    // 1. Fetch fresh campaigns for up-to-the-minute validation
    const headers = {
      "Content-Type": "application/json",
      ...(user?.token && { Authorization: `Bearer ${user?.token}` }),
    };

    let latestCampaigns = campaigns;
    try {
      const campResponse = await apiFetch(`${env.backendApi}/getCampaigns`, { headers });
      if (campResponse.ok) {
        const campData = await campResponse.json();
        latestCampaigns = (campData.campaigns || []).map(mapBackendCampaignToFrontend);
        setCampaigns(latestCampaigns); // Update state for future use too
      }
    } catch (err) {
      console.warn("Could not fetch latest campaigns for validation, falling back to state.", err);
    }

    // 2. Pre-flight check: find placement name
    const placement = placements.find(p => p.id === id);
    const pName = placement?.name;

    if (pName) {
      const now = new Date();
      // Normalization helper for reliable matching (removes spaces and hyphens)
      const normalize = (val) => (val || "").toLowerCase().replace(/[\s_-]+/g, "");
      const normalizedPName = normalize(pName);

      const liveCampaigns = latestCampaigns.filter(cp => {
        const end = cp.endDate ? new Date(cp.endDate) : null;
        const isExpired = end && now > end;
        const status = cp.status?.toLowerCase();

        // Live = "Start now", "Schedule", "Active", or "Scheduled" and not yet expired
        const isLive = !isExpired && (
          status === "start now" ||
          status === "schedule" ||
          status === "scheduled" ||
          status === "active"
        );

        if (!isLive) return false;

        // Check jobs for a matching placement name
        return cp.jobs?.some(job => normalize(job.placement) === normalizedPName);
      });

      if (liveCampaigns.length > 0) {
        setBlockInfo({
          show: true,
          campaigns: liveCampaigns,
          placementName: pName
        });
        return;
      }
    }

    setConfirmDeleteInfo({
      show: true,
      id,
      name: pName || "this placement"
    });
  };

  const executeDelete = async () => {
    const { id } = confirmDeleteInfo;
    if (!id) return;

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(user?.token && { Authorization: `Bearer ${user?.token}` }),
      };

      const response = await apiFetch(`${env.backendApi}/placement`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id, placementId: id }),
      });

      if (response.ok) {
        toast.success("Placement deleted successfully.");
        setConfirmDeleteInfo({ show: false, id: null, name: "" });
        fetchData();
      } else {
        throw new Error("Failed to delete placement.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting placement.");
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Note Box */}
      <div className="bg-blue-50 border border-blue-200 p-3 flex items-start gap-3">
        <span className="text-blue-600 font-bold text-lg leading-none">★</span>
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          <strong>Note:</strong> For placement type, first update the taxonomies with the appropriate values.
          The taxonomy key should be <code className="text-pink-600 font-bold">placement_type</code> or <code className="text-pink-600 font-bold">Placement type</code>, and for in-story you should use values like <code className="text-pink-600 font-bold">"in story"</code> or <code className="text-pink-600 font-bold">"in_story"</code>.
        </p>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-black overflow-hidden">
        <style jsx global>{`
          /* Remove the heavy black borders that were causing issues */

          /* Remove blue focus border from SelectBoxes */
        `}</style>
        <DataGrid
          dataSource={placements}
          keyExpr="id"
          width="100%"
          showBorders={false}
          hoverStateEnabled={false}
          showColumnLines={false}
          showRowLines={false}
          allowColumnResizing
          allowColumnReordering
          wordWrapEnabled
          columnAutoWidth={false}
          noDataText={isLoading ? "Loading..." : "No placements found."}
          elementAttr={{ class: "placement-datagrid" }}
          repaintChangesOnly={true}
          columnResizingMode="nextColumn"
          scrolling={{ showScrollbar: "always", useNative: true }}
          onExporting={createGridExportHandler('Placements')}
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
          <Column dataField="name" caption="Name" alignment="left" allowGrouping />
          <Column dataField="type" caption="Type" alignment="left" allowGrouping />
          <Column dataField="desktopDimensions" caption="Desktop Size" alignment="left" allowGrouping />
          <Column dataField="mobileDimensions" caption="Mobile Size" alignment="left" allowGrouping />
          <Column dataField="currency" caption="Currency" alignment="left" allowGrouping />
          <Column dataField="price" caption="Price" alignment="left" allowGrouping={false} />
          <Column dataField="fillPriority" caption="Priority" alignment="left" allowGrouping />
          <Column dataField="status" caption="Status" alignment="left" allowGrouping cellRender={(data) => (
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${data.value === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {data.value}
            </span>
          )} />
          <Column
            type="buttons"
            caption="Actions"
            width={110}
            alignment="center"
            allowExporting={false}
            allowGrouping={false}
            allowFiltering={false}
            buttons={[
              {
                hint: "Edit",
                icon: "edit",
                onClick: (e) => handleOpenModal(e.row.data),
              },
              {
                hint: "Delete",
                icon: "trash",
                onClick: (e) => {
                  e.event?.preventDefault();
                  e.event?.stopPropagation();
                  const rowData = e.row.data;
                  const targetId = rowData.placementId || rowData.id;
                  handleDelete(targetId);
                },
              },
            ]}
          />
          <Paging defaultPageSize={10} />
          <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
        </DataGrid>
      </div>

      {/* Modal / Drawer for Add/Edit Placement */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white border border-black w-full max-w-lg p-6 shadow-none relative">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 ">
                {editingId ? "Edit Placement" : "Add New Placement"}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 ">
              <div>
                <label className="block text-base font-bold text-gray-900 mb-1 ">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}

                  className="w-full border border-gray-300 px-3 py-2 text-sm outline-none rounded-none bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2 ">Placement Type</label>
                {placementTypes.length > 0 ? (
                  <SelectBox
                    items={placementTypes}
                    value={formData.type}
                    onValueChanged={(e) => setFormData(prev => ({ ...prev, type: e.value }))}
                    className="border border-gray-300 rounded-none h-10 bg-white focus:border-black"
                    placeholder="Select a type..."
                  />
                ) : (
                  <div className="text-red-500 text-xs font-medium bg-red-50 p-2 border border-red-200">
                    No taxonomy named "Placement type" found. Please configure it in the Taxonomy tab first.
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-base font-bold text-gray-900 mb-1 ">Desktop Dimensions</label>
                  <input
                    type="text"
                    name="desktopDimensions"
                    placeholder="e.g. 728x90"
                    value={formData.desktopDimensions}
                    onChange={handleChange}
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none rounded-none bg-white font-medium"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-base font-bold text-gray-900 mb-1 ">Mobile Dimensions</label>
                  <input
                    type="text"
                    name="mobileDimensions"
                    placeholder="e.g. 320x50"
                    value={formData.mobileDimensions}
                    onChange={handleChange}
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none rounded-none bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-40">
                  <label className="block text-base font-bold text-gray-900 mb-1 ">Currency</label>
                  <SelectBox
                    dataSource={CURRENCY_DISPLAY_ITEMS}
                    displayExpr="label"
                    valueExpr="code"
                    value={formData.currency}
                    onValueChanged={(e) => setFormData(prev => ({ ...prev, currency: e.value }))}
                    searchEnabled
                    className="border border-gray-300 rounded-none h-10 bg-white focus:border-black"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-base font-bold text-gray-900 mb-1 ">Price</label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 125.00"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none rounded-none bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-base font-bold text-gray-900 mb-1 ">Fill Priority</label>
                  <SelectBox
                    items={["Direct", "Direct + Ad-Sense"]}
                    value={formData.fillPriority}
                    onValueChanged={(e) => setFormData(prev => ({ ...prev, fillPriority: e.value }))}
                    className="border border-gray-300 rounded-none h-10 bg-white focus:border-black"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-base font-bold text-gray-900 mb-1 ">Status</label>
                  <SelectBox
                    items={["Active", "Inactive"]}
                    value={formData.status}
                    onValueChanged={(e) => setFormData(prev => ({ ...prev, status: e.value }))}
                    className="border border-gray-300 rounded-none h-10 bg-white focus:border-black"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 text-sm font-bold text-black hover:bg-gray-50 transition-colors rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={placementTypes.length === 0}
                  className="px-6 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-black rounded-none"
                >
                  Save Placement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Blocked Modal - Rendered via Portal */}
      {blockInfo.show && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setBlockInfo(prev => ({ ...prev, show: false }))}
        >
          <div
            className="bg-white border border-black w-full max-w-md p-0 shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-white border-b border-black p-6">
              <div className="flex items-center gap-3 text-black mb-2">
                <AlertCircle className="w-5 h-5 text-black" />
                <h2 className="text-xl font-bold uppercase tracking-tight">Deletion Blocked</h2>
              </div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                This placement is currently active in live campaigns.
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-black leading-relaxed">
                  The placement <span className="font-bold underline italic">"{blockInfo.placementName}"</span> cannot be deleted because it is being used by the following campaigns:
                </p>
              </div>

              <div className="space-y-0 border border-black max-h-60 overflow-y-auto custom-scrollbar">
                {blockInfo.campaigns.map((cp, idx) => (
                  <div
                    key={cp.id}
                    className={`flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors ${idx !== blockInfo.campaigns.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-black uppercase tracking-tight line-clamp-1">{cp.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                        {cp.advertiser || "Unknown Advertiser"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-black uppercase tracking-widest">
                        {cp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <div className="bg-gray-50 p-3 border-l-2 border-black">
                  <p className="text-[10px] text-gray-600 leading-relaxed font-medium">
                    <span className="font-bold text-black uppercase mr-1">Required Action:</span>
                    Pause or remove this placement from Campaign Hub listed above before attempting deletion again.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBlockInfo(prev => ({ ...prev, show: false }))}
                  className="w-full py-4 bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all uppercase tracking-widest border border-black shadow-lg active:scale-[0.98]"
                >
                  Understood
                </button>
              </div>
            </div>

            <button
              onClick={() => setBlockInfo(prev => ({ ...prev, show: false }))}
              className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Themed Confirmation Modal - Rendered via Portal */}
      {confirmDeleteInfo.show && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setConfirmDeleteInfo({ show: false, id: null, name: "" })}
        >
          <div
            className="bg-white border border-black w-full max-w-sm p-0 shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold uppercase tracking-tight text-black">Confirm Deletion</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-black italic">"{confirmDeleteInfo.name}"</span>?
                This action is permanent and cannot be undone.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={executeDelete}
                  className="w-full py-3 bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all uppercase tracking-widest border border-black shadow-lg active:scale-[0.98]"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteInfo({ show: false, id: null, name: "" })}
                  className="w-full py-3 bg-white text-black text-xs font-bold hover:bg-gray-50 transition-all uppercase tracking-widest border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>

            <button
              onClick={() => setConfirmDeleteInfo({ show: false, id: null, name: "" })}
              className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PlacementTab;

