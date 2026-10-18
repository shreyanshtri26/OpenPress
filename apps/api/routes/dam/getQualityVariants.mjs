// routes/dam/getQualityVariants.mjs - Complete Video Quality Variants API with Real-Time Status
import { ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { GetCommand, UpdateCommand } from "../../db/commands.mjs";
import { MediaConvertClient, GetJobCommand } from "@aws-sdk/client-mediaconvert";
import dynamoClient from "../../dynamoClient.mjs";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.AWS_OpenPress_REGION });
const mediaConvertClient = new MediaConvertClient({
  region: process.env.AWS_OpenPress_REGION,
  endpoint: process.env.MEDIACONVERT_ENDPOINT
});

const TABLE_NAME = process.env.DYNAMO_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.S3_DAM_BUCKET_NAME;

// Check real-time MediaConvert job status
async function checkMediaConvertJobStatus(jobId) {
  if (!jobId) {
    console.log("⚠️ No MediaConvert job ID provided");
    return null;
  }
  
  try {
    console.log(`📊 Checking MediaConvert job status: ${jobId}`);
    const command = new GetJobCommand({ Id: jobId });
    const result = await mediaConvertClient.send(command);
    
    const jobStatus = {
      status: result.Job.Status,
      progress: result.Job.JobPercentComplete || 0,
      createdAt: result.Job.CreatedAt,
      completedAt: result.Job.CompletedAt,
      errorMessage: result.Job.ErrorMessage,
      outputGroupDetails: result.Job.OutputGroupDetails
    };
    
    console.log(`✅ MediaConvert job ${jobId} status: ${jobStatus.status} (${jobStatus.progress}%)`);
    return jobStatus;
    
  } catch (error) {
    console.error(`❌ Failed to check MediaConvert job ${jobId}:`, error.message);
    return null;
  }
}

// Update asset transcoding status in database
async function updateAssetTranscodingStatus(assetId, status, additionalFields = {}) {
  try {
    const updateExpression = `SET transcodingStatus = :status, updatedAt = :updatedAt${
      Object.keys(additionalFields).length > 0 
        ? ', ' + Object.keys(additionalFields).map(key => `${key} = :${key}`).join(', ')
        : ''
    }`;
    
    const expressionAttributeValues = {
      ":status": status,
      ":updatedAt": new Date().toISOString(),
      ...Object.fromEntries(Object.entries(additionalFields).map(([k, v]) => [`:${k}`, v]))
    };

    await dynamoClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues
    }));
    
    console.log(`✅ Updated asset ${assetId} transcoding status to: ${status}`);
  } catch (error) {
    console.error(`❌ Failed to update asset status:`, error);
  }
}

// List S3 objects with error handling
async function listS3Objects(prefix) {
  try {
    console.log(`📁 Listing S3 objects with prefix: ${prefix}`);
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix
    });
    
    const result = await s3Client.send(command);
    const objects = result.Contents || [];
    console.log(`📋 Found ${objects.length} objects in ${prefix}`);
    return objects;
  } catch (error) {
    console.error(`❌ Failed to list S3 objects for prefix ${prefix}:`, error);
    return [];
  }
}

// Get additional file information
async function getFileInfo(key) {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const result = await s3Client.send(command);
    return {
      contentType: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag
    };
  } catch (error) {
    console.warn(`Could not get file info for ${key}:`, error.message);
    return {};
  }
}

// Extract quality from filename
function extractQualityFromFilename(filename) {
  const match = filename.match(/_(\d+p)\.mp4$/);
  return match ? match[1] : null;
}

// Extract thumbnail type from filename
function extractThumbnailType(filename) {
  if (filename.includes('thumbnail_large')) return 'large';
  if (filename.includes('thumbnail_small')) return 'small';  
  if (filename.includes('thumbnail')) return 'standard';
  return null;
}

