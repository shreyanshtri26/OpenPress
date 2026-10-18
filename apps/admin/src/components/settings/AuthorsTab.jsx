import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
} from '@/components/ui/dx/data-grid';
import { UserContext } from "../../context/UserContext";
import apiFetch from "../../utils/api";
import env from "@/utils/env";
import toast from "react-hot-toast";
import { User2Icon } from "lucide-react";
import { createGridExportHandler } from "../../utils/dataGridExport";

const EMPTY_FORM = {
    name: "",
    image: "",
    imageName: "",
    introduction: "",
};

const AuthorsTab = ({ onRegisterAddAuthor }) => {
    const { user } = useContext(UserContext) ?? {};
    const token = user?.token;

    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingAuthorId, setEditingAuthorId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    const authHeaders = useMemo(
        () => ({
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    const fetchAuthors = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`${env.backendApi}/getAuthors`, {
                method: "GET",
                headers: authHeaders,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to fetch authors");

            const rawAuthors = Array.isArray(json) ? json : (json.authors || json.data || []);

            const formatted = rawAuthors.map((dbAuthor, index) => ({
                id: dbAuthor.userId || `author-${index}`,
                email: dbAuthor.email,
                name: dbAuthor.authorName || dbAuthor.fullName || "",
                image: dbAuthor.profilePic || "",
                introduction: dbAuthor.bio || "",
                createdAt: dbAuthor.createdAt || Date.now(),
            }));

            setAuthors(formatted);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load authors: " + (e?.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        fetchAuthors();
    }, [fetchAuthors]);



    const resetForm = useCallback(() => {
        setFormData(EMPTY_FORM);
        setErrors({});
        setEditingAuthorId(null);
    }, []);

    const openAddModal = useCallback(() => {
        resetForm();
        setShowModal(true);
    }, [resetForm]);

    const closeModal = useCallback(() => {
        setShowModal(false);
    }, []);

    const handleChange = useCallback((field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    }, []);

    const handleImageUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setErrors((prev) => ({ ...prev, image: "Please upload a valid image file" }));
            return;
        }

        try {
            setUploading(true);
            // Step 1: Request a presigned S3 upload URL
            const result = await apiFetch(`${env.backendApi}/uploadUserImage`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                }),
            });
            if (!result.ok) throw new Error(`Failed to get upload URL (${result.status})`);

            const { uploadUrl, fileUrl } = await result.json();

            // Step 2: Upload file directly to S3
            const s3Upload = await apiFetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!s3Upload.ok) throw new Error(`S3 upload failed (${s3Upload.status})`);

            setFormData((prev) => ({
                ...prev,
                image: fileUrl,
                imageName: file.name,
            }));
            setErrors((prev) => ({ ...prev, image: "" }));
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Upload failed:", error);
            setErrors((prev) => ({ ...prev, image: "Upload failed: " + error.message }));
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    }, [authHeaders]);

    const validate = useCallback(() => {
        const nextErrors = {};

        if (!formData.name.trim()) nextErrors.name = "Name is required";

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }, [formData.name]);

    const handleSubmit = useCallback(async (event) => {

        event.preventDefault();
        if (!validate()) return;

        const payload = {
            name: formData.name.trim(),
            image: formData.image,
            introduction: formData.introduction.trim(),
            createdAt: Date.now(),
        };

        if (editingAuthorId) {
            const currentAuthor = authors.find(a => a.id === editingAuthorId);
            if (!currentAuthor?.email) {
                toast.error("Author email is missing");
                return;
            }

            try {
                setSubmitting(true);
                const apiPayload = {
                    email: currentAuthor.email,
                    authorName: formData.name.trim(),
                    profilePic: formData.image,
                    bio: formData.introduction.trim()
                };

                const res = await apiFetch(`${env.backendApi}/editUser`, {
                    method: "PUT",
                    headers: authHeaders,
                    body: JSON.stringify(apiPayload)
                });

                const json = await res.json();
                if (!res.ok) throw new Error(json.message || "Failed to update author");

                setAuthors((prev) =>
                    prev.map((author) =>
                        author.id === editingAuthorId
                            ? { ...author, ...payload, createdAt: author.createdAt }
                            : author
                    )
                );

                toast.success("Author updated successfully");
                closeModal();
                resetForm();
            } catch (error) {
                console.error(error);
                toast.error(error.message || "Failed to update author");
            } finally {
                setSubmitting(false);
            }
        } else {
            toast.error("Add Author functionality is coming soon");
        }
    }, [closeModal, editingAuthorId, formData.image, formData.introduction, formData.name, resetForm, validate, authors, authHeaders]);

    const handleEditAuthor = useCallback((rowData) => {
        setEditingAuthorId(rowData.id);
        setFormData({
            name: rowData.name || "",
            image: rowData.image || "",
            imageName: "",
            introduction: rowData.introduction || "",
        });
        setErrors({});
        setShowModal(true);
    }, []);

    const removeAuthorFromReporterTaxonomies = useCallback(async (authorName) => {
        const trimmedName = String(authorName || "").trim();
        if (!trimmedName) return;

        try {
            const taxonomiesRes = await apiFetch(`${env.backendApi}/taxonomies`, {
                method: "GET",
                headers: authHeaders,
            });

            const taxonomiesJson = await taxonomiesRes.json();
            if (!taxonomiesRes.ok) {
                throw new Error(taxonomiesJson?.message || "Failed to fetch taxonomies");
            }

            const taxonomies = Array.isArray(taxonomiesJson?.taxonomies)
                ? taxonomiesJson.taxonomies
                : [];

            const reporterRelatedTaxonomyIds = taxonomies
                .filter((taxonomy) => {
                    const name = String(taxonomy?.name || "").toLowerCase();
                    return (
                        name.includes("author") ||
                        name.includes("reporter") ||
                        name.includes("journalist")
                    );
                })
                .map((taxonomy) => taxonomy?.taxonomyId)
                .filter(Boolean);

            if (reporterRelatedTaxonomyIds.length === 0) {
                return;
            }

            await Promise.allSettled(
                reporterRelatedTaxonomyIds.map((taxonomyId) =>
                    apiFetch(`${env.backendApi}/taxonomy/value`, {
                        method: "DELETE",
                        headers: authHeaders,
                        body: JSON.stringify({
                            taxonomyId,
                            value: trimmedName,
                        }),
                    })
                )
            );
        } catch (error) {
            console.error("Failed to sync reporter taxonomies after author delete:", error);
        }
    }, [authHeaders]);

    const handleDeleteAuthor = useCallback(async (rowData) => {
        const id = rowData?.id;
        const email = rowData?.email;
        const authorName = rowData?.name;

        if (!id || !email) {
            toast.error("Author email is missing");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this author?")) return;

        try {
            const res = await apiFetch(`${env.backendApi}/deleteAuthor`, {
                method: "DELETE",
                headers: authHeaders,
                body: JSON.stringify({ email }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to delete author");

            setAuthors((prev) => prev.filter((author) => author.id !== id));
            await removeAuthorFromReporterTaxonomies(authorName);
            toast.success("Author deleted successfully");
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to delete author");
        }
    }, [authHeaders, removeAuthorFromReporterTaxonomies]);

    const authorsData = useMemo(() => authors, [authors]);

    useEffect(() => {
        onRegisterAddAuthor?.(openAddModal);
        return () => onRegisterAddAuthor?.(null);
    }, [onRegisterAddAuthor, openAddModal]);

    return (
        <>
            <div className="mt-6 bg-white border border-black overflow-hidden">
                <style jsx global>{`
                    .allstories-datagrid .dx-datagrid-addrow-button,
                    .allstories-datagrid .dx-command-edit .dx-link-add {
                    display: none !important;
                    }
                    .allstories-datagrid .dx-datagrid-rowsview tbody tr.dx-data-row:last-child > td {
                    border-bottom: 0 !important;
                    }
                `}</style>

                <DataGrid
                    dataSource={authorsData}
                    keyExpr="id"
                    showBorders={false}
                    hoverStateEnabled
                    showColumnLines={false}
                    showRowLines={false}
                    allowColumnResizing
                    allowColumnReordering
                    wordWrapEnabled
                    columnAutoWidth
                    noDataText={loading ? "Loading..." : "No authors found"}
                    elementAttr={{ class: "allstories-datagrid" }}
                    onExporting={createGridExportHandler('Authors')}
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

                    <Column dataField="name" caption="Name" allowGrouping />

                    <Column
                        caption="Image"
                        dataField="image"
                        width={120}
                        allowFiltering={false}
                        allowHeaderFiltering={false}
                        allowGrouping={false}
                        allowExporting={false}
                        cellRender={({ data }) => (
                            <div className="h-12 w-12 flex items-center justify-center border border-gray-100 bg-gray-50 overflow-hidden shadow-sm">
                                {data.image ? (
                                    <img src={data.image} alt={data.name} className="h-full w-full object-cover" />
                                ) : (
                                    <User2Icon className="h-10 w-10 text-gray-300 stroke-[1.5]" />
                                )}
                            </div>
                        )}
                    />

                    <Column dataField="introduction" caption="Bio" allowGrouping={false} />
                    <Column dataField="createdAt" sortOrder="desc" sortIndex={0} visible={false} />

                    <Column
                        caption="Action"
                        type="buttons"
                        width={120}
                        allowExporting={false}
                        allowFiltering={false}
                        allowGrouping={false}
                        buttons={[
                            {
                                hint: "Edit",
                                icon: "edit",
                                onClick: (e) => handleEditAuthor(e.row.data),
                            },
                            {
                                hint: "Delete",
                                icon: "trash",
                                onClick: (e) => handleDeleteAuthor(e.row.data),
                            },
                        ]}
                    />

                    <Paging defaultPageSize={8} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[8, 10, 20, 50, 'all']} />
                </DataGrid>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md border border-black bg-white p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingAuthorId ? "Edit Author" : "Add Author"}
                            </h2>
                            <button
                                type="button"
                                className="text-gray-500 hover:text-black"
                                onClick={closeModal}
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-gray-900">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="w-full border border-black px-3 py-2 text-sm outline-none"
                                    placeholder="Enter author name"
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-bold text-gray-900">Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className={`w-full border border-black px-3 py-2 text-sm outline-none ${uploading ? 'bg-gray-100' : ''}`}
                                />
                                {formData.image ? (
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="h-12 w-12 overflow-hidden border border-gray-100 shadow-sm">
                                            <img
                                                src={formData.image}
                                                alt="Uploaded preview"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <span className="text-xs text-gray-600 font-bold">{formData.imageName || "Current image"}</span>
                                    </div>
                                ) : (
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="h-12 w-12 flex items-center justify-center border border-gray-100 bg-gray-50 shadow-sm">
                                            <User2Icon className="h-10 w-10 text-gray-300 stroke-[1.5]" />
                                        </div>
                                        <span className="text-xs text-gray-500 italic">No image uploaded</span>
                                    </div>
                                )}
                                {errors.image && <p className="mt-1 text-xs text-red-600">{errors.image}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-bold text-gray-900">Bio</label>
                                <textarea
                                    rows={4}
                                    value={formData.introduction}
                                    onChange={(e) => handleChange("introduction", e.target.value)}
                                    className="w-full border border-black px-3 py-2 text-sm outline-none"
                                    placeholder="Write author introduction"
                                />
                                {errors.introduction && <p className="mt-1 text-xs text-red-600">{errors.introduction}</p>}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="border border-black px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || submitting}
                                    className={`border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 ${(uploading || submitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {submitting ? "Saving..." : (uploading ? "Uploading..." : (editingAuthorId ? "Save changes" : "Add author"))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default AuthorsTab;
