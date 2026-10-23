// routes/dam/transcodingProcessor.mjs - FFmpeg Video Transcoding Processor
import { GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { UpdateCommand, GetCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";
import { spawn } from "child_process";
import { createWriteStream, unlinkSync, statSync, existsSync, createReadStream, readdirSync } from "fs";
import { pipeline } from "stream/promises";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.STORAGE_REGION });
const TABLE_NAME = process.env.DOC_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.DAM_BUCKET_NAME;
const FFMPEG_PATH = "/opt/bin/ffmpeg";
const FFPROBE_PATH = "/opt/bin/ffprobe";

// ✅ Quality configurations optimized for function
const QUALITY_CONFIGS = {
  "360p": { 
    width: 640, 
    height: 360, 
    bitrate: "800k", 
    maxrate: "1200k",
    bufsize: "1600k",
    audioBitrate: "96k",
    preset: "faster"
  },
  "480p": { 
    width: 854, 
    height: 480, 
    bitrate: "1200k", 
    maxrate: "1800k",
    bufsize: "2400k",
    audioBitrate: "128k",
    preset: "faster"
  },
  "720p": { 
    width: 1280, 
    height: 720, 
    bitrate: "2500k", 
    maxrate: "3750k",
    bufsize: "5000k",
    audioBitrate: "128k",
    preset: "medium"
  },
  "1080p": { 
    width: 1920, 
    height: 1080, 
    bitrate: "4500k", 
    maxrate: "6750k",
    bufsize: "9000k",
    audioBitrate: "192k",
    preset: "medium"
  },
  "2160p": { 
    width: 3840, 
    height: 2160, 
    bitrate: "15000k", 
    maxrate: "22500k",
    bufsize: "30000k",
    audioBitrate: "256k",
    preset: "slow"
  }
};

export const handler = async (event) => {
  
  // Process SQS messages
  for (const record of event.Records) {
    await processFFmpegTranscodingJob(record);
  }
};

