import SelectBox from '@/components/ui/dx/select-box';
import { TextBox } from '@/components/ui/dx/text-box';
import { PatternRule, Validator } from '@/components/ui/dx/validator';
import { ChevronDown, ChevronUp, Code, Eye, Images, Loader2, Monitor, Plus, Smartphone, Star, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { UserContext } from '../../context/UserContext';
import apiFetch from '../../utils/api';
import env from '../../utils/env';
import CustomCalendar from '../common/CustomCalendar';

const AD_FORMAT_OPTIONS = ['Conventional Ad', 'Spotlight Ad', 'Popup Ad'];
const MAX_SPOTLIGHT_IMAGES = 4;
const MIN_SPOTLIGHT_IMAGES = 2;
const POPUP_TRIGGER_OPTIONS = [
    { label: 'Immediate', value: 'immediate' },
    { label: 'Time Delay', value: 'delay' },
    { label: 'Scroll Depth', value: 'scroll' },
    { label: 'Exit Intent', value: 'exit_intent' },
];

// Resolves the effective fallback slide: the explicitly chosen index if it still
// points at an uploaded image, otherwise the first uploaded slide.
const resolveSpotlightFallback = (images, preferredIndex) => {
    if (Number.isInteger(preferredIndex) && images[preferredIndex]) {
        return { url: images[preferredIndex], index: preferredIndex };
    }
    const index = images.findIndex(Boolean);
    return { url: index >= 0 ? images[index] : undefined, index: index >= 0 ? index : undefined };
};



const CreativeDropzone = ({ value, onChange, label, device, requiredWidth, requiredHeight, uploading, placementName }) => {
    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dimensionMismatch, setDimensionMismatch] = useState(false);
    const [actualDimensions, setActualDimensions] = useState(null);
    const [lastCheckedUrl, setLastCheckedUrl] = useState(null);

    const fileItem = value && value.length > 0 ? value[0] : null;

    useEffect(() => {
        const fileUrl = fileItem?.preview || fileItem?.fileUrl;
        if (fileUrl && requiredWidth && requiredHeight) {
            // Avoid infinite loops/re-checking if the URL and dimensions haven't changed
            const checkKey = `${fileUrl}_${requiredWidth}_${requiredHeight}`;
            if (lastCheckedUrl === checkKey) return;
            setLastCheckedUrl(checkKey);

            const img = new Image();
            img.onload = () => {
                const w = img.width;
                const h = img.height;
                setActualDimensions({ width: w, height: h });
                if (w !== requiredWidth || h !== requiredHeight) {
                    setDimensionMismatch(true);
                } else {
                    setDimensionMismatch(false);
                }
            };
            img.onerror = () => {
                setDimensionMismatch(false);
                setActualDimensions(null);
            };
            img.src = fileUrl;
        } else {
            setDimensionMismatch(false);
            setActualDimensions(null);
            setLastCheckedUrl(null);
        }
    }, [fileItem, requiredWidth, requiredHeight, device, placementName, lastCheckedUrl]);

    const handleFileSelection = (file) => {
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

        if (requiredWidth && requiredHeight && previewUrl) {
            const img = new Image();
            img.onload = () => {
                const isExactMatch = img.width === requiredWidth && img.height === requiredHeight;

                if (!isExactMatch) {
                    toast.error(`Invalid dimensions. Image must be exactly ${requiredWidth}x${requiredHeight}px.`);
                    URL.revokeObjectURL(previewUrl);
                    return;
                }
                onChange([{ file, name: file.name, type: file.type, preview: previewUrl, size: file.size, width: img.width, height: img.height }]);
            };
            img.src = previewUrl;
        } else {
            onChange([{ file, name: file.name, type: file.type, preview: previewUrl, size: file.size }]);
        }
    };

    return (
        <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    {device === 'desktop' ? <Monitor className="w-3.5 h-3.5 text-gray-400" /> : <Smartphone className="w-3.5 h-3.5 text-gray-400" />}
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</span>
                </div>
                {fileItem && (
                    <button onClick={() => onChange([])} className="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase">Remove</button>
                )}
            </div>

            <div
                className={`relative border-2 border-dashed rounded bg-gray-50/30 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden
                    ${isDragOver ? 'border-black bg-white' : 'border-gray-200 hover:border-gray-400'}
                    ${fileItem ? 'border-transparent bg-white' : ''}`}
                style={{
                    // Use aspect-ratio ONLY when a file is uploaded
                    aspectRatio: fileItem ? `${requiredWidth}/${requiredHeight}` : 'auto',
                    maxHeight: '250px',
                    // Predictable height for placeholder prevents truncation
                    height: fileItem ? 'auto' : '140px',
                    width: '100%',
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}
                onClick={() => !fileItem && !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelection(e.dataTransfer.files[0]); }}
            >
                {uploading ? (
                    <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                ) : fileItem ? (
                    <div className="w-full flex flex-col items-center">
                        {fileItem.preview ? (
                            <img src={fileItem.preview} alt={fileItem.name} className="w-full h-auto max-h-[150px] object-contain rounded" />
                        ) : (
                            <div className="py-6 flex flex-col items-center gap-1">
                                <Code className="w-6 h-6 text-black" />
                                <span className="text-[9px] text-black font-bold uppercase transition-all">Script Loaded</span>
                            </div>
                        )}
                        <p className="mt-1 text-[9px] text-gray-400 truncate w-full px-2 text-center">{fileItem.name}</p>
                    </div>
                ) : (
                    <>
                        <Upload className="w-4 h-4 text-gray-300 mb-1" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Image or Script</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.js,.html"
                            className="hidden"
                            onChange={(e) => handleFileSelection(e.target.files[0])}
                        />
                    </>
                )}
            </div>
            {dimensionMismatch && actualDimensions && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 text-[10px] font-semibold text-red-700 flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wider">⚠️ Dimension Mismatch</span>
                    <span>Uploaded: {actualDimensions.width}x{actualDimensions.height}px</span>
                    <span>Required: {requiredWidth}x{requiredHeight}px</span>
                    <span className="text-[9px] text-red-500 mt-1">Please re-upload a correct size image.</span>
                </div>
            )}
        </div>
    );
};

