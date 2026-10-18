import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import CustomButton from './CustomButton';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
import { UserContext } from '@/context/UserContext';

// Asset URLs are used exactly as the API returns them (any S3-compatible storage).
const getCanonicalS3Url = (url) => url;

const buildCorsSafeUrl = (url) => {
  if (!url) return url;
  const normalized = getCanonicalS3Url(url);
  return normalized + (normalized.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
};

// Aspect ratio values
const RATIO_ASPECTS = {
  '16:9': 16 / 9,
  '1:1': 1,
  '3:2': 3 / 2,
  '4:3': 4 / 3,
  original: null,
};

const makeDefaultRatioSettings = () => ({
  '16:9': { focalPoint: { x: 50, y: 50 }, zoom: 1 },
  '1:1': { focalPoint: { x: 50, y: 50 }, zoom: 1 },
  '3:2': { focalPoint: { x: 50, y: 50 }, zoom: 1 },
  '4:3': { focalPoint: { x: 50, y: 50 }, zoom: 1 },
  original: { focalPoint: { x: 50, y: 50 }, zoom: 1 },
});

const ImageFocalEditor = ({ imageUrl, assetId, onClose, onSave, initialFocalPoint, initialCaption = '', isFeaturedImage = false }) => {
  const [activeTab, setActiveTab] = useState('Frame');

  // point and zoom, so the side frames can be composed independently.
  const [ratioSettings, setRatioSettings] = useState(() => {
    const defaults = makeDefaultRatioSettings();
    if (initialFocalPoint) {
      defaults['16:9'] = { ...defaults['16:9'], focalPoint: initialFocalPoint };
    }
    return defaults;
  });

  // Featured Image is always locked to the 16:9 slot; the canvas image tool
  // lets the user switch between ratios (including "original").
  const [selectedRatioKey, setSelectedRatioKey] = useState('16:9');
  const effectiveRatioKey = isFeaturedImage ? '16:9' : selectedRatioKey;

  const activeRatioSettings = ratioSettings[effectiveRatioKey] || ratioSettings['16:9'];
  const focalPoint = activeRatioSettings.focalPoint;
  const zoom = activeRatioSettings.zoom;

  const setFocalPoint = (updater) => {
    setRatioSettings((prev) => {
      const key = prev[effectiveRatioKey] ? effectiveRatioKey : '16:9';
      const current = prev[key].focalPoint;
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [key]: { ...prev[key], focalPoint: next } };
    });
  };

  const setZoom = (updater) => {
    setRatioSettings((prev) => {
      const key = prev[effectiveRatioKey] ? effectiveRatioKey : '16:9';
      const current = prev[key].zoom;
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [key]: { ...prev[key], zoom: next } };
    });
  };

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, focalX: 0, focalY: 0 });
  const [imageRef, setImageRef] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(100);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [urlWithCorsKey, setUrlWithCorsKey] = useState(() => buildCorsSafeUrl(imageUrl));

  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [caption, setCaption] = useState('');

  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const imageContainerRef = useRef(null);

  useEffect(() => {
    setUrlWithCorsKey(buildCorsSafeUrl(imageUrl));
  }, [imageUrl]);

  useEffect(() => {
    setCaption(typeof initialCaption === 'string' ? initialCaption : '');
  }, [initialCaption]);

  // Featured Image: 3 static side previews (no 16:9, no Original).
  // Canvas image tool: 4 selectable ratios plus Original.
  const ratios = isFeaturedImage
    ? [
        { ratio: '1:1', width: 80, height: 80 },
        { ratio: '3:2', width: 120, height: 80 },
        { ratio: '4:3', width: 133, height: 100 },
      ]
    : [
        { ratio: '1:1', width: 80, height: 80 },
        { ratio: '3:2', width: 120, height: 80 },
        { ratio: '4:3', width: 133, height: 100 },
        { ratio: '16:9', width: 140, height: 79 },
      ];

  const handleMouseDown = (e) => {
    if (activeTab !== 'Frame' || !imageRef || !imageContainerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX ?? e.pageX,
      y: e.clientY ?? e.pageY,
      focalX: focalPoint.x,
      focalY: focalPoint.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || activeTab !== 'Frame' || !imageRef || !imageContainerRef.current) return;
    const currentX = e.clientX ?? e.pageX;
    const currentY = e.clientY ?? e.pageY;
    const dx = currentX - dragStart.x;
    const dy = currentY - dragStart.y;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const imgWidth = imageRef.naturalWidth;
    const imgHeight = imageRef.naturalHeight;
    const containerAspect = rect.width / rect.height;
    const imageAspect = imgWidth / imgHeight;
    let totalHiddenWidth, totalHiddenHeight;
    if (imageAspect > containerAspect) {
      const renderedWidth = (rect.height * imageAspect) * zoom;
      totalHiddenWidth = renderedWidth - rect.width;
      totalHiddenHeight = (rect.height * zoom) - rect.height;
    } else {
      const renderedHeight = (rect.width / imageAspect) * zoom;
      totalHiddenHeight = renderedHeight - rect.height;
      totalHiddenWidth = (rect.width * zoom) - rect.width;
    }
    let newFocalX = dragStart.focalX;
    let newFocalY = dragStart.focalY;
    if (totalHiddenWidth > 0) {
      newFocalX = dragStart.focalX - (dx / totalHiddenWidth) * 100;
    }
    if (totalHiddenHeight > 0) {
      newFocalY = dragStart.focalY - (dy / totalHiddenHeight) * 100;
    }
    setFocalPoint({
      x: Math.min(100, Math.max(0, newFocalX)),
      y: Math.min(100, Math.max(0, newFocalY))
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleReset = () => {
    setRatioSettings((prev) => ({
      ...prev,
      [effectiveRatioKey]: { focalPoint: { x: 50, y: 50 }, zoom: 1 },
    }));
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSharpness(100);
    setCroppedImageUrl(null);
  };

  const generateCroppedImage = async (image, filters = {}, isFullImage = false) => {
    if (!image) return null;
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    let pixelCrop;

    if (isFullImage) {
      // Featured Image always exports a fixed 16:9 crop.
      // Canvas image tool exports whatever ratio (or "original") is selected.
      const baseAspect = RATIO_ASPECTS[effectiveRatioKey];
      const targetAspect = isFeaturedImage
        ? 16 / 9
        : (effectiveRatioKey === 'original' ? (naturalWidth / naturalHeight) : (baseAspect || 16 / 9));
      const imageAspect = naturalWidth / naturalHeight;
      let baseCropWidth, baseCropHeight;

      if (imageAspect > targetAspect) {
        baseCropHeight = naturalHeight;
        baseCropWidth = naturalHeight * targetAspect;
      } else {
        baseCropWidth = naturalWidth;
        baseCropHeight = baseCropWidth / targetAspect;
      }

      const cropWidth = baseCropWidth / zoom;
      const cropHeight = baseCropHeight / zoom;

      // Calculate crop coordinates based on object-position logic:
      let cropX = (focalPoint.x / 100) * (naturalWidth - cropWidth);
      let cropY = (focalPoint.y / 100) * (naturalHeight - cropHeight);

      pixelCrop = {
        x: Math.round(cropX),
        y: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
      };
    } else {
      pixelCrop = { x: 0, y: 0, width: naturalWidth, height: naturalHeight };
    }

    pixelCrop.x = Math.max(0, Math.min(pixelCrop.x, naturalWidth - 1));
    pixelCrop.y = Math.max(0, Math.min(pixelCrop.y, naturalHeight - 1));
    pixelCrop.width = Math.min(pixelCrop.width, naturalWidth - pixelCrop.x);
    pixelCrop.height = Math.min(pixelCrop.height, naturalHeight - pixelCrop.y);

    const MAX_CANVAS_SIZE = 2500;
    let canvasWidth = pixelCrop.width;
    let canvasHeight = pixelCrop.height;
    if (canvasWidth > MAX_CANVAS_SIZE || canvasHeight > MAX_CANVAS_SIZE) {
      const scale = Math.min(MAX_CANVAS_SIZE / canvasWidth, MAX_CANVAS_SIZE / canvasHeight);
      canvasWidth = Math.round(canvasWidth * scale);
      canvasHeight = Math.round(canvasHeight * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    const { brightness = 100, contrast = 100, saturation = 100, sharpness = 100 } = filters;
    const blurAmount = Math.max(0, (100 - sharpness) / 50);
    try {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blurAmount}px)`;
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvasWidth, canvasHeight);

      return new Promise((resolve) => {
        try {
          canvas.toBlob((blob) => {
            if (!blob) { resolve(image.src || null); return; }
            resolve(URL.createObjectURL(blob));
          }, 'image/jpeg', 0.92);
        } catch {
          resolve(image.src || null);
        }
      });
    } catch (drawErr) {
      console.warn("Canvas crop failed, falling back to original image:", drawErr);
      return image.src || null;
    }
  };

  const handlePreview = async () => {
    try {
      if (!imageRef) return;
      if (!caption.trim()) {
        setCaption(initialCaption || 'Featured image');
      }

      const finalUrl = await generateCroppedImage(imageRef, { brightness, contrast, saturation, sharpness }, true);

      if (!finalUrl) {
        console.warn('No finalUrl generated');
        return;
      }
      const blob = await fetch(finalUrl).then(r => r.blob());
      const file = new File([blob], `edited-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPreviewUrl(finalUrl);
      setPreviewFile(file);
      setShowPreview(true);
    } catch (e) {
      console.error('handlePreview error:', e);
    }
  };

  const handleConfirmSave = async () => {
    if (!previewFile) return;
    const finalCaption = caption.trim() || initialCaption || 'Featured image';
    setIsSaving(true);
    try {
      const result = await apiFetch(`${env.backendApi}/api/uploadAsset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.token && { Authorization: `Bearer ${user.token}` }) },
        body: JSON.stringify({ fileName: previewFile.name, fileType: previewFile.type }),
      });
      if (!result.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, fileUrl } = await result.json();
      const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': previewFile.type }, body: previewFile });
      if (!uploadResponse.ok) throw new Error('S3 upload failed');
      onSave?.(fileUrl, focalPoint, finalCaption, isFeaturedImage);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsSaving(false);
      setShowPreview(false);
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden"
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onMouseMove={handleMouseMove}>
      <div className="md:px-4 lg:px-10 py-3 h-full flex flex-col overflow-y-auto">
          <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center mb-4">
            <div className="flex gap-6">
              {['Frame', 'Filters'].map((tab) => (
                <button key={tab} className={`text-sm pb-1 ${activeTab === tab ? 'font-medium border-b-2 border-black' : 'text-gray-600'}`}
                  onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>
            <div className="flex gap-4">
              <CustomButton onClick={handlePreview} disabled={!caption.trim()}>Preview & Save</CustomButton>
              <CustomButton onClick={onClose}>Back To Media</CustomButton>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">
              {activeTab === 'Frame' ? 'Drag to frame, use slider to zoom' : 'Fine-tune your image'}
            </p>
            <CustomButton onClick={handleReset} className="px-4 py-1 text-xs">Reset</CustomButton>
          </div>

          <div className="relative flex flex-col lg:flex-row gap-8 overflow-y-auto pb-8 h-full">
            <div className="relative w-full md:max-w-lg flex-shrink-0">
              {activeTab === 'Frame' && (
                <div className="flex flex-col gap-4">
                  {!isFeaturedImage && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400">
                        Framing <strong className="text-gray-700 normal-case">{effectiveRatioKey === 'original' ? 'Original' : effectiveRatioKey}</strong>
                      </span>
                    </div>
                  )}

                  {isFeaturedImage ? (
                    <div ref={imageContainerRef} className="border border-black bg-slate-50 flex items-center justify-center relative h-40 sm:h-52 md:h-[295px] overflow-hidden group"
                      style={{ aspectRatio: '16/9', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                      onMouseDown={handleMouseDown}>
                      <img ref={setImageRef} src={croppedImageUrl || urlWithCorsKey} alt="preview" crossOrigin="anonymous"
                        className="w-full h-full object-cover select-none transition-transform duration-200 ease-out"
                        style={{
                          objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                          transform: `scale(${zoom})`,
                          transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
                          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${Math.max(0, (100 - sharpness) / 50)}px)`,
                          pointerEvents: 'none'
                        }} />
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {[...Array(9)].map((_, i) => <div key={i} className="border-[0.5px] border-white/20"></div>)}
                      </div>
                    </div>
                  ) : (
                    <div ref={imageContainerRef} className="border border-black bg-slate-50 flex items-center justify-center relative mx-auto overflow-hidden group"
                      style={{
                        aspectRatio: String(
                          effectiveRatioKey === 'original' && imageRef?.naturalWidth && imageRef?.naturalHeight
                            ? imageRef.naturalWidth / imageRef.naturalHeight
                            : (RATIO_ASPECTS[effectiveRatioKey] || 16 / 9)
                        ),
                        width: `min(100%, calc(60vh * ${
                          effectiveRatioKey === 'original' && imageRef?.naturalWidth && imageRef?.naturalHeight
                            ? imageRef.naturalWidth / imageRef.naturalHeight
                            : (RATIO_ASPECTS[effectiveRatioKey] || 16 / 9)
                        }))`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                      }}
                      onMouseDown={handleMouseDown}>
                      <img ref={setImageRef} src={croppedImageUrl || urlWithCorsKey} alt="preview" crossOrigin="anonymous"
                        className="w-full h-full object-cover select-none transition-transform duration-200 ease-out"
                        style={{
                          objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                          transform: `scale(${zoom})`,
                          transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
                          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${Math.max(0, (100 - sharpness) / 50)}px)`,
                          pointerEvents: 'none'
                        }} />
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {[...Array(9)].map((_, i) => <div key={i} className="border-[0.5px] border-white/20"></div>)}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400">
                      <span>Zoom</span>
                      <span>{(zoom * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black" />
                  </div>

                  <div className="flex flex-col gap-2 mb-2 mt-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400">
                      Caption <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Enter caption..."
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'Filters' && (
                <div className="flex flex-col gap-6">
                  <div className="border border-black bg-slate-50 flex items-center justify-center relative h-40 sm:h-52 md:h-[295px] overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <img ref={setImageRef} src={croppedImageUrl || urlWithCorsKey} alt="edit" crossOrigin="anonymous" className="w-full h-full object-cover select-none"
                      style={{
                        objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                        transform: `scale(${zoom})`,
                        transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${Math.max(0, (100 - sharpness) / 50)}px)`
                      }} />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {[{ label: 'Brightness', v: brightness, s: setBrightness }, { label: 'Contrast', v: contrast, s: setContrast }, { label: 'Saturation', v: saturation, s: setSaturation }, { label: 'Sharpness', v: sharpness, s: setSharpness }].map(ctrl => (
                      <div key={ctrl.label} className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] text-gray-500 uppercase"><span>{ctrl.label}</span></div>
                        <input type="range" min="0" max={ctrl.label === 'Sharpness' ? 100 : 200} value={ctrl.v} onChange={e => ctrl.s(Number(e.target.value))} className="w-full accent-black h-1 bg-gray-100" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden lg:flex flex-col gap-4">
              {ratios.map(r => {
                if (isFeaturedImage) {
                  // Featured Image: static previews only, all driven off the single 16:9 focal point/zoom.
                  return (
                    <div key={r.ratio} className="relative bg-black overflow-hidden group shadow-lg" style={{ width: r.width, height: r.height }}>
                      <img src={croppedImageUrl || urlWithCorsKey} alt={r.ratio} crossOrigin="anonymous" className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                          transform: `scale(${zoom})`,
                          transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
                          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${Math.max(0, (100 - sharpness) / 50)}px)`
                        }} />
                      <div className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1">{r.ratio}</div>
                    </div>
                  );
                }

                // Canvas image tool: selectable, each ratio keeps its own focal point/zoom.
                const isActive = selectedRatioKey === r.ratio;
                const rSettings = ratioSettings[r.ratio];
                return (
                  <button
                    key={r.ratio}
                    type="button"
                    title={`Click to compose the ${r.ratio} frame`}
                    onClick={() => {
                      setActiveTab('Frame');
                      setSelectedRatioKey(r.ratio);
                    }}
                    className={`relative bg-black overflow-hidden shadow-lg text-left transition-all focus:outline-none ${
                      isActive ? 'ring-2 ring-offset-2 ring-black' : 'hover:ring-1 hover:ring-black/50'
                    }`}
                    style={{ width: r.width, height: r.height }}
                  >
                    <img src={croppedImageUrl || urlWithCorsKey} alt={r.ratio} crossOrigin="anonymous" className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${rSettings.focalPoint.x}% ${rSettings.focalPoint.y}%`,
                        transform: `scale(${rSettings.zoom})`,
                        transformOrigin: `${rSettings.focalPoint.x}% ${rSettings.focalPoint.y}%`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${Math.max(0, (100 - sharpness) / 50)}px)`
                      }} />
                    <div className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1">{r.ratio}</div>
                    {isActive && (
                      <div className="absolute top-1 left-1 bg-white text-black text-[9px] px-1 font-medium">Editing</div>
                    )}
                  </button>
                );
              })}

              {!isFeaturedImage && (() => {
                const isActive = selectedRatioKey === 'original';
                return (
                  <button
                    type="button"
                    title="View the original, uncropped image"
                    onClick={() => {
                      setActiveTab('Frame');
                      setSelectedRatioKey('original');
                    }}
                    className={`relative bg-black overflow-hidden shadow-lg text-left transition-all focus:outline-none flex items-center justify-center ${
                      isActive ? 'ring-2 ring-offset-2 ring-black' : 'hover:ring-1 hover:ring-black/50'
                    }`}
                    style={{ width: 133, height: 100 }}
                  >
                    <img
                      src={urlWithCorsKey}
                      alt="Original"
                      crossOrigin="anonymous"
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1">Original</div>
                    {isActive && (
                      <div className="absolute top-1 left-1 bg-white text-black text-[9px] px-1 font-medium">Editing</div>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 max-w-2xl w-full shadow-2xl my-auto max-h-[95vh] flex flex-col">
            <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Confirm Edit</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Does this look right?</p>
            <div
              className="bg-gray-100 rounded-lg overflow-hidden mb-4 sm:mb-6 border flex-shrink-0 mx-auto w-full"
              style={{
                aspectRatio: isFeaturedImage
                  ? '16 / 9'
                  : (effectiveRatioKey === 'original' && imageRef?.naturalWidth && imageRef?.naturalHeight
                    ? String(imageRef.naturalWidth / imageRef.naturalHeight)
                    : String(RATIO_ASPECTS[effectiveRatioKey] || 16 / 9)),
                maxHeight: 'calc(95vh - 180px)'
              }}
            >
              <img src={previewUrl} alt="preview" className={`w-full h-full ${isFeaturedImage ? 'object-cover' : 'object-contain'}`} />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
              <CustomButton onClick={() => setShowPreview(false)} className="bg-gray-100 text-gray-600 hover:bg-gray-200 w-full sm:w-auto">Cancel</CustomButton>
              <CustomButton onClick={handleConfirmSave} className="w-full sm:w-auto">{isSaving ? 'Saving...' : 'Confirm & Save'}</CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageFocalEditor;