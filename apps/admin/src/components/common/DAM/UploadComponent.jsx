import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertTriangle, FileText, Image, Video, Music, RotateCcw, Play, Pause } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomButton from '../CustomButton';

const UploadComponent = ({ onFileUpload }) => {
	const [isDragOver, setIsDragOver] = useState(false);
	const [uploadQueue, setUploadQueue] = useState([]);
	const [rejectedFiles, setRejectedFiles] = useState([]);
	const [showDuplicateModal, setShowDuplicateModal] = useState(false);
	const [inputKey, setInputKey] = useState(Date.now());
	const [dragCounter, setDragCounter] = useState(0);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef(null);
	const isProcessingRef = useRef(false); // To prevent concurrent processing

	const activeUploadsRef = useRef(0);
	const MAX_CONCURRENT_UPLOADS = 3;
	const abortControllersRef = useRef(new Map());
	const uploadingRef = useRef(false); // ✅ Use ref for immediate state

	// Upload statuses
	const UPLOAD_STATUS = {
		PENDING: 'pending',
		UPLOADING: 'uploading',
		COMPLETED: 'completed',
		FAILED: 'failed',
		CANCELLED: 'cancelled'
	};

	// Define accepted file types
	const ACCEPTED_TYPES = {
		'image/jpeg': ['.jpg', '.jpeg'],
		'image/png': ['.png'],
		'image/gif': ['.gif'],
		'image/svg+xml': ['.svg'],
		'image/webp': ['.webp'],
		'image/bmp': ['.bmp'],
		// 'image/tiff': ['.tiff', '.tif'],
		'video/mp4': ['.mp4'],
		'video/quicktime': ['.mov'],
		'video/x-msvideo': ['.avi'],
		'video/x-matroska': ['.mkv'],
		'video/webm': ['.webm'],
		'audio/mpeg': ['.mp3'],
		'audio/wav': ['.wav'],
		'audio/aac': ['.aac'],
		'audio/ogg': ['.ogg'],
		'audio/flac': ['.flac']
	};

	// Validate file types
	const validateFiles = (files) => {
		const validFiles = [];
		const invalidFiles = [];

		Array.from(files).forEach((file, index) => {
			const isValid = Object.keys(ACCEPTED_TYPES).includes(file.type);
			if (isValid) {
				const fileId = Date.now() + Math.random() + index;
				validFiles.push({
					id: fileId,
					file,
					name: file.name,
					type: file.type,
					size: file.size,
					preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
					status: UPLOAD_STATUS.PENDING,
					progress: 0,
					error: null,
					startTime: null,
					endTime: null
				});
			} else {
				invalidFiles.push({
					id: Date.now() + Math.random() + index + 1000,
					name: file.name,
					type: file.type,
					size: file.size,
					reason: 'Unsupported file type'
				});
			}
		});
		return { validFiles, invalidFiles };
	};

	// Convert WebP or AVIF → JPEG before uploading
	const convertToJpeg = async (file) => {
		if (!["image/webp", "image/avif"].includes(file.type)) {
			return file; // no conversion needed
		}

		const bitmap = await createImageBitmap(file);

		const canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;

		const ctx = canvas.getContext("2d");
		ctx.drawImage(bitmap, 0, 0);

		return new Promise((resolve) => {
			canvas.toBlob(
				(blob) => {
					const jpegFile = new File(
						[blob],
						file.name.replace(/\.(webp|avif)$/i, ".jpg"),
						{ type: "image/jpeg" }
					);
					resolve(jpegFile);
				},
				"image/jpeg",
				0.9
			);
		});
	};


	const uploadSingleFile = async (fileItem) => {
		activeUploadsRef.current++;
		const abortController = new AbortController();
		abortControllersRef.current.set(fileItem.id, abortController);
		setUploadQueue(prevQueue =>
			prevQueue.map(item =>
				item.id === fileItem.id
					? { ...item, status: UPLOAD_STATUS.UPLOADING, startTime: Date.now(), progress: 0 } // ✅ Start at 0%
					: item
			)
		);

		try {
			// ✅ ENHANCED: Smooth progress animation from 0% to 100%
			let progress = 0;
			// Simple linear progress 0% → 95% over ~5 seconds
			const progressInterval = setInterval(() => {
				if (abortController.signal.aborted) {
					clearInterval(progressInterval);
					return;
				}

				progress += 4; // 4% every 200ms = 95% in ~5 seconds

				setUploadQueue(prevQueue =>
					prevQueue.map(item =>
						item.id === fileItem.id
							? { ...item, progress: Math.min(progress, 95) }
							: item
					)
				);
			}, 200);


			// Call the actual upload function
			// Convert WEBP / AVIF → JPEG before uploading
			const fileToUpload =
				fileItem.type === "image/webp" || fileItem.type === "image/avif"
					? await convertToJpeg(fileItem.file)
					: fileItem.file;

			const result = await onFileUpload(fileToUpload);
			clearInterval(progressInterval);
			setUploadQueue(prevQueue =>
				prevQueue.map(item =>
					item.id === fileItem.id
						? {
							...item,
							status: UPLOAD_STATUS.COMPLETED,
							progress: 100, // ✅ Final 100%
							endTime: Date.now()
						}
						: item
				)
			);
			toast.success(`File uploaded successfully!`);

		} catch (error) {
			const isAborted = error.message === 'Upload cancelled' || error.name === 'AbortError';
			setUploadQueue(prevQueue =>
				prevQueue.map(item =>
					item.id === fileItem.id
						? {
							...item,
							status: isAborted ? UPLOAD_STATUS.CANCELLED : UPLOAD_STATUS.FAILED,
							error: error.message || 'Upload failed',
							endTime: Date.now()
						}
						: item
				)
			);

			if (!isAborted) {
				toast.error(`Failed to upload ${fileItem.name}`);
			}
		} finally {
			activeUploadsRef.current--;
			abortControllersRef.current.delete(fileItem.id);
		}
	};


	// ✅ FIXED: Process next files using ref for immediate state check
	const processNextFiles = () => {
		console.log('🔍 processNextFiles called - uploadingRef.current:', uploadingRef.current);

		if (!uploadingRef.current || isProcessingRef.current) {
			console.log('⏹️ Upload process stopped');
			return;
		}

		isProcessingRef.current = true;

		const pendingFiles = uploadQueue.filter(f => f.status === UPLOAD_STATUS.PENDING);
		const availableSlots = MAX_CONCURRENT_UPLOADS - activeUploadsRef.current;

		console.log('🔍 Queue analysis:', {
			pending: pendingFiles.length,
			activeSlots: activeUploadsRef.current,
			availableSlots
		});

		if (pendingFiles.length > 0 && availableSlots > 0) {
			const filesToProcess = pendingFiles.slice(0, availableSlots);
			console.log('🎯 Starting uploads for:', filesToProcess.map(f => f.name));

			filesToProcess.forEach(fileItem => {
				uploadSingleFile(fileItem);
			});
		} else if (pendingFiles.length === 0 && activeUploadsRef.current === 0) {
			console.log('🎉 All uploads completed');
			uploadingRef.current = false;
			setIsUploading(false);
		}

		isProcessingRef.current = false;
	};

	// ✅ NEW: useEffect to orchestrate the upload process
	React.useEffect(() => {
		if (isUploading) {
			processNextFiles();
		}
	}, [isUploading, uploadQueue]);

	// ✅ FIXED: Start batch upload with proper state management
	const startBatchUpload = () => {
		const pendingFiles = uploadQueue.filter(file => file.status === UPLOAD_STATUS.PENDING);

		if (pendingFiles.length === 0) {
			toast('No files to upload');
			return;
		}

		if (uploadingRef.current) return; // Prevent multiple starts
		// ✅ Set both state and ref immediately
		uploadingRef.current = true;
		setIsUploading(true);
	};

	// ✅ Stop upload process
	const stopUploading = () => {
		uploadingRef.current = false;
		setIsUploading(false);
	};

	// Cancel individual file upload
	const cancelFileUpload = (fileId) => {
		const abortController = abortControllersRef.current.get(fileId);
		if (abortController) {
			abortController.abort();
		}
		setUploadQueue(prevQueue => prevQueue.filter(item => item.id !== fileId));
	};

	// Retry failed upload
	const retryFileUpload = (fileId) => {
		console.log('🔄 Retrying upload for file:', fileId);

		setUploadQueue(prevQueue =>
			prevQueue.map(item =>
				item.id === fileId
					? {
						...item,
						status: UPLOAD_STATUS.PENDING,
						progress: 0,
						error: null,
						startTime: null,
						endTime: null
					}
					: item
			)
		);

		toast('File queued for retry');

		// If not uploading, start process
		if (!uploadingRef.current) {
			uploadingRef.current = true;
			setIsUploading(true);
			setTimeout(() => {
				processNextFiles();
			}, 100);
		}
	};

	// Remove individual rejected file
	const removeRejectedFile = (fileId) => {
		setRejectedFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
		toast.success('Rejected file removed');
	};

	// Clear all rejected files
	const clearAllRejectedFiles = () => {
		setRejectedFiles([]);
		toast.success('All rejected files cleared');
	};

	// Get file type icon with status color
	const getFileIcon = (fileType, status) => {
		const getColor = () => {
			switch (status) {
				case UPLOAD_STATUS.COMPLETED: return 'text-green-500';
				case UPLOAD_STATUS.UPLOADING: return 'text-blue-500';
				case UPLOAD_STATUS.FAILED: return 'text-red-500';
				case UPLOAD_STATUS.CANCELLED: return 'text-gray-400';
				default: return 'text-yellow-600';
			}
		};

		const colorClass = getColor();
		if (fileType.startsWith('image/')) return <Image className={`w-5 h-5 ${colorClass}`} />;
		if (fileType.startsWith('video/')) return <Video className={`w-5 h-5 ${colorClass}`} />;
		if (fileType.startsWith('audio/')) return <Music className={`w-5 h-5 ${colorClass}`} />;
		return <FileText className={`w-5 h-5 ${colorClass}`} />;
	};

	// Format file size
	const formatFileSize = (bytes) => {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	// Get status color for display
	const getStatusColor = (status) => {
		switch (status) {
			case UPLOAD_STATUS.COMPLETED: return 'text-green-600 bg-green-100';
			case UPLOAD_STATUS.UPLOADING: return 'text-blue-600 bg-blue-100';
			case UPLOAD_STATUS.FAILED: return 'text-red-600 bg-red-100';
			case UPLOAD_STATUS.CANCELLED: return 'text-gray-600 bg-gray-100';
			default: return 'text-yellow-600 bg-yellow-100';
		}
	};

	// Drag event handlers (keeping all existing ones)
	const handleDragEnter = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragCounter(prev => prev + 1);
		setIsDragOver(true);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isDragOver) {
			setIsDragOver(true);
		}
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragCounter(prev => {
			const newCounter = prev - 1;
			if (newCounter <= 0) {
				setIsDragOver(false);
				return 0;
			}
			return newCounter;
		});
	};

	const handleDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();

		setIsDragOver(false);
		setDragCounter(0);

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			handleFileSelection(files);
		}

		try {
			e.dataTransfer.clearData();
			e.dataTransfer.effectAllowed = 'none';
			e.dataTransfer.dropEffect = 'none';
		} catch (error) {
			console.log('DataTransfer cleanup warning:', error);
		}

		setTimeout(() => {
			setIsDragOver(false);
			setDragCounter(0);
		}, 100);
	};

	const handleFileInputChange = (e) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFileSelection(files);
		}
		e.target.value = '';
	};

	// Add files to queue without starting uploads
	// Add files to queue without starting uploads
	const handleFileSelection = (files) => {
		const { validFiles, invalidFiles } = validateFiles(files);

		if (invalidFiles.length > 0) {
			setRejectedFiles(prev => [...prev, ...invalidFiles]);
			toast.error(`Rejected ${invalidFiles.length} unsupported file(s)`);
		}

		if (validFiles.length > 0) {
			// ⛔ Replace old file instead of appending
			setUploadQueue(validFiles);
			toast.success(`File ready to upload`);
		}
	};


	const handleUploadClick = () => {
		setRejectedFiles([]);
		triggerFileInput();
	};

	const handleAddMoreFiles = (e) => {
		e.preventDefault();
		e.stopPropagation();
		triggerFileInput();
	};

	const triggerFileInput = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.svg,image/*,video/*,audio/*';
		input.multiple = false; // ⛔ Changed from true → false (single file only)
		input.style.display = 'none';

		input.addEventListener('change', (e) => {
			if (e.target.files && e.target.files.length > 0) {
				handleFileSelection(e.target.files);
			}
			document.body.removeChild(input);
		});

		document.body.appendChild(input);
		input.click();
	};


	const handleCancelUpload = () => {
		console.log('🛑 Cancelling all uploads');
		uploadingRef.current = false;
		setIsUploading(false);

		abortControllersRef.current.forEach(controller => {
			controller.abort();
		});
		abortControllersRef.current.clear();

		setUploadQueue([]);
		setRejectedFiles([]);
		setShowDuplicateModal(false);
		setInputKey(Date.now());
		setIsDragOver(false);
		setDragCounter(0);
		activeUploadsRef.current = 0;
	};

	const clearCompletedFiles = () => {
		setUploadQueue(prevQueue =>
			prevQueue.filter(item =>
				item.status !== UPLOAD_STATUS.COMPLETED &&
				item.status !== UPLOAD_STATUS.CANCELLED
			)
		);
	};

	// Get upload statistics
	const getUploadStats = () => {
		const pending = uploadQueue.filter(f => f.status === UPLOAD_STATUS.PENDING).length;
		const uploading = uploadQueue.filter(f => f.status === UPLOAD_STATUS.UPLOADING).length;
		const completed = uploadQueue.filter(f => f.status === UPLOAD_STATUS.COMPLETED).length;
		const failed = uploadQueue.filter(f => f.status === UPLOAD_STATUS.FAILED).length;

		return { pending, uploading, completed, failed };
	};

	const stats = getUploadStats();

	return (
		<div className="w-full flex-1 min-h-0 p-8">
			<div className="w-full">
				<div className="card p-6 mb-6 border-none">
					{isUploading ?
						(<div className='flex flex-col p-4 sm:p-6  w-full max-w-md sm:max-w-lg mx-auto h-72 sm:h-96 items-center justify-center'>
							<h2 className="text-lg font-bold text-gray-800 mb-3 text-center">
								Uploading files...
							</h2>
						</div>) :
						(<div>

							<div
								className={`border-2 border-dashed p-6 text-center transition-all duration-200 
							w-full max-w-md sm:max-w-lg mx-auto h-52 sm:h-64 flex flex-col items-center justify-center gap-4
							${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-400 hover:border-black'}`}
								onDragEnter={handleDragEnter}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<div
									className={`flex flex-col items-center gap-4 ${(stats.pending < 0) ? 'opacity-50 cursor-not-allowed' : ''
										}`}
								>
									<Upload className="text-black mx-auto w-8 h-12" />

									<CustomButton
										onClick={handleUploadClick}
										disabled={stats.pending > 0}
									>
										Browse
									</CustomButton>
								</div>

								<input
									key={inputKey}
									ref={fileInputRef}
									type="file"
									accept=".svg,image/*,video/*,audio/*"
									onChange={handleFileInputChange}
									className="hidden"
									multiple={false}
								/>
							</div>
						</div>
						)}
				</div>

				{uploadQueue.length > 0 && (
					<div className="card border-none max-w-md sm:max-w-lg mx-auto flex flex-col h-[32rem]">
						{/* Scrollable file list */}
						<div className="flex-1 overflow-y-auto space-y-1 border-black border-b mb-[7.5rem] pr-2">
							{uploadQueue.map((fileItem) => (
								<div key={fileItem.id} className="relative p-3 sm:p-4 bg-white">
									<div className="absolute top-0 left-0 w-full h-0.5 bg-gray-200">
										<div
											className={`h-[1px] transition-all duration-300 ${fileItem.status === UPLOAD_STATUS.COMPLETED ? 'bg-green-500' :
												fileItem.status === UPLOAD_STATUS.UPLOADING ? 'bg-black' :
													fileItem.status === UPLOAD_STATUS.FAILED ? 'bg-red-500' :
														fileItem.status === UPLOAD_STATUS.CANCELLED ? 'bg-gray-400' :
															'bg-black'
												}`}
											style={{
												width:
													fileItem.status === UPLOAD_STATUS.PENDING
														? '100%'
														: `${fileItem.progress}%`,
											}}
										/>
									</div>

									<div className="flex items-center space-x-2 sm:space-x-4">
										<div className="flex-shrink-0">
											{fileItem.preview ? (
												<img
													src={fileItem.preview}
													alt={fileItem.name}
													className="w-16 h-16 sm:w-12 sm:h-12 object-cover rounded"
												/>
											) : (
												<div className="w-16 h-16 sm:w-12 sm:h-12 bg-gray-100 rounded flex items-center justify-center">
													{getFileIcon(fileItem.type, fileItem.status)}
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p
												className="text-xs sm:text-sm font-medium text-gray-900 truncate"
												title={fileItem.name}
											>
												{fileItem.name}
											</p>
										</div>

										<div className="flex-shrink-0 flex space-x-1">
											{fileItem.status === UPLOAD_STATUS.FAILED && (
												<button
													onClick={() => retryFileUpload(fileItem.id)}
													className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-100 rounded-full"
													title="Retry upload"
												>
													<RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
												</button>
											)}
											{(fileItem.status === UPLOAD_STATUS.PENDING ||
												fileItem.status === UPLOAD_STATUS.UPLOADING) && (
													<button
														onClick={() => cancelFileUpload(fileItem.id)}
														className="text-black hover:bg-red-100 rounded-full p-0.5"
														title="Cancel upload"
													>
														<X className="w-5 h-5 sm:w-6 sm:h-6" />
													</button>
												)}
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Sticky Upload Button */}
						<div className=" bottom-0 bg-white pb-[16rem] flex justify-center">
							{stats.pending > 0 && !isUploading && (
								<CustomButton
									onClick={startBatchUpload}
									variant='white'
								>
									Upload
								</CustomButton>
							)}
						</div>
					</div>
				)}


				{rejectedFiles.length > 0 && (
					<div className="card p-6 mt-4 border-red-200 bg-red-50">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center space-x-2">
								<AlertTriangle className="w-5 h-5 text-red-500" />
								<h3 className="text-lg font-semibold text-red-800">
									Rejected Files ({rejectedFiles.length})
								</h3>
							</div>
							<button
								onClick={clearAllRejectedFiles}
								className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
							>
								Clear All
							</button>
						</div>

						<div className="space-y-2">
							{rejectedFiles.map((file) => (
								<div key={file.id} className="flex items-center justify-between p-3 bg-white rounded border">
									<div className="flex items-center space-x-3">
										<div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
											<FileText className="w-4 h-4 text-red-500" />
										</div>
										<div>
											<span className="font-medium text-gray-900">{file.name}</span>
											<div className="text-sm text-gray-500">
												{file.type} - {formatFileSize(file.size)}
											</div>
										</div>
									</div>

									<div className="flex items-center space-x-2">
										<span className="text-sm text-red-600">{file.reason}</span>
										<button
											onClick={() => removeRejectedFile(file.id)}
											className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
										>
											<X className="w-4 h-4" />
										</button>
									</div>
								</div>
							))}
						</div>

						<div className="mt-4 p-3 bg-red-100 rounded-lg">
							<p className="text-sm text-red-600">
								Only images (JPG, PNG, GIF, SVG), videos (MP4, MOV, AVI), and audio files (MP3, WAV, AAC) are supported.
							</p>
						</div>
					</div>
				)}

				{/* Duplicate Modal */}
				{showDuplicateModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
							<div className="flex items-center space-x-3 mb-4">
								<AlertTriangle className="w-6 h-6 text-amber-500" />
								<h3 className="text-lg font-semibold text-gray-900">Potential Duplicates</h3>
							</div>

							<p className="text-gray-600 mb-6">
								Some files may already exist. Continue with adding to queue?
							</p>

							<div className="flex justify-end space-x-4">
								<button
									onClick={() => {
										setShowDuplicateModal(false);
										setUploadQueue([]);
									}}
									className="btn-secondary"
								>
									Remove Files
								</button>
								<button
									onClick={() => setShowDuplicateModal(false)}
									className="btn-primary"
								>
									Keep in Queue
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default UploadComponent;