export default function JobCard({ job, onUpdate, onPlacementChange, onDelete, onPreview, index, disabledDates, resolveSchedule, campaignName, suggestedStartTime, minStartTime, dynamicPlacements = [], taxonomies = [] }) {
    const { user } = useContext(UserContext) ?? {};
    const token = user?.token;

    const authHeaders = useMemo(
        () => ({
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    const [isExpanded, setIsExpanded] = useState(true);
    const [uploadingState, setUploadingState] = useState({});
    const placementOptions = useMemo(() => {
        // 1. Try to find active dynamic placements first (these are the "Real" placements like 'Sidebar rectangle')
        const activePlacements = (dynamicPlacements || [])
            .filter(p => (p.status || '').toLowerCase() === 'active')
            .map(p => p.name);

        if (activePlacements.length > 0) {
            if (job.placement && !activePlacements.includes(job.placement)) {
                activePlacements.push(job.placement);
            }
            return activePlacements;
        }

        // 2. Fallback to the "Placement type" taxonomy values only if no dynamic placements exist
        const placementTax = (taxonomies || []).find(t => {
            const lowerName = t.name?.toLowerCase() || "";
            return (
                lowerName === "placement type" ||
                lowerName === "placement_type" ||
                lowerName === "[c] placement type" ||
                lowerName === "[c] placement_type"
            );
        });

        if (placementTax && placementTax.values && placementTax.values.length > 0) {
            return placementTax.values;
        }

        return [];
    }, [dynamicPlacements, taxonomies, job.placement]);

    const parseDim = (dimStr, defaultW, defaultH) => {
        if (!dimStr) return { width: defaultW, height: defaultH };
        // Robust split: handles '728x90', '730 * 95', '325X52', etc.
        const parts = dimStr.split(/\s*[*xX]\s*/);
        if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
            return { width: parseInt(parts[0].trim(), 10), height: parseInt(parts[1].trim(), 10) };
        }
        return { width: defaultW, height: defaultH };
    };

    const dynPlacement = dynamicPlacements.find(p =>
        p.name === job.placement ||
        p.name.toLowerCase().replace(/\s+/g, '-') === (job.placement || '').toLowerCase().replace(/\s+/g, '-')
    );

    // Support both 'type' (Placements API) and 'placement_type' (User's dummy data override)
    const jobType = (dynPlacement?.type || dynPlacement?.placement_type || '').toLowerCase();

    const isSpotlight = job.adFormat === 'spotlight';
    const isPopup = job.adFormat === 'popup';

    // Spotlight Ads reuse the In-Story "position within the article" mechanic
    // (After Paragraph) regardless of which placement slot they're attached to —
    // only the Repeat Ad option differs, since Spotlight always shows once.
    const isInStory = isSpotlight || jobType === "in_story" || jobType === "in story" || jobType === "in-story" ||
        (() => {
            const normalized = (job.placement || '').toLowerCase().trim().replace(/[\s_-]+/g, '-');
            return normalized === 'in-story' || normalized === 'instory' || normalized === 'instory-ad' || normalized === 'in-story-ad';
        })();

    let dimensions = {
        label: job.placement,
        desktop: { width: 728, height: 90, label: "Desktop (728x90)" },
        mobile: { width: 320, height: 50, label: "Mobile (320x50)" }
    };
    if (dynPlacement) {
        const dSize = parseDim(dynPlacement.desktopDimensions, 728, 90);
        const mSize = parseDim(dynPlacement.mobileDimensions, 320, 50);
        dimensions = {
            label: dynPlacement.name,
            desktop: { ...dSize, label: `Desktop (${dSize.width}x${dSize.height})` },
            mobile: { ...mSize, label: `Mobile (${mSize.width}x${mSize.height})` }
        };
    }

    const handleCreativeUpload = useCallback(async (device, fileDataArray) => {
        if (!fileDataArray || fileDataArray.length === 0) {
            onUpdate({ ...job, creatives: { ...job.creatives, [device]: [] } });
            return;
        }

        const fileData = fileDataArray[0];
        const file = fileData.file;

        const isImage = file.type.startsWith('image/');
        const isScript = file.type.includes('javascript') || file.type.includes('html') || file.name.endsWith('.js') || file.name.endsWith('.html');

        if (!isImage && !isScript) {
            toast.error('Only images and script files (.js, .html) are supported');
            return;
        }

        const uploadKey = `${job.id}_${device}`;

        try {
            setUploadingState(prev => ({ ...prev, [uploadKey]: true }));

            const campaignId = (campaignName || 'untitled')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            const placement = job.placement.toLowerCase().replace(/\s+/g, '-');

            const result = await apiFetch(`${env.backendApi}/uploadCampaignAdImage`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    campaignId,
                    placement,
                    device,
                    fileType: file.type,
                }),
            });

            if (!result.ok) throw new Error(`Failed to get upload URL (${result.status})`);

            const { uploadUrl, fileUrl } = await result.json();

            const s3Upload = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            if (!s3Upload.ok) throw new Error(`S3 upload failed (${s3Upload.status})`);

            const updatedFileData = { ...fileData, fileUrl };
            onUpdate({ ...job, creatives: { ...job.creatives, [device]: [updatedFileData] } });
            toast.success(`${device === 'desktop' ? 'Desktop' : 'Mobile'} image uploaded successfully`);
        } catch (error) {
            console.error('Campaign ad image upload failed:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploadingState(prev => ({ ...prev, [uploadKey]: false }));
        }
    }, [authHeaders, campaignName, job, onUpdate]);

    const handleSpotlightImageUpload = useCallback(async (slotIndex, fileDataArray) => {
        if (!fileDataArray || fileDataArray.length === 0) {
            const current = [...(job.spotlightMobileImages || [null, null])];
            current[slotIndex] = null;
            // If the cleared slot was the chosen fallback, fall back to the first uploaded slide.
            const preferredIndex = job.spotlightFallbackIndex === slotIndex ? undefined : job.spotlightFallbackIndex;
            const { url: fallbackUrl, index: fallbackIndex } = resolveSpotlightFallback(current, preferredIndex);
            onUpdate({ ...job, spotlightMobileImages: current, spotlightFallbackIndex: fallbackIndex, creatives: { ...job.creatives, mobile: fallbackUrl ? [{ fileUrl: fallbackUrl, name: 'spotlight-fallback', preview: fallbackUrl }] : [] } });
            return;
        }
        const fileData = fileDataArray[0];
        const file = fileData.file;
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Only image files are supported for Spotlight slides');
            return;
        }
        const uploadKey = `${job.id}_spotlight_${slotIndex}`;
        try {
            setUploadingState(prev => ({ ...prev, [uploadKey]: true }));
            const campaignId = (campaignName || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const placement = job.placement.toLowerCase().replace(/\s+/g, '-');
            const result = await apiFetch(`${env.backendApi}/uploadCampaignAdImage`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ campaignId, placement: `${placement}-slide-${slotIndex}`, device: 'mobile', fileType: file.type }),
            });
            if (!result.ok) throw new Error(`Failed to get upload URL (${result.status})`);
            const { uploadUrl, fileUrl } = await result.json();
            const s3Upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
            if (!s3Upload.ok) throw new Error(`S3 upload failed (${s3Upload.status})`);
            const current = [...(job.spotlightMobileImages || [null, null])];
            current[slotIndex] = fileUrl;
            const { url: fallbackUrl, index: fallbackIndex } = resolveSpotlightFallback(current, job.spotlightFallbackIndex);
            onUpdate({ ...job, spotlightMobileImages: current, spotlightFallbackIndex: fallbackIndex, creatives: { ...job.creatives, mobile: fallbackUrl ? [{ fileUrl: fallbackUrl, name: 'spotlight-fallback', preview: fallbackUrl }] : (job.creatives?.mobile || []) } });
            toast.success(`Slide ${slotIndex + 1} uploaded`);
        } catch (error) {
            console.error('Spotlight image upload failed:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploadingState(prev => ({ ...prev, [uploadKey]: false }));
        }
    }, [authHeaders, campaignName, job, onUpdate]);

    // Popup Ad creative upload — writes a plain image URL string to
    // popupDesktopImage/popupMobileImage (unlike creatives.desktop/mobile,
    // which store an array), so CreativeDropzone's array-shaped value is
    // synthesized on the way in and unwrapped on the way out.
    const handlePopupImageUpload = useCallback(async (device, fileDataArray) => {
        const field = device === 'desktop' ? 'popupDesktopImage' : 'popupMobileImage';
        if (!fileDataArray || fileDataArray.length === 0) {
            onUpdate({ ...job, [field]: '' });
            return;
        }
        const fileData = fileDataArray[0];
        const file = fileData.file;
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Only image files are supported for Popup Ad creatives');
            return;
        }
        const uploadKey = `${job.id}_popup_${device}`;
        try {
            setUploadingState(prev => ({ ...prev, [uploadKey]: true }));
            const campaignId = (campaignName || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const placement = (job.placement || 'popup').toLowerCase().replace(/\s+/g, '-');
            const result = await apiFetch(`${env.backendApi}/uploadCampaignAdImage`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ campaignId, placement: `${placement}-popup`, device, fileType: file.type }),
            });
            if (!result.ok) throw new Error(`Failed to get upload URL (${result.status})`);
            const { uploadUrl, fileUrl } = await result.json();
            const s3Upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
            if (!s3Upload.ok) throw new Error(`S3 upload failed (${s3Upload.status})`);
            onUpdate({ ...job, [field]: fileUrl });
            toast.success(`${device === 'desktop' ? 'Desktop' : 'Mobile'} popup image uploaded`);
        } catch (error) {
            console.error('Popup image upload failed:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploadingState(prev => ({ ...prev, [uploadKey]: false }));
        }
    }, [authHeaders, campaignName, job, onUpdate]);

    const adFormat = job.adFormat || 'conventional';
    // `|| [null, null]` doesn't catch empty arrays (truthy), so check length explicitly
    const spotlightImages = (Array.isArray(job.spotlightMobileImages) && job.spotlightMobileImages.length > 0)
        ? job.spotlightMobileImages
        : [null, null];

    // The slide currently used as the fallback/preview image (falls back to the first uploaded slide).
    const spotlightFallbackIndex = resolveSpotlightFallback(spotlightImages, job.spotlightFallbackIndex).index;

    const handleSetSpotlightFallback = (slotIndex) => {
        const url = spotlightImages[slotIndex];
        if (!url) return;
        onUpdate({ ...job, spotlightFallbackIndex: slotIndex, creatives: { ...job.creatives, mobile: [{ fileUrl: url, name: 'spotlight-fallback', preview: url }] } });
    };

    const handleAdFormatChange = (e) => {
        const newFormat = e.value === 'Spotlight Ad' ? 'spotlight' : e.value === 'Popup Ad' ? 'popup' : 'conventional';
        onUpdate({
            ...job,
            adFormat: newFormat,
            spotlightMobileImages: newFormat === 'spotlight' ? [null, null] : undefined,
            spotlightFallbackIndex: newFormat === 'spotlight' ? undefined : job.spotlightFallbackIndex,
            creatives: newFormat === 'popup' ? job.creatives : { ...job.creatives, mobile: [] },
            // Spotlight always shows once; In-story position defaults to paragraph 3 if unset.
            afterParagraph: newFormat === 'spotlight' ? (job.afterParagraph || 3) : job.afterParagraph,
            repeatAd: newFormat === 'spotlight' ? false : job.repeatAd,
            // Popup Ad defaults — page-wide overlay, so its own trigger/cap
            // config takes the place of the in-story position/repeat fields.
            popupTrigger: newFormat === 'popup' ? (job.popupTrigger || 'immediate') : job.popupTrigger,
            popupTriggerVal: newFormat === 'popup' ? (job.popupTriggerVal ?? 0) : job.popupTriggerVal,
            popupCapDays: newFormat === 'popup' ? (job.popupCapDays ?? 7) : job.popupCapDays,
            popupHideOnConvert: newFormat === 'popup' ? (job.popupHideOnConvert !== false) : job.popupHideOnConvert,
        });
    };

    const addSpotlightSlot = () => {
        if (spotlightImages.length >= MAX_SPOTLIGHT_IMAGES) return;
        onUpdate({ ...job, spotlightMobileImages: [...spotlightImages, null] });
    };

    const removeSpotlightSlot = (slotIndex) => {
        if (spotlightImages.length <= MIN_SPOTLIGHT_IMAGES) { toast.error('Spotlight Ad requires at least 2 slides'); return; }
        const updated = spotlightImages.filter((_, i) => i !== slotIndex);
        // Keep the fallback pointer aligned with the same image after the array shifts.
        const preferredIndex = job.spotlightFallbackIndex == null
            ? undefined
            : job.spotlightFallbackIndex === slotIndex
                ? undefined
                : job.spotlightFallbackIndex > slotIndex
                    ? job.spotlightFallbackIndex - 1
                    : job.spotlightFallbackIndex;
        const { url: fallbackUrl, index: fallbackIndex } = resolveSpotlightFallback(updated, preferredIndex);
        onUpdate({ ...job, spotlightMobileImages: updated, spotlightFallbackIndex: fallbackIndex, creatives: { ...job.creatives, mobile: fallbackUrl ? [{ fileUrl: fallbackUrl, name: 'spotlight-fallback', preview: fallbackUrl }] : [] } });
    };


    const handleTagChange = (device, value) => {
        const field = device === 'desktop' ? 'thirdPartyTagDesktop' : 'thirdPartyTagMobile';
        onUpdate({ ...job, [field]: value });
    };

    const handlePlacementChange = (e) => {
        const newPlacement = e.value;
        if (newPlacement === job.placement) return;

        // Notify assets clearing toast only if there were assets
        if (job.creatives?.desktop?.length > 0 || job.creatives?.mobile?.length > 0) {
            toast.success('Placement changed: Assets cleared to ensure correct dimensions.');
        }

        // Delegate to parent — which handles smart time recalculation without causing loops
        if (onPlacementChange) {
            onPlacementChange(job.id, newPlacement);
        }
    };


    return (
        <div className="bg-white border border-gray-200 overflow-hidden mb-6 transition-shadow shadow-sm">
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-black text-white text-[11px] font-bold">
                        {index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">
                        {job.placement || 'New Placement Job'}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onPreview}
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-200 rounded transition-colors text-black"
                        title="Preview this Job"
                    >
                        <Eye size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Preview</span>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-500"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                        title="Remove Job"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Section 1: Placement & Schedule */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Placement</label>
                                <SelectBox
                                    items={placementOptions}
                                    value={dynPlacement ? dynPlacement.name : job.placement}
                                    onValueChanged={handlePlacementChange}
                                    className="border border-gray-200 rounded"
                                    height={40}
                                    placeholder="Select Placement"
                                />
                            </div>

                            {/* Ad Format — only visible when a placement is selected */}
                            {job.placement && (
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ad Format</label>
                                    <SelectBox
                                        items={AD_FORMAT_OPTIONS}
                                        value={adFormat === 'spotlight' ? 'Spotlight Ad' : adFormat === 'popup' ? 'Popup Ad' : 'Conventional Ad'}
                                        onValueChanged={handleAdFormatChange}
                                        className="border border-gray-200 rounded"
                                        height={40}
                                    />
                                    {adFormat === 'spotlight' && (
                                        <p className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1">
                                            <Images size={11} />
                                            Mobile story-slider · 2–4 slides · desktop shows the starred slide as a card at the top of the right sidebar
                                        </p>
                                    )}
                                    {adFormat === 'popup' && (
                                        <p className="mt-1.5 text-[10px] text-gray-400 flex items-center gap-1">
                                            <Images size={11} />
                                            Full-page overlay shown once per trigger, independent of any specific placement zone
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Start Time</label>
                                    <div className="border border-gray-200 rounded px-2 hover:border-black focus-within:border-black transition-colors bg-white">
                                        <CustomCalendar
                                            value={job.startTime}
                                            onValueChanged={(e) => onUpdate({ ...job, startTime: e.value })}
                                            displayFormat="dd/MM/yyyy hh:mm a"
                                            disablePastDates={true}
                                            disabledDates={(args) => disabledDates(args, job.placement, job.id)}
                                            resolveValue={(d, src) => resolveSchedule ? resolveSchedule(job, 'startTime', d, src) : d}
                                            suggestedTime={suggestedStartTime}
                                            min={minStartTime || undefined}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">End Time</label>
                                    <div className="border border-gray-200 rounded px-2 hover:border-black focus-within:border-black transition-colors bg-white">
                                        <CustomCalendar
                                            value={job.endTime}
                                            onValueChanged={(e) => onUpdate({ ...job, endTime: e.value })}
                                            displayFormat="dd/MM/yyyy hh:mm a"
                                            disablePastDates={true}
                                            disabledDates={(args) => disabledDates(args, job.placement, job.id)}
                                            resolveValue={(d, src) => resolveSchedule ? resolveSchedule(job, 'endTime', d, src) : d}
                                            suggestedTime={job.startTime}
                                            min={(() => {
                                                // End time must be at least startTime+1min, else fall back to minStartTime
                                                if (job.startTime) {
                                                    const d = new Date(job.startTime);
                                                    d.setMinutes(d.getMinutes() + 1);
                                                    d.setSeconds(0, 0);
                                                    return d;
                                                }
                                                return minStartTime || undefined;
                                            })()}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Per-job landing page URL. Applies to every ad format —
                                when set, this is the link behind this specific ad on
                                the live site; when blank, the campaign-level URL is
                                used, which is how every existing campaign behaves.
                                Uses the same editor and URL pattern as the campaign's
                                Landing Page URL in Basic Info, minus the RequiredRule
                                so it stays optional. DevExtreme skips a PatternRule on
                                an empty value, so blank passes validation. */}
                            <div className="mt-4">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Landing Page URL (Optional)
                                </label>
                                <TextBox
                                    value={job.landingPageURL || ''}
                                    onValueChanged={(e) => onUpdate({ ...job, landingPageURL: e.value })}
                                    placeholder="https://example.com/landing-page"
                                    height={45}
                                >
                                    <Validator>
                                        <PatternRule
                                            pattern={/^(https?:\/\/)[^\s$.?#].[^\s]*$/i}
                                            message="URL must start with http:// or https:// (e.g. https://example.com)"
                                        />
                                    </Validator>
                                </TextBox>
                            </div>
                        </div>

                        {isPopup && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Trigger</label>
                                        <SelectBox
                                            items={POPUP_TRIGGER_OPTIONS}
                                            displayExpr="label"
                                            valueExpr="value"
                                            value={job.popupTrigger || 'immediate'}
                                            onValueChanged={(e) => onUpdate({ ...job, popupTrigger: e.value })}
                                            className="border border-gray-200 rounded"
                                            height={40}
                                        />
                                    </div>
                                    {(job.popupTrigger === 'delay' || job.popupTrigger === 'scroll') && (
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                {job.popupTrigger === 'delay' ? 'Delay (seconds)' : 'Scroll depth (%)'}
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={job.popupTrigger === 'scroll' ? 100 : undefined}
                                                value={job.popupTriggerVal ?? 0}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    if (raw === "") { onUpdate({ ...job, popupTriggerVal: "" }); return; }
                                                    const parsed = Number(raw);
                                                    if (!Number.isFinite(parsed)) return;
                                                    const bounded = job.popupTrigger === 'scroll' ? Math.max(0, Math.min(100, parsed)) : Math.max(0, parsed);
                                                    onUpdate({ ...job, popupTriggerVal: bounded });
                                                }}
                                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-black bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                                {job.popupTrigger === 'exit_intent' && (
                                    <p className="text-[10px] text-gray-400">
                                        Desktop only — no reliable exit signal exists on touch devices, so this trigger never fires on mobile.
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Frequency cap (days)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={job.popupCapDays ?? 7}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                if (raw === "") { onUpdate({ ...job, popupCapDays: "" }); return; }
                                                const parsed = Number(raw);
                                                if (!Number.isFinite(parsed)) return;
                                                onUpdate({ ...job, popupCapDays: Math.max(0, parsed) });
                                            }}
                                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-black bg-white"
                                        />
                                        <p className="mt-1.5 text-[10px] text-gray-400">Don&apos;t show the same visitor this popup again for this many days after it&apos;s seen.</p>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Hide after conversion</label>
                                        <div className="border border-gray-200 rounded px-3 py-2 bg-white flex items-center gap-2 h-[40px]">
                                            <input
                                                id={`popup-hide-convert-${job.id}`}
                                                type="checkbox"
                                                checked={job.popupHideOnConvert !== false}
                                                onChange={(e) => onUpdate({ ...job, popupHideOnConvert: e.target.checked })}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <label htmlFor={`popup-hide-convert-${job.id}`} className="text-xs text-gray-600 cursor-pointer">
                                                Never show again once clicked
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">CTA Text (optional)</label>
                                    <input
                                        type="text"
                                        value={job.popupCtaText || ''}
                                        onChange={(e) => onUpdate({ ...job, popupCtaText: e.target.value })}
                                        placeholder="e.g. Shop Now"
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-black bg-white"
                                    />
                                </div>
                            </div>
                        )}

                        {isInStory && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        {isSpotlight ? 'Spotlight slider position (mobile)' : 'In-story position'}
                                    </label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-white flex items-center gap-2">
                                        <span className="text-xs text-gray-500">After</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            step={1}
                                            value={job.afterParagraph ?? 3}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                if (raw === "") {
                                                    onUpdate({ ...job, afterParagraph: "" });
                                                    return;
                                                }
                                                const parsed = Number(raw);
                                                if (!Number.isFinite(parsed)) return;
                                                const bounded = Math.max(2, Math.min(20, Math.floor(parsed)));
                                                onUpdate({ ...job, afterParagraph: bounded });
                                            }}
                                            className="w-16 border border-gray-300 px-2 py-1 text-sm outline-none"
                                        />
                                        <span className="text-xs text-gray-500">paragraph(s)</span>
                                    </div>
                                    {isSpotlight && (
                                        <p className="mt-1.5 text-[10px] text-gray-400">
                                            Mobile only — the story-slider appears after this paragraph. On desktop the
                                            Spotlight ad shows as a fallback image card at the top of the article&apos;s
                                            right sidebar, scrolling behind the other sidebar cards as the page scrolls,
                                            regardless of this setting.
                                        </p>
                                    )}                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Repeat Ad
                                    </label>
                                    {isSpotlight ? (
                                        <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50">
                                            <span className="text-xs text-gray-500">Spotlight Ad shows only once — repeating is not supported for this format.</span>
                                        </div>
                                    ) : (
                                        <div className="border border-gray-200 rounded px-3 py-2 bg-white flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Repeat after every {job.afterParagraph ?? 3} paragraphs?</span>
                                            <select
                                                value={job.repeatAd !== false ? "yes" : "no"}
                                                onChange={(e) => {
                                                    onUpdate({ ...job, repeatAd: e.target.value === "yes" });
                                                }}
                                                className="border border-gray-300 px-2 py-1 text-sm outline-none bg-white font-medium cursor-pointer"
                                            >
                                                <option value="yes">Yes</option>
                                                <option value="no">No (Show only once)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section 2: Creatives & Tags */}
                        <div className="space-y-8">
                            {/* Creatives Row */}
                            <div className={`flex flex-col flex-wrap ${!isInStory ? 'md:flex-row' : ''} gap-6`}>
                                {isPopup ? (
                                    <>
                                        <div className="flex-1">
                                            <CreativeDropzone
                                                label="Popup Desktop Image"
                                                device="desktop"
                                                value={job.popupDesktopImage ? [{ fileUrl: job.popupDesktopImage, preview: job.popupDesktopImage }] : []}
                                                onChange={(val) => handlePopupImageUpload('desktop', val)}
                                                uploading={uploadingState[`${job.id}_popup_desktop`]}
                                                placementName={job.placement}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <CreativeDropzone
                                                label="Popup Mobile Image"
                                                device="mobile"
                                                value={job.popupMobileImage ? [{ fileUrl: job.popupMobileImage, preview: job.popupMobileImage }] : []}
                                                onChange={(val) => handlePopupImageUpload('mobile', val)}
                                                uploading={uploadingState[`${job.id}_popup_mobile`]}
                                                placementName={job.placement}
                                            />
                                        </div>
                                    </>
                                ) : (
                                <>
                                {/* Desktop image — hidden for Spotlight (mobile-only format) */}
                                {adFormat !== 'spotlight' && (
                                <div className={`flex-1 transition-opacity ${job.thirdPartyTagDesktop ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <CreativeDropzone
                                        label={dimensions.desktop.label}
                                        device="desktop"
                                        requiredWidth={dimensions.desktop.width}
                                        requiredHeight={dimensions.desktop.height}
                                        value={job.creatives?.desktop}
                                        onChange={(val) => handleCreativeUpload('desktop', val)}
                                        uploading={uploadingState[`${job.id}_desktop`]}
                                        placementName={job.placement}
                                    />
                                </div>
                                )}
                                {adFormat === 'spotlight' ? (
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Images size={13} className="text-gray-400" />
                                                <div>
                                                    <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider leading-none">Spotlight Slides</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">Mobile story slider · {spotlightImages.length}/{MAX_SPOTLIGHT_IMAGES} slides</p>
                                                </div>
                                            </div>
                                            {spotlightImages.length < MAX_SPOTLIGHT_IMAGES && (
                                                <button
                                                    onClick={addSpotlightSlot}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black bg-gray-100 border border-gray-200 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    <Plus size={9} /> Add Slide
                                                </button>
                                            )}
                                        </div>

                                        {/* Slide Cards — horizontal scroll on narrow screens */}
                                        {spotlightImages.filter(Boolean).length >= 2 && (
                                            <p className="text-[9px] text-gray-400 flex items-center gap-1 mb-2">
                                                <Star size={9} />
                                                Tap the star on a slide to choose which image is used as the fallback/preview.
                                            </p>
                                        )}
                                        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                                            {spotlightImages.map((imgUrl, slotIndex) => (
                                                <div
                                                    key={slotIndex}
                                                    className="relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors"
                                                    style={{
                                                        width: 110,
                                                        height: 195,
                                                        borderColor: slotIndex === spotlightFallbackIndex ? '#f59e0b' : (imgUrl ? '#111' : '#e5e7eb'),
                                                        background: imgUrl ? '#000' : '#fafafa',
                                                    }}
                                                >
                                                    {/* Slide number badge */}
                                                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                                                        <span className="flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black"
                                                            style={{ background: imgUrl ? 'rgba(255,255,255,0.9)' : '#111', color: imgUrl ? '#111' : '#fff' }}>
                                                            {slotIndex + 1}
                                                        </span>
                                                    </div>

                                                    {/* Set as fallback — only meaningful once 2+ slides are uploaded */}
                                                    {imgUrl && spotlightImages.filter(Boolean).length >= 2 && (
                                                        <button
                                                            onClick={() => handleSetSpotlightFallback(slotIndex)}
                                                            disabled={slotIndex === spotlightFallbackIndex}
                                                            className="absolute bottom-1.5 right-1.5 z-20 w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                                                            style={{
                                                                background: slotIndex === spotlightFallbackIndex ? '#f59e0b' : 'rgba(0,0,0,0.55)',
                                                                cursor: slotIndex === spotlightFallbackIndex ? 'default' : 'pointer',
                                                            }}
                                                            title={slotIndex === spotlightFallbackIndex ? 'This slide is the fallback image' : 'Set as fallback image'}
                                                        >
                                                            <Star size={11} className="text-white" fill={slotIndex === spotlightFallbackIndex ? 'currentColor' : 'none'} />
                                                        </button>
                                                    )}

                                                    {/* Remove slot button — only shown when slot is empty and >2 slots */}
                                                    {!imgUrl && spotlightImages.length > MIN_SPOTLIGHT_IMAGES && (
                                                        <button
                                                            onClick={() => removeSpotlightSlot(slotIndex)}
                                                            className="absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-500 hover:text-white text-gray-500 transition-colors"
                                                            title="Remove slot"
                                                        >
                                                            <X size={9} />
                                                        </button>
                                                    )}

                                                    {/* Preview / Upload area */}
                                                    {imgUrl ? (
                                                        <>
                                                            <img
                                                                src={imgUrl}
                                                                alt={`Slide ${slotIndex + 1}`}
                                                                className="w-full h-full object-cover"
                                                                style={{ minHeight: 195, display: 'block' }}
                                                            />
                                                            {/* Clear image button */}
                                                            <button
                                                                onClick={() => handleSpotlightImageUpload(slotIndex, [])}
                                                                className="absolute top-2 right-2 z-20 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-500 text-white transition-colors"
                                                                title="Remove image"
                                                            >
                                                                <X size={9} />
                                                            </button>
                                                            {/* Re-upload overlay */}
                                                            <label className="absolute inset-0 flex flex-col items-center justify-end pb-3 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                                                                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 40%, transparent)' }}>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const f = e.target.files?.[0];
                                                                        if (f) handleSpotlightImageUpload(slotIndex, [{ file: f }]);
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                                <span className="text-[9px] font-bold text-white uppercase tracking-wider">Replace</span>
                                                            </label>
                                                        </>
                                                    ) : uploadingState[`${job.id}_spotlight_${slotIndex}`] ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                            <Loader2 size={18} className="animate-spin text-gray-400" />
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase">Uploading…</span>
                                                        </div>
                                                    ) : (
                                                    <label className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) handleSpotlightImageUpload(slotIndex, [{ file: f }]);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                                <Upload size={14} className="text-gray-400" />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center px-2">Upload</span>
                                                            <span className="text-[8px] text-gray-300 text-center px-1">{dimensions.mobile.width}×{dimensions.mobile.height}px</span>
                                                        </label>
                                                    )}

                                                    {/* "Fallback" tag — reflects the chosen fallback slide (defaults to the first uploaded slide) */}
                                                    {slotIndex === spotlightFallbackIndex && (
                                                        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
                                                            <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider"
                                                                style={{ background: imgUrl ? 'rgba(0,0,0,0.7)' : '#e5e7eb', color: imgUrl ? '#fff' : '#555' }}>
                                                                fallback
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Progress dots */}
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className="flex gap-1.5">
                                                {spotlightImages.map((url, i) => (
                                                    <div key={i}
                                                        className="rounded-full transition-all"
                                                        style={{ width: url ? 18 : 6, height: 6, background: url ? '#111' : '#e5e7eb' }}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[9px] text-gray-400">
                                                {spotlightImages.filter(Boolean).length}/{spotlightImages.length} uploaded
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`flex-1 transition-opacity ${job.thirdPartyTagMobile ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <CreativeDropzone
                                            label={dimensions.mobile.label}
                                            device="mobile"
                                            requiredWidth={dimensions.mobile.width}
                                            requiredHeight={dimensions.mobile.height}
                                            value={job.creatives?.mobile}
                                            onChange={(val) => handleCreativeUpload('mobile', val)}
                                            uploading={uploadingState[`${job.id}_mobile`]}
                                            placementName={job.placement}
                                        />
                                    </div>
                                )}
                                </>
                                )}
                            </div>

                            {/* Third Party Tags Row — hidden for Spotlight/Popup (not applicable) */}
                            {adFormat !== 'spotlight' && adFormat !== 'popup' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Code size={14} className="text-gray-400" />
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight">Third Party Tag (Desktop)</label>
                                    </div>
                                    <textarea
                                        key={`desktop-tag-${job.id}-${job.thirdPartyTagDesktop ? 'exists' : 'empty'}`}
                                        value={job.thirdPartyTagDesktop || ''}
                                        onChange={(e) => handleTagChange('desktop', e.target.value)}
                                        className="w-full h-24 p-3 text-[12px] text-black font-medium border border-gray-200 rounded focus:border-black focus:outline-none transition-colors resize-none placeholder:text-gray-300 bg-gray-50/20"
                                        placeholder="Paste desktop tracking/serving tag here..."
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Code size={14} className="text-gray-400" />
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight">Third Party Tag (Mobile)</label>
                                    </div>
                                    <textarea
                                        key={`mobile-tag-${job.id}-${job.thirdPartyTagMobile ? 'exists' : 'empty'}`}
                                        value={job.thirdPartyTagMobile || ''}
                                        onChange={(e) => handleTagChange('mobile', e.target.value)}
                                        className="w-full h-24 p-3 text-[12px] text-black font-medium border border-gray-200 rounded focus:border-black focus:outline-none transition-colors resize-none placeholder:text-gray-300 bg-gray-50/20"
                                        placeholder="Paste mobile tracking/serving tag here..."
                                    />
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
