import { Upload } from 'lucide-react';
import { captureVideoFrame } from '../../../utils/videoFrame';
import React, { useState, useEffect, useRef, useContext } from 'react';
import toast from 'react-hot-toast';
import env from '@/utils/env';
import apiFetch from '../../../utils/api';
import { UserContext } from '@/context/UserContext';




// NEW: Settings icon component
const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


// Custom Volume Button Component
const VolumeButton = ({ videoRef }) => {
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

    const toggleMute = () => {
        if (videoRef.current) {
            const newMutedState = !isMuted;
            videoRef.current.muted = newMutedState;
            setIsMuted(newMutedState);
        }
    };

    // const handleVolumeChange = (e) => {
    //     const newVolume = parseFloat(e.target.value);
    //     setVolume(newVolume);
    //     if (videoRef.current) {
    //         videoRef.current.volume = newVolume;
    //         videoRef.current.muted = newVolume === 0;
    //         setIsMuted(newVolume === 0);
    //     }
    // };

    const getVolumeIcon = () => {
        if (isMuted || volume === 0) {
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
            );
        } else if (volume < 0.5) {
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M6.586 17H4a1 1 0 01-1-1v-4a1 1 0 011-1h2.586l4.707-4.707C11.923 5.663 13 6.109 13 7v10c0 .891-1.077 1.337-1.707.707L6.586 17z" />
                </svg>
            );
        } else {
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m1.768-9.192a9 9 0 010 12.728M6.586 17H4a1 1 0 01-1-1v-4a1 1 0 011-1h2.586l4.707-4.707C11.923 5.663 13 6.109 13 7v10c0 .891-1.077 1.337-1.707.707L6.586 17z" />
                </svg>
            );
        }
    };

    return (
        <div
            className="relative flex items-center"
        // onMouseEnter={() => setShowVolumeSlider(true)}
        // onMouseLeave={() => setShowVolumeSlider(false)}
        >
            <button
                onClick={toggleMute}
                className="bg-black/70 text-white p-2 rounded-full hover:bg-black/80 transition-colors flex items-center justify-center"
                title={isMuted ? "Unmute" : "Mute"}
            >
                {getVolumeIcon()}
            </button>
            {/* {showVolumeSlider && (
                <div className="absolute left-full ml-2 bg-black/70 rounded-full px-2 py-1">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-gray-600 appearance-none cursor-pointer slider"
                        style={{
                            background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volume * 100}%, #6b7280 ${volume * 100}%, #6b7280 100%)`
                        }}
                    />
                </div>
            )} */}
        </div>
    );
};

