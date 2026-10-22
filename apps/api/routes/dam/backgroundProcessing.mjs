// routes/dam/backgroundTranscoding.mjs - Background Processing Logic
import { UpdateCommand, GetCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";
import { GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import { createWriteStream, unlinkSync, statSync, existsSync, createReadStream, readdirSync } from "fs";
import { pipeline } from "stream/promises";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.STORAGE_REGION });
const TABLE_NAME = process.env.DOC_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.DAM_BUCKET_NAME;

// Find FFmpeg paths
const FFMPEG_ALTERNATIVES = ["/opt/ffmpeg", "/opt/bin/ffmpeg"];
const FFPROBE_ALTERNATIVES = ["/opt/ffprobe", "/opt/bin/ffprobe"];

function findFFmpegPath() {
  for (const path of FFMPEG_ALTERNATIVES) {
    if (existsSync(path)) return path;
  }
  throw new Error("FFmpeg not found");
}

function findFFprobePath() {
  for (const path of FFPROBE_ALTERNATIVES) {
    if (existsSync(path)) return path;
  }
  throw new Error("FFprobe not found");
}

// Quality configurations
const QUALITY_CONFIGS = {
  "360p": { width: 640, height: 360, bitrate: "800k", maxrate: "1200k", bufsize: "1600k", audioBitrate: "96k", preset: "faster" },
  "480p": { width: 854, height: 480, bitrate: "1200k", maxrate: "1800k", bufsize: "2400k", audioBitrate: "128k", preset: "faster" },
  "720p": { width: 1280, height: 720, bitrate: "2500k", maxrate: "3750k", bufsize: "5000k", audioBitrate: "128k", preset: "medium" },
  "1080p": { width: 1920, height: 1080, bitrate: "4500k", maxrate: "6750k", bufsize: "9000k", audioBitrate: "192k", preset: "medium" }
};

// ✅ UPDATED: Generate ALL requested qualities
function getApplicableQualities(videoMetadata, requestedQualities) {
  const sourceHeight = videoMetadata.height;
  const sourceWidth = videoMetadata.width;
  
  console.log(`📐 Source resolution: ${sourceWidth}x${sourceHeight}`);
  console.log(`🎯 Requested qualities: ${requestedQualities.join(', ')}`);
  
  // ✅ Generate ALL requested qualities - let FFmpeg handle upscaling
  const applicable = requestedQualities.filter(quality => {
    const config = QUALITY_CONFIGS[quality];
    if (!config) {
      console.log(`❌ ${quality}: Invalid quality config`);
      return false;
    }
    
    console.log(`✅ ${quality}: Will be generated (${config.width}x${config.height})`);
    return true;
  });
  
  // Ensure at least 360p
  if (applicable.length === 0) {
    applicable.push("360p");
    console.log(`✅ Fallback: Added 360p as minimum quality`);
  }
  
  console.log(`🎯 Final qualities to generate: ${applicable.join(', ')}`);
  return applicable;
}