async function processFFmpegTranscodingJob(record) {
  const startTime = Date.now();
  let tempInputPath = null;
  let tempOutputPaths = [];

  try {
    const message = JSON.parse(record.body);
    const { assetId, userId, qualities } = message;


    // ✅ Cleanup /tmp first
    await cleanupTempDirectory();

    // ✅ Get asset details
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });

    const result = await docClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      throw new Error("Asset not found");
    }

    if (!asset.isVideo) {
      throw new Error("Asset is not a video");
    }


    // ✅ Check file size before download
    const key = asset.url.split('/').pop();
    const fileSize = await getS3FileSize(BUCKET_NAME, key);
    

    // ✅ Size check - function has limited /tmp space
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large for function processing: ${fileSize} bytes (max: ${MAX_FILE_SIZE})`);
    }

    // ✅ Download original video
    tempInputPath = `/tmp/${Date.now()}_input_${key}`;
    
    await downloadFileFromS3(BUCKET_NAME, key, tempInputPath);

    // ✅ Get video metadata to determine applicable qualities
    const videoMetadata = await getVideoMetadata(tempInputPath);

    // ✅ Determine which qualities to generate based on source
    const applicableQualities = getApplicableQualities(videoMetadata, qualities);

    // ✅ Transcode to each quality
    const qualityVariants = {};
    
    for (const quality of applicableQualities) {
      try {
        
        const outputPath = `/tmp/${Date.now()}_${quality}_${assetId}.mp4`;
        tempOutputPaths.push(outputPath);
        
        // ✅ Perform transcoding
        await transcodeVideoFFmpeg(tempInputPath, outputPath, quality, videoMetadata);
        
        // ✅ Upload transcoded video to S3
        const s3Key = `transcoded/${assetId}/${quality}/${asset.name.replace(/\.[^/.]+$/, '')}_${quality}.mp4`;
        const s3Url = await uploadToS3(outputPath, s3Key);
        
        // ✅ Get output file stats
        const stats = statSync(outputPath);
        
        qualityVariants[quality] = {
          url: s3Url,
          size: stats.size,
          bitrate: QUALITY_CONFIGS[quality].bitrate,
          resolution: `${QUALITY_CONFIGS[quality].width}x${QUALITY_CONFIGS[quality].height}`,
          format: "mp4",
          codec: "h264",
          audioBitrate: QUALITY_CONFIGS[quality].audioBitrate,
          createdAt: new Date().toISOString(),
          processingTimeSeconds: Math.round((Date.now() - startTime) / 1000)
        };
        
        
      } catch (qualityError) {
        console.error(`❌ Failed to transcode ${quality}:`, qualityError.message);
        
        qualityVariants[quality] = {
          status: "failed",
          error: qualityError.message,
          createdAt: new Date().toISOString()
        };
      }
    }

    // ✅ Update asset with transcoding results
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: `
        SET videoMetadata.transcodingStatus = :status,
            videoMetadata.transcodingCompletedAt = :completedAt,
            videoMetadata.qualityVariants = :variants,
            videoMetadata.sourceMetadata = :sourceMetadata,
            videoMetadata.transcodingStats = :stats,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeValues: {
        ":status": "completed",
        ":completedAt": new Date().toISOString(),
        ":variants": qualityVariants,
        ":sourceMetadata": {
          width: videoMetadata.width,
          height: videoMetadata.height,
          duration: videoMetadata.duration,
          format: videoMetadata.format || "unknown"
        },
        ":stats": {
          totalQualities: applicableQualities.length,
          successfulQualities: Object.keys(qualityVariants).filter(q => qualityVariants[q].url).length,
          failedQualities: Object.keys(qualityVariants).filter(q => qualityVariants[q].status === 'failed').length,
          totalProcessingTimeMs: Date.now() - startTime,
          avgProcessingTimePerQuality: Math.round((Date.now() - startTime) / applicableQualities.length),
          totalOutputSizeMB: Math.round(Object.values(qualityVariants).reduce((sum, variant) => sum + (variant.size || 0), 0) / 1024 / 1024)
        },
        ":updatedAt": new Date().toISOString()
      }
    });

    await docClient.send(updateCommand);

    const elapsed = Date.now() - startTime;
    
    // ✅ Success summary

  } catch (err) {
    console.error("❌ FFmpeg transcoding job failed:", err);

    // ✅ Update asset with failure status
    try {
      const message = JSON.parse(record.body);
      const { assetId } = message;
      
      const updateCommand = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { assetId },
        UpdateExpression: `
          SET videoMetadata.transcodingStatus = :status,
              videoMetadata.transcodingError = :error,
              videoMetadata.transcodingFailedAt = :failedAt,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":status": "failed",
          ":error": err.message,
          ":failedAt": new Date().toISOString(),
          ":updatedAt": new Date().toISOString()
        }
      });

      await docClient.send(updateCommand);
      
      
    } catch (updateError) {
      console.error("❌ Failed to update asset with error status:", updateError);
    }

  } finally {
    // ✅ Cleanup temporary files
    [tempInputPath, ...tempOutputPaths].forEach(path => {
      if (path && existsSync(path)) {
        try {
          unlinkSync(path);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup ${path}:`, cleanupError);
        }
      }
    });

    // ✅ Final memory check
    const memUsage = process.memoryUsage();
  }
}

// ===== HELPER FUNCTIONS =====

