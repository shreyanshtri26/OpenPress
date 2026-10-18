// generateThumbnail.mjs - HYBRID APPROACH (MediaConvert + FFmpeg Fallback)
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { MediaConvertClient, CreateJobCommand } from "@aws-sdk/client-mediaconvert";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import dynamoClient from "../../dynamoClient.mjs";
import { spawn } from "child_process";
import { createWriteStream, unlinkSync, existsSync, statSync } from "fs";
import { pipeline } from "stream/promises";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const TABLE_NAME = process.env.DYNAMO_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.S3_DAM_BUCKET_NAME;

const s3 = createS3Client({ region: process.env.AWS_OpenPress_REGION });
const mediaConvertClient = new MediaConvertClient({
  region: process.env.AWS_OpenPress_REGION,
  endpoint: process.env.MEDIACONVERT_ENDPOINT
});

const FFMPEG_PATHS = [
  "/opt/ffmpeg",
  "/opt/bin/ffmpeg",
  "/usr/bin/ffmpeg",
  "/tmp/ffmpeg",
  "ffmpeg"
];

function findFFmpegPath() {
  for (const path of FFMPEG_PATHS) {
    if (existsSync(path)) {
      console.log(`✅ Found FFmpeg at: ${path}`);
      return path;
    }
  }
  console.warn("⚠️ FFmpeg not found");
  return null;
}

function isMediaConvertConfigured() {
  const configured = !!(process.env.MEDIACONVERT_ROLE_ARN && process.env.MEDIACONVERT_ENDPOINT);
  console.log(`📋 MediaConvert configured: ${configured}`);
  return configured;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
export const handler = async (event) => {
  let tempVideoPath = null;

  try {
    console.log(`🎬 Thumbnail Generation Handler Started - ${new Date().toISOString()}`);
    console.log(`Event:`, JSON.stringify(event, null, 2));

    // Parse request body
    let body;
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else if (typeof event.body === 'object') {
      body = event.body;
    } else {
      body = event;
    }

    const { assetId, regenerate = false, method = 'auto' } = body;

    if (!assetId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "assetId is required" })
      };
    }

    console.log(`📋 Processing: assetId=${assetId}, regenerate=${regenerate}, method=${method}`);

    // 1️⃣ Get asset from database
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });

    const result = await dynamoClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Asset not found" })
      };
    }

    console.log(`✅ Asset found: ${asset.url}`);

    if (!asset.isVideo) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Asset is not a video file" })
      };
    }

    // 2️⃣ Check if thumbnails already exist
    if (asset.videoMetadata?.hasAutoThumbnail && !regenerate) {
      console.log(`ℹ️ Thumbnails already exist for ${assetId}`);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Thumbnails already exist",
          data: {
            assetId,
            thumbnails: asset.videoMetadata.autoThumbnails,
            selectedThumbnail: asset.videoMetadata.selectedThumbnail,
            hasAutoThumbnail: true,
            method: asset.videoMetadata.thumbnailMethod || 'unknown'
          }
        })
      };
    }

    // 3️⃣ Determine which method to use
    let useMethod = method;
    
    if (method === 'auto') {
      // Auto-detect: prefer MediaConvert if configured, fallback to FFmpeg
      if (isMediaConvertConfigured()) {
        useMethod = 'mediaconvert';
        console.log(`🎯 Auto-selected: MediaConvert (configured and available)`);
      } else if (findFFmpegPath()) {
        useMethod = 'ffmpeg';
        console.log(`🎯 Auto-selected: FFmpeg (MediaConvert not configured)`);
      } else {
        useMethod = 'placeholder';
        console.log(`🎯 Auto-selected: Placeholder (no processing tools available)`);
      }
    }

    console.log(`🎬 Using method: ${useMethod}`);

    // 4️⃣ Route to appropriate method
    switch (useMethod) {
      case 'mediaconvert':
        return await generateWithMediaConvert(asset, assetId);
      
      case 'ffmpeg':
        return await generateWithFFmpeg(asset, assetId);
      
      case 'placeholder':
        return await generateWithPlaceholder(asset, assetId);
      
      default:
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Invalid method",
            validMethods: ['auto', 'mediaconvert', 'ffmpeg', 'placeholder']
          })
        };
    }

  } catch (error) {
    console.error(`❌ Thumbnail generation error:`, error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Thumbnail generation failed",
        details: error.message
      })
    };
  } finally {
    // Cleanup temp files
    if (tempVideoPath && existsSync(tempVideoPath)) {
      try {
        unlinkSync(tempVideoPath);
        console.log(`🧹 Cleaned up: ${tempVideoPath}`);
      } catch (err) {
        console.warn(`⚠️ Cleanup failed: ${err.message}`);
      }
    }
  }
};

