import "cropperjs/dist/cropper.css";
import { Popup } from "@/components/ui/kit/popup";
import { useEffect, useRef, useState } from "react";
import apiFetch from '../../utils/api';
import CustomButton from "./CustomButton";

const aspectRatios = [
  { text: "1:1", value: 1 },
  { text: "3:2", value: 3 / 2 },
  { text: "4:3", value: 4 / 3 },
  { text: "16:9", value: 16 / 9 },
];

const ratios = [
  { label: "1:1", height: 80, width: 80, aspectRatio: 1 },
  { label: "3:2", height: 80, width: 120, aspectRatio: 3 / 2 },
  { label: "4:3", height: 100, width: 133, aspectRatio: 4 / 3 },
];

const FeaturedImageCropper = ({ storyId, onCropped, AssetSelectorComponent, imageUrl, focalPoint = { x: 50, y: 50 }, onFocalPointChange, caption }) => {
  const cropperRef = useRef(null);
  const [image, setImage] = useState(null);
  const [croppedImages, setCroppedImages] = useState({});


  const [ratio, setRatio] = useState(16 / 9);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupDimensions, setPopupDimensions] = useState({
    width: typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerWidth * 0.95 : 1200,
    height: typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerHeight * 0.90 : 800,
  });


  const [mobileIndex, setMobileIndex] = useState(0);

  const nextThumbnail = () => {
    setMobileIndex((prev) => (prev + 1) % ratios.length);
  };

  const prevThumbnail = () => {
    setMobileIndex((prev) => (prev - 1 + ratios.length) % ratios.length);
  };



  const cropImage = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const croppedDataUrl = cropper.getCroppedCanvas().toDataURL("image/jpeg");
      setCroppedImages((prev) => ({ ...prev, [ratio]: croppedDataUrl }));
      onCropped?.(croppedDataUrl);
    }
    setPopupVisible(false);
  };

  useEffect(() => {
    if (imageUrl) {
      const initialImages = {
        [16 / 9]: imageUrl,  // main featured
      };

      // Add all thumbnail ratios
      ratios.forEach((r) => {
        initialImages[r.aspectRatio] = imageUrl;
      });

      setCroppedImages(initialImages);
    }
  }, [imageUrl]);

  return (
    <>
      <div className="featured-cropper-layout">
        {/* Main Featured Image */}
        <div
          className="featured-cropper-main relative border border-black bg-white flex items-center justify-center"
          style={{ width: "100%", aspectRatio: "16/9", height: "auto" }}
        >
          {croppedImages[16 / 9] && (
            <img
              src={croppedImages[16 / 9]}
              alt="Featured"
              className="object-cover h-full w-full"
              style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }}
            />
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <CustomButton onClick={() => setPopupVisible(true)}>
              {croppedImages[16 / 9] ? "Change Image" : "Set Featured Image"}
            </CustomButton>
          </div>
        </div>


        {/* Thumbnail Previews */}
        {/* -------- DESKTOP THUMBNAILS -------- */}
        <div className="hidden lg:flex featured-cropper-thumbnail-stack">
          {ratios.map((r) => (
            <div
              key={r.label}
              className="relative border border-black bg-white cursor-pointer overflow-hidden"
              style={{ height: r.height, width: r.width }}
              onClick={() => {
                setRatio(r.aspectRatio);
                setPopupVisible(true);
              }}
            >
              <img
                src={croppedImages[r.aspectRatio]}
                className="object-cover w-full h-full"
                style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }}
              />
              <span className="absolute bottom-0 -right-7 text-xs bg-white/80 px-1">
                {r.label}
              </span>
            </div>
          ))}
        </div>


        {/* -------- MOBILE CAROUSEL -------- */}
        <div className="lg:hidden w-full flex flex-col items-center mt-3 relative">

          {/* Thumbnail wrapper keeps arrows centered */}
          <div className="relative flex items-center justify-center w-full">

            {/* LEFT ARROW */}
            <button
              onClick={prevThumbnail}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-700 z-10"
            >
              ‹
            </button>

            {/* Thumbnail Box */}
            <div
              className="relative border border-black bg-white overflow-hidden mx-auto"
              style={{
                height: ratios[mobileIndex].height,
                width: ratios[mobileIndex].width,
              }}
              onClick={() => {
                setRatio(ratios[mobileIndex].aspectRatio);
                setPopupVisible(true);
              }}
            >
              <img
                src={croppedImages[ratios[mobileIndex].aspectRatio]}
                className="w-full h-full object-cover"
                style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }}
              />
              <span className="absolute bottom-0 -right-7 text-xs bg-white/80 px-1">
                {ratios[mobileIndex].label}
              </span>
            </div>

            {/* RIGHT ARROW */}
            <button
              onClick={nextThumbnail}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-700 z-10"
            >
              ›
            </button>

          </div>
        </div>



        {/* Popup (Empty Modal for your Asset Picker or Cropper) */}
        <Popup
          visible={popupVisible}
          onHiding={() => setPopupVisible(false)}
          showTitle
          title="Select featured image"
          width={popupDimensions.width}
          height={popupDimensions.height}
          dragEnabled={false}
          wrapperAttr={{ class: "custom-flat-popup" }}
          shadingColor="rgba(12, 12, 12, 0.77)"
        >
          <AssetSelectorComponent
            visible={popupVisible}
            isOpen={popupVisible}
            onClose={() => setPopupVisible(false)}
            isFeaturedImage={true}
            onImageSelect={(imageUrl, asset) => {
              const updatedImages = {};
              ratios.forEach((r) => {
                updatedImages[r.aspectRatio] = imageUrl;
              });
              updatedImages[16 / 9] = imageUrl; // main featured
              setCroppedImages(updatedImages);
              onCropped?.(imageUrl, asset);
              setPopupVisible(false);
            }}

            onImageEditSave={(editedUrl, asset, newFocalPoint, caption) => {
              const updatedImages = {};
              ratios.forEach((r) => {
                updatedImages[r.aspectRatio] = editedUrl;
              });
              updatedImages[16 / 9] = editedUrl;
              setCroppedImages(updatedImages);
              // Propagate focal point change to parent
              if (newFocalPoint) {
                onFocalPointChange?.(newFocalPoint);
              }
              onCropped?.(editedUrl, asset, newFocalPoint, caption);
              setPopupVisible(false);
            }}
            storyId={storyId}
            initialFocalPoint={focalPoint}
            currentFeaturedImageUrl={imageUrl || ''}
            currentStoryCaption={caption || ''}

            NoDataTemplate={() => <div>No assets found</div>}
            LoadingTemplate={() => <div>Loading...</div>}
            ErrorTemplate={() => <div>Error loading assets</div>}
          />

        </Popup>


      </div>

      {/* Featured Image Caption - Outside the layout div to avoid affecting Side-by-Side UI */}
      {caption && (
        <div className="w-full pl-3 lg:pl-[205px] lg:pr-[220px] mb-4">
          <h2 className="text-[16px] leading-snug font-lato font-medium outline-none" style={{ color: "#716d6d", textAlign: "left", marginTop: "2px" }}>
            {caption}
          </h2>
        </div>
      )}
      <style>{`
        .featured-cropper-layout {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          padding: 0 1rem 4px; /* Reduced bottom padding to stick caption */
        }

        .featured-cropper-main {
          flex: 1 1 auto;
        }

        .featured-cropper-thumbnail-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .featured-cropper-layout {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
        }

        @media (min-width: 1024px) {
          .featured-cropper-layout {
            flex-direction: row;
            align-items: flex-start;
            padding-left: 205px;
            padding-right: 230px;
          }

          .featured-cropper-main {
            display: flex;
          }

          .featured-cropper-thumbnail-stack {
            flex-direction: column;
            flex-wrap: nowrap;
            justify-content: space-between;
            align-self: stretch;
          }
        }

        @media (max-width: 1023px) {
  .featured-cropper-thumbnail-stack {
    display: none !important; /* hide desktop thumbnails on mobile */
  }
}
        /* Popup title color */

        /* Mobile responsive styles */

      `}</style>


    </>
  );
};

export default FeaturedImageCropper;