// Get expected dimensions for quality
function getExpectedDimensions(quality, originalVideo) {
  const isVertical = originalVideo && originalVideo.height > originalVideo.width;
  
  const dimensions = {
    "2160p": isVertical ? "2160x3840" : "3840x2160",
    "1080p": isVertical ? "1080x1920" : "1920x1080", 
    "720p": isVertical ? "720x1280" : "1280x720",
    "480p": isVertical ? "480x854" : "854x480",
    "360p": isVertical ? "360x640" : "640x360"
  };
  
  return dimensions[quality] || "Unknown";
}

// Format file size for display
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main handler
export const handler = async (event) => {
  const startTime = Date.now();
  
  try {
    console.log("🎬 GetQualityVariants API called");
    console.log("📋 Event:", JSON.stringify(event, null, 2));
    
    // Extract assetId from multiple possible sources
    let assetId = null;
    
    // Method 1: Query parameter
    if (event.queryStringParameters && event.queryStringParameters.assetId) {
      assetId = event.queryStringParameters.assetId;
      console.log("✅ AssetId from queryStringParameters:", assetId);
    }
    // Method 2: Path parameter
    else if (event.pathParameters && event.pathParameters.assetId) {
      assetId = event.pathParameters.assetId;
      console.log("✅ AssetId from pathParameters:", assetId);
    }
    // Method 3: Extract from rawPath
    else if (event.rawPath && event.rawPath.includes('/api/getQualityVariants/')) {
      assetId = event.rawPath.split('/api/getQualityVariants/')[1];
      console.log("✅ AssetId from rawPath:", assetId);
    }
    
    if (!assetId) {
      console.log("❌ No assetId found in request");
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json",
          // "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: "assetId is required",
          debug: {
            queryStringParameters: event.queryStringParameters,
            pathParameters: event.pathParameters,
            rawPath: event.rawPath,
            availableSources: "Use ?assetId=xxx or /api/getQualityVariants/xxx"
          }
        })
      };
    }

    console.log(`🎯 Processing quality variants for asset: ${assetId}`);

    // Get asset from database
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });

    const result = await dynamoClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      console.log(`❌ Asset not found: ${assetId}`);
      return {
        statusCode: 404,
        headers: { 
          "Content-Type": "application/json",
          // "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ 
          message: "Asset not found",
          assetId 
        })
      };
    }

    // Verify this is a video asset
    const isVideo = asset.isVideo || asset.type?.startsWith('video/');
    if (!isVideo) {
      console.log(`❌ Asset is not a video: ${assetId}`);
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json",
          // "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: "Asset is not a video file",
          assetId,
          assetType: asset.type
        })
      };
    }

    console.log(`✅ Video asset found: ${assetId}`);

    // Check real-time MediaConvert job status if job exists
    let realTimeJobStatus = null;
    if (asset.mediaConvertJobId) {
      console.log(`📊 Checking MediaConvert job: ${asset.mediaConvertJobId}`);
      realTimeJobStatus = await checkMediaConvertJobStatus(asset.mediaConvertJobId);
      
      // Update database if status changed
      if (realTimeJobStatus && realTimeJobStatus.status !== asset.transcodingStatus) {
        console.log(`🔄 Updating transcoding status: ${asset.transcodingStatus} -> ${realTimeJobStatus.status}`);
        const updateFields = {
          jobProgress: realTimeJobStatus.progress
        };
        
        if (realTimeJobStatus.status === 'COMPLETE') {
          updateFields.transcodingCompletedAt = realTimeJobStatus.completedAt;
        }
        
        await updateAssetTranscodingStatus(assetId, realTimeJobStatus.status, updateFields);
      }
    }

    // Build base response
    const response = {
      assetId,
      assetType: "video",
      originalVideo: {
        // Fix URL building - handle both relative and absolute URLs
        url: asset.url.startsWith('http') 
          ? asset.url 
          : `${publicObjectUrl(BUCKET_NAME, asset.url)}`,
        quality: "original",
        dimensions: asset.metadata?.dimensions || "Unknown",
        fileSize: asset.fileSize || asset.metadata?.fileSize || 0,
        duration: asset.metadata?.duration || 0,
        format: asset.metadata?.format || "Unknown"
      },
      processedVariants: [],
      thumbnails: [],
      transcodingStatus: realTimeJobStatus?.status || asset.transcodingStatus || "NOT_STARTED",
      mediaConvertJobId: asset.mediaConvertJobId || null,
      lastChecked: new Date().toISOString()
    };

    // Add job progress and timing info
    if (realTimeJobStatus) {
      response.jobProgress = realTimeJobStatus.progress;
      response.jobTiming = {
        createdAt: realTimeJobStatus.createdAt,
        completedAt: realTimeJobStatus.completedAt,
        duration: realTimeJobStatus.completedAt 
          ? Math.round((new Date(realTimeJobStatus.completedAt) - new Date(realTimeJobStatus.createdAt)) / 1000)
          : null
      };
      
      if (realTimeJobStatus.errorMessage) {
        response.errorMessage = realTimeJobStatus.errorMessage;
      }
    }

    // Check for processed files if transcoding exists
    if (asset.mediaConvertJobId) {
      try {
        console.log(`📁 Checking for processed files...`);
        
        // List processed video files and thumbnails
        const [videoFiles, thumbnailFiles] = await Promise.all([
          listS3Objects(`processed/${assetId}/videos/`),
          listS3Objects(`processed/${assetId}/thumbnails/`)
        ]);

        console.log(`📊 Found ${videoFiles.length} video files, ${thumbnailFiles.length} thumbnail files`);

        // Process video variants
        for (const file of videoFiles) {
          const quality = extractQualityFromFilename(file.Key);
          if (quality) {
            console.log(`🎬 Processing video variant: ${quality}`);
            const fileInfo = await getFileInfo(file.Key);
            
            response.processedVariants.push({
              quality,
              url: `${publicObjectUrl(BUCKET_NAME, file.Key)}`,
              fileSize: file.Size,
              fileSizeFormatted: formatFileSize(file.Size),
              lastModified: file.LastModified,
              dimensions: getExpectedDimensions(quality, asset.metadata?.video),
              ...fileInfo
            });
          }
        }

        // Process thumbnails
        for (const file of thumbnailFiles) {
          const thumbnailType = extractThumbnailType(file.Key);
          if (thumbnailType) {
            console.log(`🖼️ Processing thumbnail: ${thumbnailType}`);
            const fileInfo = await getFileInfo(file.Key);
            
            response.thumbnails.push({
              type: thumbnailType,
              url: `${publicObjectUrl(BUCKET_NAME, file.Key)}`,
              fileSize: file.Size,
              fileSizeFormatted: formatFileSize(file.Size),
              lastModified: file.LastModified,
              ...fileInfo
            });
          }
        }

        // Sort variants by quality (highest first)
        response.processedVariants.sort((a, b) => {
          const qualityOrder = { "2160p": 5, "1080p": 4, "720p": 3, "480p": 2, "360p": 1 };
          return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
        });

        console.log(`✅ Processed ${response.processedVariants.length} video variants, ${response.thumbnails.length} thumbnails`);

      } catch (s3Error) {
        console.error(`❌ Error checking processed files:`, s3Error);
        // Continue with response even if S3 listing fails
      }
    }

    // Add summary statistics
    response.summary = {
      totalVariants: response.processedVariants.length,
      availableQualities: response.processedVariants.map(v => v.quality),
      totalProcessedSize: response.processedVariants.reduce((sum, v) => sum + (v.fileSize || 0), 0),
      thumbnailsAvailable: response.thumbnails.length,
      processingComplete: response.processedVariants.length > 0,
      processingTime: Date.now() - startTime
    };

    console.log(`🎉 API response prepared in ${Date.now() - startTime}ms`);
    console.log(`📈 Summary: ${response.summary.totalVariants} variants, status: ${response.transcodingStatus}`);

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        // "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error("❌ API Error:", error);
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        // "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Failed to get quality variants",
        error: error.message,
        processingTime: Date.now() - startTime
      })
    };
  }
};