async function cleanupTempDirectory() {
  try {
    const tmpFiles = readdirSync('/tmp');
    
    for (const file of tmpFiles) {
      try {
        const filePath = `/tmp/${file}`;
        const stats = statSync(filePath);
        
        // Remove files older than 10 minutes
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        if (stats.mtime.getTime() < tenMinutesAgo) {
          unlinkSync(filePath);
        }
      } catch (err) {
        // Ignore individual file errors
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not cleanup /tmp:`, error.message);
  }
}

async function getS3FileSize(bucket, key) {
  try {
    const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const result = await s3Client.send(headCommand);
    return result.ContentLength || 0;
  } catch (error) {
    console.warn(`⚠️ Could not get S3 file size:`, error.message);
    return 0;
  }
}

function getApplicableQualities(videoMetadata, requestedQualities) {
  const sourceHeight = videoMetadata.height; // 1280
  const sourceWidth = videoMetadata.width;   // 720
  const applicable = [];
  
  
  for (const quality of requestedQualities) {
    const config = QUALITY_CONFIGS[quality];
    if (!config) continue;
    
    const targetHeight = config.height;
    const targetWidth = config.width;
    
    // ✅ More flexible logic - allow upscaling for reasonable cases
    let shouldGenerate = false;
    
    if (quality === "360p") {
      // Always generate 360p for mobile compatibility
      shouldGenerate = true;
      
    } else if (quality === "480p") {
      // Generate 480p if source is at least 360p quality
      shouldGenerate = sourceHeight >= 360 || sourceWidth >= 640;
      
    } else if (sourceHeight >= targetHeight * 0.8) {
      // Generate if source is at least 80% of target height
      shouldGenerate = true;
      
    } else {
    }
    
    if (shouldGenerate) {
      applicable.push(quality);
    }
  }
  
  // Ensure at least one quality
  if (applicable.length === 0) {
    applicable.push("360p");
  }
  
  return applicable;
}


async function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    if (!existsSync(FFPROBE_PATH)) {
      reject(new Error(`FFprobe not found at ${FFPROBE_PATH}`));
      return;
    }

    const ffprobe = spawn(FFPROBE_PATH, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      filePath
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams.find(s => s.codec_type === 'video');
        
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }
        
        resolve({
          width: videoStream.width,
          height: videoStream.height,
          duration: parseFloat(data.format?.duration) || parseFloat(videoStream.duration) || 0,
          format: data.format?.format_name
        });
      } catch (err) {
        reject(new Error(`Failed to parse FFprobe output: ${err.message}`));
      }
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      ffprobe.kill('SIGKILL');
      reject(new Error('FFprobe timeout'));
    }, 2 * 60 * 1000);
  });
}

async function transcodeVideoFFmpeg(inputPath, outputPath, quality, sourceMetadata) {
  return new Promise((resolve, reject) => {
    const config = QUALITY_CONFIGS[quality];
    
    // ✅ Optimized FFmpeg arguments for function
    const ffmpegArgs = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', config.preset,
      '-crf', '23',
      '-maxrate', config.maxrate,
      '-bufsize', config.bufsize,
      '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      '-c:a', 'aac',
      '-b:a', config.audioBitrate,
      '-movflags', '+faststart',
      '-threads', '2', // Limit threads for function
      '-y', // Overwrite output
      outputPath
    ];


    const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs);
    let stderr = '';
    let lastProgress = Date.now();

    // ✅ Monitor progress
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      lastProgress = Date.now();
      
      // Log progress occasionally
      if (data.toString().includes('time=')) {
        const progressLine = data.toString().split('\n').find(line => line.includes('time='));
        if (progressLine && Math.random() < 0.1) { // Log 10% of progress lines
        }
      }
    });

    // ✅ Success handler
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
        return;
      }

      if (!existsSync(outputPath)) {
        reject(new Error('FFmpeg did not create output file'));
        return;
      }

      const outputStats = statSync(outputPath);
      resolve(outputPath);
    });

    // ✅ Error handler
    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });

    // ✅ Timeout protection (12 minutes max)
    const timeoutMs = 12 * 60 * 1000;
    const timeoutId = setTimeout(() => {
      ffmpeg.kill('SIGKILL');
      reject(new Error(`FFmpeg timeout after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    ffmpeg.on('close', () => {
      clearTimeout(timeoutId);
    });

    // ✅ Progress monitoring (detect stuck processes)
    const progressCheckInterval = setInterval(() => {
      const timeSinceLastProgress = Date.now() - lastProgress;
      
      if (timeSinceLastProgress > 3 * 60 * 1000) { // 3 minutes without progress
        console.warn(`⚠️ FFmpeg appears stuck for ${quality} - no progress for 3 minutes`);
        ffmpeg.kill('SIGKILL');
        clearTimeout(timeoutId);
        clearInterval(progressCheckInterval);
        reject(new Error('FFmpeg stuck - no progress for 3 minutes'));
      }
    }, 30000); // Check every 30 seconds

    ffmpeg.on('close', () => {
      clearInterval(progressCheckInterval);
    });
  });
}

async function downloadFileFromS3(bucket, key, localPath) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const writeStream = createWriteStream(localPath);
  await pipeline(response.Body, writeStream);
  
  const stats = statSync(localPath);
}

async function uploadToS3(localPath, s3Key) {
  const fileStream = createReadStream(localPath);
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileStream,
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=31536000'
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  const url = `${publicObjectUrl(BUCKET_NAME, s3Key)}`;
  return url;
}