// Custom Video Controls Bar Component with Quality Dropdown
const VideoControlsBar = ({
    videoRef,
    qualityVariants,
    selectedQuality,
    onQualityChange,
    getAvailableQualities,
    isVertical
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showQualityDropdown, setShowQualityDropdown] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => setCurrentTime(video.currentTime);
        const updateDuration = () => setDuration(video.duration);
        const updatePlayState = () => setIsPlaying(!video.paused);

        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('play', updatePlayState);
        video.addEventListener('pause', updatePlayState);

        return () => {
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('play', updatePlayState);
            video.removeEventListener('pause', updatePlayState);
        };
    }, [videoRef]);

    // Close dropdown when clicking outside
    // useEffect(() => {
    //     const handleClickOutside = (event) => {
    //         if (showQualityDropdown) {
    //             setShowQualityDropdown(false);
    //         }
    //     };

    //     document.addEventListener('mousedown', handleClickOutside);
    //     return () => document.removeEventListener('mousedown', handleClickOutside);
    // }, [showQualityDropdown]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    const handleSeek = (e) => {
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            videoRef.current.currentTime = percent * duration;
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleQualitySelect = (quality) => {
        onQualityChange(quality);
        setShowQualityDropdown(false);
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`bg-black/70 px-4 py-2 flex items-center space-x-3 ${isVertical ? 'max-w-[400px] mx-auto' : 'w-[70%] mx-auto'}`}>

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300 transition-colors"
                title={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                )}
            </button>

            {/* Time Display */}
            <span className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Progress Bar */}
            <div
                className="flex-1 bg-gray-600 rounded-full h-1 cursor-pointer"
                onClick={handleSeek}
            >
                <div
                    className="bg-white rounded-full h-1 transition-all duration-100"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                />
            </div>

            {/* Quality Selector */}
            {qualityVariants && qualityVariants.length > 0 && (
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowQualityDropdown(!showQualityDropdown);
                        }}
                        className="text-white hover:text-gray-300 transition-colors px-3 py-1 rounded-md border border-gray-500 hover:border-gray-400"
                        title="Video quality"
                    >
                        <span className="text-sm">
                            {selectedQuality === 'original' ? 'Original' : selectedQuality.toUpperCase()}
                        </span>
                        {/* <SettingsIcon /> */}
                    </button>

                    {showQualityDropdown && (
                        <div
                            className="absolute bottom-full mb-2 right-0 bg-black/95 border border-gray-600 min-w-[120px] z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="py-1">
                                {getAvailableQualities().map((quality) => (
                                    <button
                                        key={quality.quality}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleQualitySelect(quality.quality);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${selectedQuality === quality.quality
                                            ? 'bg-blue-600/20 text-blue-400'
                                            : 'text-gray-200'
                                            }`}
                                    >
                                        {quality.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Fullscreen Button */}
            <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>
        </div>
    );
};



const AssetPreview = ({ asset, metadata, showThumbnail = true }) => {
    // const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Thumbnail states
    const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
    const [generatedThumbnails, setGeneratedThumbnails] = useState([]);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [customThumbnail, setCustomThumbnail] = useState(null);
    const [thumbnailLoading, setThumbnailLoading] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(null);
    const fileInputRef = useRef(null);

    // Transcoding states
    const [qualityVariants, setQualityVariants] = useState([]);
    const [transcodingStatus, setTranscodingStatus] = useState('UNKNOWN');
    const [transcodingProgress, setTranscodingProgress] = useState(0);
    const [isPolling, setIsPolling] = useState(false);
    const [pollingError, setPollingError] = useState(null);


    // NEW: Video quality selection states
    const [selectedQuality, setSelectedQuality] = useState('original');
    const [showQualityDropdown, setShowQualityDropdown] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState('');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const videoRef = useRef(null);

    // Custom thumbnail upload states
    const [customThumbnailUrl, setCustomThumbnailUrl] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const userContext = useContext(UserContext);
    const user = userContext?.user;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showQualityDropdown || showSettingsMenu) {
                setShowQualityDropdown(false);
                setShowSettingsMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showQualityDropdown, showSettingsMenu]);

    // Generate thumbnails once metadata is loaded
    useEffect(() => {
        if (metadata?.assetType === 'video') {
            generateThumbnails(asset.assetId || asset.id);
            fetchQualityVariants(asset.assetId || asset.id);
        }
    }, [metadata, asset]);



    // NEW: Update video URL when quality changes
    useEffect(() => {
        if (qualityVariants.length > 0) {
            const videoUrl = getVideoUrlForQuality(selectedQuality);
            setCurrentVideoUrl(videoUrl);
        }
    }, [selectedQuality, qualityVariants]);

    // Enhanced Fetch Quality Variants with Polling
    const fetchQualityVariants = async (assetId, maxRetries = 30, retryInterval = 5000) => {
        setIsPolling(true);
        setPollingError(null);
        let retryCount = 0;

        const pollForTranscodingComplete = async () => {
            try {
                const res = await apiFetch(
                    `${env.backendApi}/api/getQualityVariants?assetId=${assetId}`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                        },
                    }
                );

                if (!res.ok) throw new Error("Failed to fetch quality variants");

                const data = await res.json();

                // Update transcoding status and progress
                setTranscodingStatus(data.transcodingStatus || 'UNKNOWN');
                setTranscodingProgress(data.jobProgress || 0);

                // Check transcoding status
                if (data.transcodingStatus === 'COMPLETE' && data.processedVariants && data.processedVariants.length > 0) {


                    // Processing is complete - set the variants
                    setQualityVariants(data.processedVariants);
                    // Set initial quality - prefer 1080p if available, otherwise use first available
                    if (data.processedVariants && data.processedVariants.length > 0) {
                        const preferredQuality = data.processedVariants.find(v => v.quality === '1080p') ||
                            data.processedVariants[0];
                        setSelectedQuality(preferredQuality.quality);
                    }


                    setSelectedQuality('original');
                    setIsPolling(false);

                    // toast.success('Video processing complete! All quality options are now available.');

                    return; // Exit polling

                } else if (data.transcodingStatus === 'PROGRESSING' || data.transcodingStatus === 'SUBMITTED') {
                    // Still processing - continue polling

                    if (retryCount < maxRetries) {
                        retryCount++;
                        // Continue polling after delay
                        setTimeout(pollForTranscodingComplete, retryInterval);

                    } else {
                        throw new Error("Transcoding timeout - maximum retry attempts reached");
                    }

                } else if (data.transcodingStatus === 'ERROR' || data.transcodingStatus === 'FAILED') {
                    throw new Error(`Video transcoding failed: ${data.transcodingStatus}`);

                } else {
                    // Unknown or other status - continue polling with caution
                    console.warn("Unknown transcoding status:", data.transcodingStatus);

                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(pollForTranscodingComplete, retryInterval);
                    } else {
                        throw new Error("Unable to determine transcoding status after maximum retries");
                    }
                }

            } catch (err) {
                console.error("Error in transcoding polling:", err);
                setPollingError(err.message);
                setIsPolling(false);
                toast.error("Could not load transcoded qualities: " + err.message);
            }
        };

        // Start polling immediately
        await pollForTranscodingComplete();
    };

    // NEW: Get video URL based on selected quality
    const getVideoUrlForQuality = (quality) => {
        if (quality === 'original') {
            // Check API response structure first
            if (metadata?.originalVideo?.url) {
                return metadata.originalVideo.url;
            }
            // Then fallback to asset properties
            return asset?.originalUrl || asset?.url || asset?.fileUrl || asset?.src;
        }

        const variant = qualityVariants.find(v => v.quality === quality);
        return variant?.url || metadata?.originalVideo?.url || asset?.originalUrl || asset?.url || asset?.fileUrl || asset?.src;
    };


    // NEW: Get available quality options
    const getAvailableQualities = () => {
        const qualities = [{ quality: 'original', label: 'Original' }];

        if (qualityVariants.length > 0) {
            qualityVariants.forEach(variant => {
                qualities.push({
                    quality: variant.quality,
                    label: variant.quality.toUpperCase(),
                    fileSize: variant.fileSizeFormatted,
                    dimensions: variant.dimensions
                });
            });
        }

        return qualities;
    };

    // NEW: Handle quality change
    const handleQualityChange = (quality) => {
        const currentTime = videoRef.current?.currentTime || 0;
        const wasPlaying = videoRef.current && !videoRef.current.paused;

        setSelectedQuality(quality);
        setShowSettingsMenu(false);

        // Restore video position and play state after quality change
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.currentTime = currentTime;
                if (wasPlaying) {
                    videoRef.current.play().catch(console.error);
                }
            }
        }, 100);
    };

    // Generate thumbnails for video
    const generateThumbnails = async (assetId) => {
        setThumbnailLoading(true);
        setThumbnailError(null);

        try {
            const response = await apiFetch(`${env.backendApi}/api/generateThumbnail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                },
                body: JSON.stringify({
                    assetId: assetId,
                    regenerate: true
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to generate thumbnails: ${response.status}`);
            }

            const data = await response.json();

            if (data?.data?.thumbnails && Array.isArray(data?.data?.thumbnails)) {
                setGeneratedThumbnails(data?.data?.thumbnails);
                if (data?.data?.thumbnails.length > 0) {
                    setSelectedThumbnail(data?.data?.thumbnails[0]);
                }
            }
        } catch (err) {
            // No FFmpeg on the server (free hosting): capture a frame in the browser instead.
            try {
                const frame = await captureVideoFrame(getMediaSource());
                await uploadThumbnailFile(frame);
            } catch (fallbackErr) {
                setThumbnailError(fallbackErr.message || err.message);
                if (import.meta.env.DEV) {
                    console.error('Error generating thumbnails:', err, fallbackErr);
                }
            }
        } finally {
            setThumbnailLoading(false);
        }
    };


    const getMediaSource = () => {
        if (metadata?.assetType === 'video' || asset?.assetType === 'video') {
            let videoUrl = currentVideoUrl || getVideoUrlForQuality(selectedQuality);

            if (!videoUrl && metadata?.previewUrl) {
                videoUrl = metadata.previewUrl;
            }

            if (!videoUrl && qualityVariants.length > 0) {
                videoUrl = qualityVariants[0].url;
            }

            // ENHANCED: Use asset direct URLs as immediate fallback
            if (!videoUrl) {
                videoUrl = asset?.url || asset?.previewUrl || asset?.fileUrl || asset?.src || asset?.originalUrl;
            }

            return videoUrl;
        } else {
            // ENHANCED: Use metadata first, then asset direct URLs
            return metadata?.previewUrl || asset?.url || asset?.previewUrl || asset?.fileUrl || asset?.src || asset?.originalUrl;
        }
    }

    const autoSaveThumbnail = async (thumbnail) => {
        if (!asset?.assetId && !asset?.id) return;
        if (!thumbnail || !thumbnail.url) return; // <-- prevent undefined

        try {
            setIsSaving(true);

            const payload = {
                assetId: asset.assetId || asset.id,
                selectedThumbnail: {
                    url: thumbnail.url,
                    fileName: thumbnail.fileName || thumbnail.url.split('/').pop() || 'unknown.jpg',
                    timepoint: thumbnail.timepoint || 0,
                },
            };

            const response = await apiFetch(
                `${env.backendApi}/api/selectThumbnail`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) throw new Error(`Failed to save thumbnail: ${response.status}`);

        } catch (err) {
            console.error('❌ Error auto-saving thumbnail:', err);
        } finally {
            setIsSaving(false);
        }
    };




    // Auto-select & save first visible thumbnail + save on every navigation
    useEffect(() => {
        if (!generatedThumbnails?.length) return;

        // When thumbnails first load, select first automatically
        if (!selectedThumbnail) {
            const firstThumb = generatedThumbnails[0];
            setSelectedThumbnail(firstThumb);
            autoSaveThumbnail(firstThumb); // pass object
            return;
        }

        // Whenever user changes selected thumbnail, auto-save it
        if (selectedThumbnail) {
            autoSaveThumbnail(selectedThumbnail); // pass object
        }
    }, [generatedThumbnails, selectedThumbnail]);



    // Check if we're still waiting for thumbnail generation
    const isVideoThumbnailPending = () => {

        return metadata?.assetType === 'video' &&
            metadata?.assetInfo?.thumbnailInfo?.thumbnailGenerationStatus === 'pending';
    };

    // Determine if video is vertical (portrait) or horizontal (landscape)
    const isVerticalVideo = () => {
        const width = metadata?.extractedMetadata?.video?.width;
        const height = metadata?.extractedMetadata?.video?.height;
        return height > width;
        // return false;
    };

    // Handle custom thumbnail upload with proper API integration
    const handleCustomThumbnailUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            setUploadError('Please select a valid image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File size must be less than 5MB');
            return;
        }

        await uploadThumbnailFile(file);
    };

    // Uploads an image File as the asset's thumbnail (custom upload or a frame captured in the browser).
    const uploadThumbnailFile = async (file) => {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        try {
            const uploadResponse = await apiFetch(`${env.backendApi}/api/uploadCustomThumbnail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                },
                body: JSON.stringify({
                    assetId: asset.assetId || asset.id,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    userId: asset.userId || 'anonymous'
                }),
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to get upload URL: ${uploadResponse.status}`);
            }

            const uploadData = await uploadResponse.json();
            setUploadProgress(25);

            const s3Response = await apiFetch(uploadData.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!s3Response.ok) {
                throw new Error(`Failed to upload file to S3: ${s3Response.status}`);
            }

            setUploadProgress(75);

            const confirmResponse = await apiFetch(`${env.backendApi}/api/confirmCustomThumbnail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                },
                body: JSON.stringify({
                    assetId: asset.assetId || asset.id,
                    customThumbnailUrl: uploadData.customThumbnailUrl,
                    userId: asset.userId || 'anonymous'
                }),
            });

            if (!confirmResponse.ok) {
                throw new Error(`Failed to confirm custom thumbnail: ${confirmResponse.status}`);
            }

            setUploadProgress(100);
            setCustomThumbnailUrl(uploadData.customThumbnailUrl);
            setCustomThumbnail(uploadData.customThumbnailUrl);
            setSelectedThumbnail({
                url: uploadData.customThumbnailUrl,
                type: 'custom',
                isSelected: true
            });

            const reader = new FileReader();
            reader.onload = (event) => {
                setCustomThumbnail(event.target?.result);
            };
            reader.readAsDataURL(file);

        } catch (err) {
            setUploadError(err.message);
            if (import.meta.env.DEV) {
                console.error('Error uploading custom thumbnail:', err);
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const getAllThumbnails = () => {
        const allThumbnails = [...generatedThumbnails];
        if (customThumbnail) {
            allThumbnails.push({
                url: customThumbnailUrl || customThumbnail,
                type: 'custom',
                isSelected: true
            });
        }
        return allThumbnails;
    };

    const getCurrentThumbnailIndex = (thumbnails) => {
        return thumbnails.findIndex(t => {
            if (selectedThumbnail?.type === 'custom' && t.type === 'custom') {
                return true;
            }
            return t === selectedThumbnail;
        });
    };

    if (import.meta.env.DEV) {
    }




    return (
        <div className="flex justify-center h-full p-0">
            <div className="w-full max-w-4xl">
                {/* Loading State */}
                {/* {loading && (
                    <div className="w-full max-w-full aspect-video bg-gray-100 mx-auto flex items-center justify-center">
                        <div className="text-gray-500">Loading preview...</div>
                    </div>
                )} */}

                {/* Error State */}
                {error && !loading && (
                    <div className="w-full max-w-full aspect-video bg-red-50 border-2 border-red-200  mx-auto flex items-center justify-center">
                        <div className="text-red-600 text-center">
                            <p>Error loading preview</p>
                            <p className="text-sm mt-2">{error}</p>
                        </div>
                    </div>
                )}

                {/* Image Preview */}
                {!loading && !error && metadata?.assetType === "image" && (
                    <>
                        {getMediaSource() ? (
                            <img
                                src={getMediaSource()}
                                alt={asset?.name || 'Asset preview'}
                                className="w-full max-w-lg max-h-[100vh] object-contain mx-auto"
                                onError={(e) => {
                                    if (import.meta.env.DEV) {
                                        console.error('Image failed to load:', getMediaSource());
                                    }
                                    setError('Failed to load image preview');
                                }}
                                onLoad={() => {
                                    if (import.meta.env.DEV) {
                                    }
                                }}
                            />


                        ) : (
                            <div className="w-full max-w-4xl h-[500px] bg-gray-200 mx-auto flex items-center justify-center">
                                <div className="text-gray-500">Image preview not available</div>
                            </div>
                        )}
                    </>
                )}

                {/* Video Preview */}
                {!loading && !error && (metadata?.assetType === "video" || asset?.assetType === "video") && (
                    <div className={`flex ${isVerticalVideo() ? 'flex-row items-start' : 'flex-col'} gap-8 `}>

                        {/* Video Player */}
                        <div className={`${isVerticalVideo() ? 'flex-shrink-0 flex-1' : 'w-full'} relative  `}>

                            {getMediaSource() ? (
                                < div className="relative">
                                    {/* Aspect Ratio Wrapper */}
                                    <div
                                        className={`${isVerticalVideo()
                                            ? 'aspect-[9/16] max-w-[400px] mx-auto'
                                            : 'aspect-video w-[70%] mx-auto'
                                            } bg-black overflow-hidden -mt-10`}
                                    >
                                        <video
                                            ref={videoRef}
                                            src={getMediaSource()}
                                            poster={selectedThumbnail?.url || asset?.thumbnail}
                                            className="w-full h-full object-cover "
                                            controls={false}
                                            preload="metadata"
                                            onError={() => {
                                                if (import.meta.env.DEV) {
                                                    console.error('Video failed to load:', getMediaSource());
                                                }
                                                setError('Failed to load video preview');
                                            }}
                                        />

                                        {/* Custom Controls Overlay */}
                                        <div className="absolute inset-0 ">

                                            {/* Top Controls Bar */}
                                            <div className={`absolute top-4 ${isVerticalVideo() ? 'right-4' : 'right-36'}  flex justify-between items-center pointer-events-auto `}>
                                                {/* Volume Controls (Top Left) */}
                                                <div className="flex items-center space-x-2">
                                                    <VolumeButton videoRef={videoRef} />
                                                </div>
                                            </div>

                                            {/* Bottom Controls Bar */}
                                            <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
                                                <VideoControlsBar
                                                    videoRef={videoRef}
                                                    qualityVariants={qualityVariants}
                                                    selectedQuality={selectedQuality}
                                                    onQualityChange={handleQualityChange}
                                                    getAvailableQualities={getAvailableQualities}
                                                    isVertical={isVerticalVideo()}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Settings Menu (positioned relative to settings button) */}
                                    {showSettingsMenu && (
                                        <div className={`absolute top-16 ${isVerticalVideo() ? 'right-4' : 'right-[15%]'} bg-black/95 border border-gray-600 min-w-[180px] z-50 overflow-hidden`}>
                                            <div className="py-2">
                                                <div className="px-4 py-2 text-gray-400 text-xs uppercase font-semibold border-b border-gray-600">
                                                    Playback Speed
                                                </div>
                                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                                    <button
                                                        key={speed}
                                                        onClick={() => {
                                                            if (videoRef.current) {
                                                                videoRef.current.playbackRate = speed;
                                                            }
                                                            setShowSettingsMenu(false);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors text-gray-200"
                                                    >
                                                        {speed === 1 ? 'Normal' : `${speed}x`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>



                            ) : isVideoThumbnailPending() ? (
                                <div className={`${isVerticalVideo()
                                    ? ' w-[80%] mx-auto h-[568px]'
                                    : 'w-[70%] h-60 mx-auto'
                                    } bg-blue-50 border-2 border-blue-200 flex items-center justify-center`}>
                                    <div className="text-blue-600 text-center">
                                        <div className="animate-pulse mb-2">⏳</div>
                                        <p>Generating video preview...</p>
                                        <p className="text-sm mt-1">This may take a few moments</p>
                                    </div>
                                </div>
                            ) : (
                                <div className={`${isVerticalVideo()
                                    ? ' w-[80%] mx-auto h-[568px]'
                                    : 'w-[70%] h-60 mx-auto'
                                    } bg-gray-200 flex items-center justify-center`}>
                                    <div className="text-gray-500 text-center">
                                        <p>Your video is being processed. Preview will be available soon…</p>
                                        {metadata?.extractedMetadata?.durationFormatted && (
                                            <p className="text-sm mt-1">Duration: {metadata.extractedMetadata.durationFormatted}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {thumbnailLoading && showThumbnail && (
                            <div className="text-center py-8 text-gray-500 mx-auto flex-1">
                                <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
                                <p>Generating thumbnails...</p>
                            </div>
                        )}

                        {}


                        {/* Thumbnail Selector - Only show if thumbnails are available */}
                        {!thumbnailLoading && showThumbnail && generatedThumbnails.length > 0 && (
                            <div className={`${isVerticalVideo() ? 'flex-1 min-w-0 max-w-md' : 'w-full'}`}>

                                <div className={`flex items-center ${isVerticalVideo() ? ' mt-0' : 'mt-0'} relative`}>

                                    <h3 className="text-lg font-bold text-center w-full -mt-10">Choose Thumbnail</h3>

                                    {/* <button
                                        onClick={handleSaveThumbnail}
                                        disabled={!selectedThumbnail || isSaving}
                                        className={`px-6 py-2 rounded font-medium transition-colors ${!selectedThumbnail || isSaving
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                            } absolute right-0`}
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button> */}

                                </div>

                                {/* Upload Progress */}
                                {isUploading && (
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                                            <span>Uploading custom thumbnail...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Upload Error */}
                                {uploadError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200">
                                        <p className="text-red-600 text-sm">{uploadError}</p>
                                    </div>
                                )}

                                {/* Thumbnail Error */}
                                {thumbnailError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200">
                                        <p className="text-red-600 text-sm">{thumbnailError}</p>
                                    </div>
                                )}

                                {isVerticalVideo() ? (
                                    <div className="flex flex-col space-y-4">
                                        <div className="relative">
                                            <img
                                                src={selectedThumbnail?.url || generatedThumbnails[0]?.url}
                                                alt="Selected thumbnail"
                                                className="w-full h-full object-cover max-w-[280px] mx-auto"
                                            />

                                            {generatedThumbnails.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const allThumbnails = getAllThumbnails();
                                                            const currentIndex = getCurrentThumbnailIndex(allThumbnails);
                                                            const prevIndex = (currentIndex - 1 + allThumbnails.length) % allThumbnails.length;
                                                            const prevThumb = allThumbnails[prevIndex];
                                                            setSelectedThumbnail(prevThumb);
                                                            autoSaveThumbnail(prevThumb);

                                                        }}

                                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full transition-all"
                                                    >
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            const allThumbnails = getAllThumbnails();
                                                            const currentIndex = getCurrentThumbnailIndex(allThumbnails);
                                                            const nextIndex = (currentIndex + 1) % allThumbnails.length;
                                                            const nextThumb = allThumbnails[nextIndex];
                                                            setSelectedThumbnail(nextThumb);
                                                            autoSaveThumbnail(nextThumb);

                                                        }}

                                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full transition-all"
                                                    >
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {generatedThumbnails.length > 1 && (
                                            <div className="flex justify-center space-x-2 py-2">
                                                {generatedThumbnails.map((_, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setSelectedThumbnail(generatedThumbnails[index])}
                                                        className={`w-2 h-2 rounded-full transition-all ${selectedThumbnail === generatedThumbnails[index]
                                                            ? 'bg-blue-600'
                                                            : 'bg-gray-300 hover:bg-gray-400'
                                                            }`}
                                                    />
                                                ))}
                                                {customThumbnail && (
                                                    <button
                                                        onClick={() => setSelectedThumbnail({
                                                            url: customThumbnailUrl || customThumbnail,
                                                            type: 'custom',
                                                            isSelected: true
                                                        })}
                                                        className={`w-2 h-2 rounded-full transition-all ${selectedThumbnail?.type === 'custom'
                                                            ? 'bg-blue-600'
                                                            : 'bg-gray-300 hover:bg-gray-400'
                                                            }`}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="w-[200px] mx-auto bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                                        >
                                            {isUploading ? 'Uploading...' : 'Upload'}
                                        </button>

                                    </div>
                                ) : (
                                    <div className='w-full'>
                                        <div className="w-full grid grid-cols-3 gap-4">
                                            {generatedThumbnails.map((thumb, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => setSelectedThumbnail(thumb)}
                                                    className={`cursor-pointer overflow-hidden border-4 transition-all ${selectedThumbnail === thumb
                                                        ? 'border-blue-600'
                                                        : 'border-gray-200 hover:border-gray-400'
                                                        }`}
                                                >
                                                    <img
                                                        src={thumb?.url}
                                                        alt={`Thumbnail ${index + 1}`}
                                                        className="w-full aspect-video object-cover"
                                                    />
                                                </div>
                                            ))}

                                            {customThumbnail && (
                                                <div
                                                    onClick={() => setSelectedThumbnail({
                                                        url: customThumbnailUrl || customThumbnail,
                                                        type: 'custom',
                                                        isSelected: true
                                                    })}
                                                    className={`cursor-pointer overflow-hidden border-4 transition-all relative ${selectedThumbnail?.type === 'custom'
                                                        ? 'border-blue-600'
                                                        : 'border-gray-200 hover:border-gray-400'
                                                        }`}
                                                >
                                                    <img
                                                        src={customThumbnail}
                                                        alt="Custom thumbnail"
                                                        className="w-full aspect-video object-cover"
                                                    />
                                                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                                                        Custom
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className='w-full flex items-center justify-center'>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="mt-6 w-[200px] bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                                            >
                                                {isUploading ? 'Uploading...' : 'Upload'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleCustomThumbnailUpload}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Audio Preview */}
                {!loading && !error && (metadata?.assetType === "audio" || asset?.assetType === "audio") && (
                    <div className="w-full max-w-md mx-auto">
                        {getMediaSource() ? (
                            <audio
                                src={getMediaSource()}
                                controls
                                className="w-full"
                                onError={() => {
                                    setError('Failed to load audio preview');
                                }}
                            />
                        ) : (
                            <div className="text-center text-gray-500">
                                <p>Audio preview not available</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Fallback for unknown asset types */}
                {!loading && !error && metadata &&
                    metadata.assetType !== "image" &&
                    metadata.assetType !== "video" &&
                    metadata.assetType !== "audio" && (
                        <div className="text-center text-gray-500">
                            <p>Preview not available</p>
                            <p className="text-sm mt-2">Asset type: {metadata.assetType || 'Unknown'}</p>
                        </div>
                    )}
            </div>
            {/* UPDATED: Click outside to close settings menu */}
            {
                showSettingsMenu && (
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSettingsMenu(false)}
                    />
                )
            }
        </div >
    );
};

export default AssetPreview;