// Main background processing function
export async function processVideoTranscoding(assetId, userId, requestedQualities) {
  const startTime = Date.now();
  let tempInputPath = null;
  let tempOutputPaths = [];

  try {
    console.log(`🎬 Background processing started for: ${assetId}`);

    // Find FFmpeg binaries
    const ffmpegPath = findFFmpegPath();
    const ffprobePath = findFFprobePath();

    // Get asset
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });
    const result = await docClient.send(getCommand);
    const asset = result.Item;

    if (!asset) throw new Error("Asset not found");

    // Check file size
    const key = asset.url.split('/').pop();
    const fileSize = await getS3FileSize(BUCKET_NAME, key);
    
    if (fileSize > 2 * 1024 * 1024 * 1024) {
      throw new Error(`File too large: ${fileSize} bytes`);
    }

    // Download video
    tempInputPath = `/tmp/${Date.now()}_input_${key}`;
    await downloadFileFromS3(BUCKET_NAME, key, tempInputPath);

    // Get metadata
    const videoMetadata = await getVideoMetadata(tempInputPath, ffprobePath);
    
    // ✅ Use updated quality selection (generates ALL requested)
    const applicableQualities = getApplicableQualities(videoMetadata, requestedQualities);

    // Process each quality sequentially (to save memory)
    const qualityVariants = {};
    
    for (const quality of applicableQualities) {
      try {
        console.log(`🔄 Processing ${quality}...`);
        
        const outputPath = `/tmp/${Date.now()}_${quality}_${assetId}.mp4`;
        tempOutputPaths.push(outputPath);
        
        // Transcode
        await transcodeVideoFFmpeg(tempInputPath, outputPath, quality, ffmpegPath);
        
        // Upload
        const s3Key = `transcoded/${assetId}/${quality}/${asset.name.replace(/\.[^/.]+$/, '')}_${quality}.mp4`;
        const s3Url = await uploadToS3(outputPath, s3Key);
        
        // Get stats and cleanup immediately
        const stats = statSync(outputPath);
        unlinkSync(outputPath); // Free space immediately
        
        qualityVariants[quality] = {
          url: s3Url,
          size: stats.size,
          bitrate: QUALITY_CONFIGS[quality].bitrate,
          resolution: `${QUALITY_CONFIGS[quality].width}x${QUALITY_CONFIGS[quality].height}`,
          format: "mp4",
          codec: "h264",
          audioBitrate: QUALITY_CONFIGS[quality].audioBitrate,
          createdAt: new Date().toISOString()
        };
        
        console.log(`✅ ${quality} completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
      } catch (qualityError) {
        console.error(`❌ Failed ${quality}:`, qualityError.message);
        qualityVariants[quality] = {
          status: "failed",
          error: qualityError.message,
          createdAt: new Date().toISOString()
        };
      }
    }

    // Update final results
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
          duration: videoMetadata.duration 
        },
        ":stats": {
          totalQualities: applicableQualities.length,
          successfulQualities: Object.keys(qualityVariants).filter(q => qualityVariants[q].url).length,
          failedQualities: Object.keys(qualityVariants).filter(q => qualityVariants[q].status === 'failed').length,
          totalProcessingTimeMs: Date.now() - startTime,
          processingMethod: "background-sequential"
        },
        ":updatedAt": new Date().toISOString()
      }
    });

    await docClient.send(updateCommand);

    console.log(`✅ Background transcoding completed for ${assetId} in ${Date.now() - startTime}ms`);

  } finally {
    // Cleanup
    [tempInputPath, ...tempOutputPaths].forEach(path => {
      if (path && existsSync(path)) {
        try { unlinkSync(path); } catch (e) {}
      }
    });
  }
}

// Helper functions
async function getS3FileSize(bucket, key) {
  try {
    const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const result = await s3Client.send(headCommand);
    return result.ContentLength || 0;
  } catch (e) {
    return 0;
  }
}

async function getVideoMetadata(filePath, ffprobePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffprobePath, [
      '-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath
    ]);

    let stdout = '';
    ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed with code ${code}`));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams.find(s => s.codec_type === 'video');
        resolve({
          width: videoStream.width,
          height: videoStream.height,
          duration: parseFloat(data.format?.duration) || 0
        });
      } catch (err) {
        reject(err);
      }
    });
    setTimeout(() => { ffprobe.kill('SIGKILL'); reject(new Error('FFprobe timeout')); }, 60000);
  });
}

async function transcodeVideoFFmpeg(inputPath, outputPath, quality, ffmpegPath) {
  return new Promise((resolve, reject) => {
    const config = QUALITY_CONFIGS[quality];
    
    const ffmpegArgs = [
      '-i', inputPath, '-c:v', 'libx264', '-preset', config.preset, '-crf', '23',
      '-maxrate', config.maxrate, '-bufsize', config.bufsize,
      '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      '-c:a', 'aac', '-b:a', config.audioBitrate, '-movflags', '+faststart', '-threads', '2', '-y', outputPath
    ];

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs);
    ffmpeg.on('close', (code) => {
      if (code !== 0 || !existsSync(outputPath)) {
        reject(new Error(`FFmpeg failed with code ${code}`));
      } else {
        resolve(outputPath);
      }
    });
    setTimeout(() => { ffmpeg.kill('SIGKILL'); reject(new Error('FFmpeg timeout')); }, 12 * 60 * 1000);
  });
}

async function downloadFileFromS3(bucket, key, localPath) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const writeStream = createWriteStream(localPath);
  await pipeline(response.Body, writeStream);
}

async function uploadToS3(localPath, s3Key) {
  const fileStream = createReadStream(localPath);
  const uploadParams = {
    Bucket: BUCKET_NAME, Key: s3Key, Body: fileStream,
    ContentType: 'video/mp4', CacheControl: 'public, max-age=31536000'
  };
  await s3Client.send(new PutObjectCommand(uploadParams));
  return `${publicObjectUrl(BUCKET_NAME, s3Key)}`;
}