// =============================================================================
// METHOD 1: MEDIACONVERT (High Quality, Async)
// =============================================================================
async function generateWithMediaConvert(asset, assetId) {
  console.log(`📸 Generating thumbnails with MediaConvert`);

  const videoKey = asset.url.split('/').pop();
  const duration = asset.metadata?.duration || 60;
  const inputUri = `s3://${BUCKET_NAME}/${videoKey}`;
  const outputUri = `s3://${BUCKET_NAME}/processed/${assetId}/thumbnails/`;

  // Calculate thumbnail times
  let thumbnailTimes = [];
  if (duration <= 5) {
    thumbnailTimes = [
      Math.max(0.5, duration * 0.2),
      Math.max(1.0, duration * 0.5),
      Math.max(1.5, duration * 0.8)
    ];
  } else if (duration <= 15) {
    thumbnailTimes = [2, Math.max(3, duration * 0.5), Math.max(4, duration - 1)];
  } else if (duration <= 30) {
    thumbnailTimes = [5, Math.max(8, duration * 0.5), Math.max(10, duration - 2)];
  } else {
    thumbnailTimes = [5, 15, 30];
  }

  console.log(`🎯 Thumbnail timepoints: ${thumbnailTimes.map(t => `${t}s`).join(', ')}`);

  // Create thumbnail outputs
  const thumbnailOutputs = thumbnailTimes.map((time) => {
    const timeSeconds = Math.floor(time);
    return {
      NameModifier: `_thumb_${timeSeconds}s`,
      VideoDescription: {
        Width: 1280,
        Height: 720,
        CodecSettings: {
          Codec: "FRAME_CAPTURE",
          FrameCaptureSettings: {
            FramerateNumerator: 1,
            FramerateDenominator: 1,
            MaxCaptures: 1,
            Quality: 95
          }
        }
      },
      ContainerSettings: {
        Container: "RAW"
      }
    };
  });

  const jobSettings = {
    Role: process.env.MEDIACONVERT_ROLE_ARN,
    UserMetadata: {
      "AssetId": assetId,
      "OriginalKey": videoKey,
      "ProcessingType": "Thumbnail-Generation",
      "ThumbnailTimes": JSON.stringify(thumbnailTimes),
      "CreatedAt": new Date().toISOString()
    },
    Settings: {
      Inputs: [{
        FileInput: inputUri,
        VideoSelector: {},
        TimecodeSource: "ZEROBASED"
      }],
      OutputGroups: [{
        Name: "Thumbnail Generation",
        OutputGroupSettings: {
          Type: "FILE_GROUP_SETTINGS",
          FileGroupSettings: {
            Destination: outputUri
          }
        },
        Outputs: thumbnailOutputs
      }]
    }
  };

  try {
    const command = new CreateJobCommand(jobSettings);
    const response = await mediaConvertClient.send(command);

    console.log(`✅ MediaConvert job created: ${response.Job.Id}`);

    // Update database
    await dynamoClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: `
        SET videoMetadata.thumbnailJobId = :jobId,
            videoMetadata.thumbnailJobStatus = :status,
            videoMetadata.thumbnailGenerationStarted = :started,
            videoMetadata.thumbnailTimepoints = :timepoints,
            videoMetadata.thumbnailOutputLocation = :outputLocation,
            videoMetadata.thumbnailMethod = :method,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeValues: {
        ":jobId": response.Job.Id,
        ":status": "SUBMITTED",
        ":started": new Date().toISOString(),
        ":timepoints": thumbnailTimes,
        ":outputLocation": outputUri,
        ":method": "mediaconvert",
        ":updatedAt": new Date().toISOString()
      }
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "High-quality thumbnail generation initiated with MediaConvert",
        data: {
          assetId,
          method: "mediaconvert",
          jobId: response.Job.Id,
          status: "PROCESSING",
          thumbnailCount: thumbnailTimes.length,
          thumbnailTimepoints: thumbnailTimes.map(t => `${t}s`),
          outputLocation: outputUri,
          estimatedCompletion: "2-3 minutes",
          quality: "1280x720 @ 95% JPEG quality"
        }
      })
    };

  } catch (error) {
    console.error(`❌ MediaConvert failed, falling back to FFmpeg:`, error);
    // Fallback to FFmpeg
    return await generateWithFFmpeg(asset, assetId);
  }
}

// =============================================================================
// METHOD 2: FFMPEG (Instant, Medium Quality)
// =============================================================================
async function generateWithFFmpeg(asset, assetId) {
  console.log(`⚡ Generating thumbnails with FFmpeg (instant)`);

  const ffmpegPath = findFFmpegPath();
  if (!ffmpegPath) {
    console.warn(`⚠️ FFmpeg not available, falling back to placeholder`);
    return await generateWithPlaceholder(asset, assetId);
  }

  let tempVideoPath = null;

  try {
    // Download video
    const videoKey = asset.url.split('/').pop();
    tempVideoPath = `/tmp/${Date.now()}_${videoKey}`;
    
    console.log(`📥 Downloading video: ${videoKey}`);
    await downloadVideoFromS3(videoKey, tempVideoPath);

    // ✅ Get full video metadata including dimensions
    const videoMetadata = await getVideoMetadata(tempVideoPath);
    console.log(`📹 Video metadata:`, videoMetadata);

    // Calculate thumbnail times
    let thumbnailTimes = videoMetadata.duration < 30 
      ? [1, Math.max(2, videoMetadata.duration * 0.5), Math.max(3, videoMetadata.duration - 1)] 
      : [5, 15, 30];

    const generatedThumbnails = [];

    for (const timepoint of thumbnailTimes) {
      const fileName = `thumbnails/${assetId}-${timepoint}s.jpg`;
      // ✅ Pass video metadata to extraction function
      const result = await extractRealVideoFrame(ffmpegPath, tempVideoPath, timepoint, fileName, assetId, videoMetadata);

      if (result.success) {
        generatedThumbnails.push({
          timepoint,
          fileName,
          url: `${publicObjectUrl(BUCKET_NAME, fileName)}`,
          size: result.size,
          createdAt: new Date().toISOString(),
          isSelected: generatedThumbnails.length === 0,
          thumbnailType: 'video-frame',
          dimensions: result.dimensions
        });
      }
    }

    // Update database
    await dynamoClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: `
        SET videoMetadata.hasAutoThumbnail = :hasThumb,
            videoMetadata.thumbnailGenerationStatus = :status,
            videoMetadata.autoThumbnails = :thumbnails,
            videoMetadata.selectedThumbnail = :selected,
            videoMetadata.thumbnailMethod = :method,
            videoMetadata.sourceAspectRatio = :aspectRatio,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeValues: {
        ":hasThumb": true,
        ":status": "completed",
        ":thumbnails": generatedThumbnails,
        ":selected": generatedThumbnails[0],
        ":method": "ffmpeg",
        ":aspectRatio": `${videoMetadata.width}:${videoMetadata.height}`,
        ":updatedAt": new Date().toISOString()
      }
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Instant thumbnails generated with FFmpeg (aspect ratio preserved)",
        data: {
          assetId,
          method: "ffmpeg",
          thumbnails: generatedThumbnails,
          selectedThumbnail: generatedThumbnails[0],
          totalGenerated: generatedThumbnails.length,
          sourceResolution: `${videoMetadata.width}x${videoMetadata.height}`,
          processingTime: "instant"
        }
      })
    };

  } finally {
    if (tempVideoPath && existsSync(tempVideoPath)) {
      unlinkSync(tempVideoPath);
    }
  }
}


