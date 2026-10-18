import React, { useState } from "react";
import TextBox from "@/components/ui/dx/text-box";

export default function CoreTab({
    asset, isVideo, isAudio, isImage, apiMetadata
}) {

    const getAssetType = () => {
        if (isVideo) return "video/mp4";
        if (isAudio) return "audio/mpeg";
        if (isImage) return "image/jpeg";
        return apiMetadata?.assetType || asset?.type || asset?.mimeType || "unknown";
    };

    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    const getFileSize = () => apiMetadata?.extractedMetadata?.fileSize || asset?.fileSize || 45000;

    const getDimensions = () => {
        if (apiMetadata?.extractedMetadata?.dimensions) return apiMetadata.extractedMetadata.dimensions;
        if (apiMetadata?.extractedMetadata?.image) return `${apiMetadata.extractedMetadata.image.width}x${apiMetadata.extractedMetadata.image.height}`;
        if (apiMetadata?.extractedMetadata?.video) return `${apiMetadata.extractedMetadata.video.width}x${apiMetadata.extractedMetadata.video.height}`;
        return asset?.metadata?.dimensions || "1920×1080";
    };

    const getDuration = () => apiMetadata?.extractedMetadata?.durationFormatted || (isVideo ? "03:15" : isAudio ? "25:30" : "N/A");

    const getCreationDate = () => asset?.createdAt ? new Date(asset.createdAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);

    const getFormat = () => apiMetadata?.extractedMetadata?.format || (isVideo ? "mp4" : isAudio ? "mp3" : "jpg");

    console.log("isVideo>>>", isVideo);
    console.log("isAudio>>>", isAudio);
    console.log("isImage>>>", isImage);


    return (
        <>
            {/* Embedded CSS */}
            <style>
                {`
        /* Make DevExtreme inputs fully square */
        .dx-texteditor.dx-editor-underlined{
            border-bottom: 1px solid black !important;
        }

        .dx-texteditor-input{
            color:#6b7280 !important;
        }

                    
        .dx-texteditor-container{
                    border:none !important;
        }
      `}
            </style>


            <div className=" mt-3">
                {isVideo ? (
                    <div className="px-4 pb-4">
                        <div className="grid grid-cols-1 gap-2">

                            <TextBox
                                value={asset?.name || "video_2025_09_18.mp4"}
                                placeholder="File name"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={getAssetType()}
                                placeholder="File format / type"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={formatFileSize(getFileSize())}
                                placeholder="File size"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={getDimensions()}
                                placeholder="Dimensions"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={getDuration()}
                                placeholder="Duration"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="1080p"
                                placeholder="Resolution"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="6.2 Mbps"
                                placeholder="Bitrate"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="30 fps"
                                placeholder="Frame rate"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="16:9"
                                placeholder="Aspect ratio"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="BT.709 / 8-bit"
                                placeholder="Color profile / depth"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={getCreationDate()}
                                placeholder="Capture / creation date"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="H.264 / AAC"
                                placeholder="Codec / encoding"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="Stereo"
                                placeholder="Channels"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="48000 Hz"
                                placeholder="Sample rate"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                        </div>
                    </div>
                ) : isAudio ? (
                    <div className="px-4 pb-4">
                        <div className="grid grid-cols-1 gap-2">
                            <TextBox
                                value={asset?.name || "audio_2025_09_18.mp3"}
                                placeholder="File name"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={getAssetType()}
                                placeholder="File format / type"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={formatFileSize(getFileSize())}
                                placeholder="File size"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={getDuration()}
                                placeholder="Duration"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="192 kbps"
                                placeholder="Bitrate"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="44100 Hz"
                                placeholder="Sample rate"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="Stereo"
                                placeholder="Channels"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value={getCreationDate()}
                                placeholder="Capture / creation date"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                            <TextBox
                                value="MP3 / AAC"
                                placeholder="Codec / encoding"
                                stylingMode="underlined"
                                readOnly={true}
                            />
                        </div>
                    </div>
                ) : (
                    // IMAGE CORE - with floating labels
                    <div className="space-y-4 px-4 pb-4 pt-2 ">
                        <TextBox
                            value={asset?.name || "image.jpg"}
                            placeholder="Filename"
                            stylingMode="underlined"
                            readOnly={true}
                        />
                        <TextBox
                            value={getAssetType()}
                            placeholder="Image type"
                            stylingMode="underlined"
                            readOnly={true}
                        />
                        <TextBox
                            value={formatFileSize(getFileSize())}
                            placeholder="File size"
                            stylingMode="underlined"
                            readOnly={true}
                        />
                        <TextBox
                            value={getDimensions()}
                            placeholder="Dimensions"
                            stylingMode="underlined"
                            readOnly={true}
                        />
                        <TextBox
                            value={getFormat()}
                            placeholder="Format"
                            stylingMode="underlined"
                            readOnly={true}
                        />
                        <TextBox
                            value={new Date(getCreationDate()).toLocaleDateString()}
                            placeholder="Date"
                            stylingMode="underlined"
                            readOnly={true}
                        />
                    </div>
                )}
            </div>
        </>
    )
}