// =============================================================================
// METHOD 3: PLACEHOLDER (Fallback)
// =============================================================================
async function generateWithPlaceholder(asset, assetId) {
  console.log(`🎨 Generating placeholder thumbnails`);

  const placeholderThumbnails = [];
  const timepoints = [5, 15, 30];

  for (const timepoint of timepoints) {
    const fileName = `thumbnails/${assetId}-${timepoint}s.jpg`;
    const result = await createPlaceholderThumbnail(fileName, timepoint, assetId);

    if (result.success) {
      placeholderThumbnails.push({
        timepoint,
        fileName,
        url: `${publicObjectUrl(BUCKET_NAME, fileName)}`,
        size: result.size,
        createdAt: new Date().toISOString(),
        isSelected: placeholderThumbnails.length === 0,
        thumbnailType: 'placeholder',
        dimensions: result.dimensions
      });
    }
  }

  // Update database
  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { assetId },
    UpdateExpression: `
      SET videoMetadata.hasAutoThumbnail = :hasThumb,
          videoMetadata.thumbnailGenerationStatus = :status,
          videoMetadata.autoThumbnails = :thumbnails,
          videoMetadata.selectedThumbnail = :selected,
          videoMetadata.thumbnailMethod = :method,
          updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: {
      ":hasThumb": true,
      ":status": "completed",
      ":thumbnails": placeholderThumbnails,
      ":selected": placeholderThumbnails[0],
      ":method": "placeholder",
      ":updatedAt": new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Placeholder thumbnails generated",
      data: {
        assetId,
        method: "placeholder",
        thumbnails: placeholderThumbnails,
        selectedThumbnail: placeholderThumbnails[0],
        totalGenerated: placeholderThumbnails.length,
        note: "Placeholders used (processing tools unavailable)"
      }
    })
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function downloadVideoFromS3(videoKey, localPath) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: videoKey
  });
  
  const response = await s3.send(command);
  const writeStream = createWriteStream(localPath);
  await pipeline(response.Body, writeStream);
}

async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => { output += data.toString(); });
    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 60 : duration);
      } else {
        resolve(60); // Default fallback
      }
    });
    ffprobe.on('error', () => resolve(60));
  });
}
// Get video metadata including dimensions
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => { output += data.toString(); });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const metadata = JSON.parse(output);
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          
          if (videoStream) {
            resolve({
              duration: parseFloat(metadata.format.duration) || 60,
              width: videoStream.width || 1920,
              height: videoStream.height || 1080,
              aspectRatio: videoStream.display_aspect_ratio || '16:9'
            });
          } else {
            resolve({ duration: 60, width: 1920, height: 1080, aspectRatio: '16:9' });
          }
        } catch (error) {
          resolve({ duration: 60, width: 1920, height: 1080, aspectRatio: '16:9' });
        }
      } else {
        resolve({ duration: 60, width: 1920, height: 1080, aspectRatio: '16:9' });
      }
    });
    
    ffprobe.on('error', () => resolve({ duration: 60, width: 1920, height: 1080, aspectRatio: '16:9' }));
  });
}

// Extract frame with smart dimensions based on aspect ratio
async function extractRealVideoFrame(ffmpegPath, videoPath, timepoint, fileName, assetId, videoMetadata) {
  console.log(`🎬 Extracting REAL frame at ${timepoint}s using FFmpeg`);
  console.log(`   Video dimensions: ${videoMetadata.width}x${videoMetadata.height}`);
  
  const tempThumbnailPath = `/tmp/${assetId}-${timepoint}s-${Date.now()}.jpg`;
  
  // ✅ Calculate target dimensions based on aspect ratio
  const sourceWidth = videoMetadata.width;
  const sourceHeight = videoMetadata.height;
  const sourceAspectRatio = sourceWidth / sourceHeight;
  
  let targetWidth, targetHeight, dimensions;
  
  if (sourceAspectRatio >= 1.7) {
    // Wide video (16:9, 21:9, etc.)
    targetWidth = 640;
    targetHeight = 360;
    dimensions = '640x360';
  } else if (sourceAspectRatio >= 1.3) {
    // Standard video (4:3, 3:2)
    targetWidth = 480;
    targetHeight = 360;
    dimensions = '480x360';
  } else if (sourceAspectRatio >= 0.9) {
    // Square-ish (1:1)
    targetWidth = 360;
    targetHeight = 360;
    dimensions = '360x360';
  } else {
    // Vertical video (9:16, TikTok, Instagram Stories)
    targetWidth = 360;
    targetHeight = 640;
    dimensions = '360x640';
  }
  
  console.log(`   Target dimensions: ${dimensions} (aspect ratio: ${sourceAspectRatio.toFixed(2)})`);
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-ss', timepoint.toString(),
      '-i', videoPath,
      '-frames:v', '1',
      // ✅ Scale to fit within target, maintain aspect ratio, add letterbox if needed
      '-vf', `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`,
      '-q:v', '1',           // Best JPEG quality
      '-huffman', 'optimal',  // Better compression
      '-f', 'image2',
      '-y',
      tempThumbnailPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => { stderr += data; });
    
    ffmpeg.on('close', async (code) => {
      if (code === 0 && existsSync(tempThumbnailPath)) {
        try {
          const fs = await import('fs');
          const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
          await uploadThumbnailToS3(thumbnailBuffer, fileName);
          unlinkSync(tempThumbnailPath);
          
          resolve({
            success: true,
            size: thumbnailBuffer.length,
            dimensions: dimensions,
            actualTimepoint: timepoint
          });
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => reject(error));
    setTimeout(() => { ffmpeg.kill('SIGKILL'); reject(new Error('Timeout')); }, 30000);
  });
}


async function uploadThumbnailToS3(thumbnailBuffer, fileName) {
  const uploadCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: thumbnailBuffer,
    ContentType: "image/jpeg",
    CacheControl: "max-age=31536000"
  });

  return await s3.send(uploadCommand);
}

async function createPlaceholderThumbnail(fileName, timepoint, assetId) {
  const placeholders = {
    5: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAC0AVADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxTxL4i8VeKNe1DxL4r1bUdc1jWLqS/wBW1bUrqW8u7y6mYvNNLLI8ksjsSSzEkkkkk1yFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFBRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAP/2Q==', 'base64'),
    15: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAC0AVADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxTxL4i8VeKNe1DxL4r1bUdc1jWLqS/wBW1bUrqW8u7y6mYvNNLLI8ksjsSSzEkkkkk1yFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFBRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAP/2Q==', 'base64'),
    30: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAC0AVADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxTxL4i8VeKNe1DxL4r1bUdc1jWLqS/wBW1bUrqW8u7y6mYvNNLLI8ksjsSSzEkkkkk1yFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFBRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAP/2Q==', 'base64')
  };

  const buffer = placeholders[timepoint] || placeholders[5];
  
  try {
    await uploadThumbnailToS3(buffer, fileName);
    return {
      success: true,
      size: buffer.length,
      dimensions: '320x180'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
