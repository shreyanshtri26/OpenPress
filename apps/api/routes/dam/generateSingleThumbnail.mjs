// generateSingleThumbnail.mjs - Fixed Version with Proper Error Handling
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { UpdateCommand, GetCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";
import { spawn } from "child_process";
import { createWriteStream, unlinkSync, statSync, existsSync, readFileSync } from "fs";
import { pipeline } from "stream/promises";
import { createS3Client, publicObjectUrl } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.STORAGE_REGION });
const TABLE_NAME = process.env.DOC_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.DAM_BUCKET_NAME;
const FFMPEG_PATH = "/opt/bin/ffmpeg";

export const handler = async (event) => {
  let tempFilePath = null;
  let thumbnailPath = null;
  const startTime = Date.now();

  try {
    const body = JSON.parse(event.body);
    const { assetId, timepoint } = body;

    if (!assetId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "assetId is required" }),
      };
    }


    // ✅ Get asset
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });

    const result = await docClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Asset not found" }),
      };
    }

    if (!asset.isVideo) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Asset is not a video" }),
      };
    }


    // ✅ Download video from S3
    const key = asset.url.split('/').pop();
    tempFilePath = `/tmp/${Date.now()}_${key}`;
    
    await downloadFileFromS3(BUCKET_NAME, key, tempFilePath);

    if (!existsSync(tempFilePath)) {
      throw new Error("Video file download failed");
    }

    // ✅ Use fixed timepoint or default to 5 seconds
    const thumbnailTime = timepoint || 5;

    // ✅ Generate unique thumbnail path
    thumbnailPath = `/tmp/thumb_${Date.now()}_${assetId.substring(0, 8)}.jpg`;

    // ✅ Generate single thumbnail with proper error handling
    const thumbnailGenerated = await generateThumbnailAtTime(tempFilePath, thumbnailPath, thumbnailTime);
    
    if (!thumbnailGenerated || !existsSync(thumbnailPath)) {
      throw new Error(`Thumbnail generation failed - file not created at ${thumbnailPath}`);
    }


    // ✅ Upload to S3
    const thumbnailFileName = `thumbnails/${assetId}-${thumbnailTime}s.jpg`;
    const thumbnailUrl = await uploadThumbnailToS3(thumbnailPath, thumbnailFileName);


    // ✅ Update asset
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: `
        SET videoMetadata.hasAutoThumbnail = :hasThumb,
            videoMetadata.thumbnailGenerationStatus = :status,
            videoMetadata.selectedThumbnail = :selected,
            videoMetadata.thumbnailType = :thumbType,
            previewUrl = :previewUrl,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeValues: {
        ":hasThumb": true,
        ":status": "completed",
        ":selected": {
          url: thumbnailUrl,
          timepoint: thumbnailTime,
          type: "auto-single",
          isSelected: true,
          createdAt: new Date().toISOString()
        },
        ":thumbType": "auto-single",
        ":previewUrl": thumbnailUrl,
        ":updatedAt": new Date().toISOString()
      }
    });

    await docClient.send(updateCommand);

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Single thumbnail generated successfully",
        assetId,
        thumbnail: {
          url: thumbnailUrl,
          timepoint: thumbnailTime,
          type: "auto-single",
          createdAt: new Date().toISOString()
        },
        processingTime: `${elapsed}ms`
      }),
    };

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Single thumbnail generation failed:`, {
      error: err.message,
      assetId: body?.assetId,
      tempFilePath,
      thumbnailPath,
      fileExists: thumbnailPath ? existsSync(thumbnailPath) : false,
      processingTime: `${elapsed}ms`
    });

    // ✅ Update asset with error status
    if (body?.assetId) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { assetId: body.assetId },
            UpdateExpression: `
              SET videoMetadata.thumbnailGenerationStatus = :status,
                  videoMetadata.thumbnailGenerationError = :error,
                  updatedAt = :updatedAt
            `,
            ExpressionAttributeValues: {
              ":status": "failed",
              ":error": err.message,
              ":updatedAt": new Date().toISOString()
            }
          })
        );
      } catch (updateError) {
        console.error("Failed to update error status:", updateError);
      }
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Single thumbnail generation failed",
        error: err.message,
        assetId: body?.assetId,
        processingTime: `${elapsed}ms`
      }),
    };

  } finally {
    // ✅ Cleanup temporary files
    [tempFilePath, thumbnailPath].forEach(path => {
      if (path && existsSync(path)) {
        try {
          unlinkSync(path);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup ${path}:`, cleanupError);
        }
      }
    });
  }
};

// ===== HELPER FUNCTIONS =====

async function downloadFileFromS3(bucket, key, localPath) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const writeStream = createWriteStream(localPath);
  await pipeline(response.Body, writeStream);
}

async function generateThumbnailAtTime(videoPath, outputPath, timepoint) {
  return new Promise((resolve, reject) => {
    if (!existsSync(FFMPEG_PATH)) {
      reject(new Error(`FFmpeg not found at ${FFMPEG_PATH}`));
      return;
    }


    const args = [
      '-i', videoPath,
      '-ss', timepoint.toString(),
      '-frames:v', '1',
      '-q:v', '2',
      '-vf', 'scale=320:240:force_original_aspect_ratio=decrease',
      '-y', // Overwrite output file
      outputPath
    ];


    const ffmpeg = spawn(FFMPEG_PATH, args);
    let stdout = '';
    let stderr = '';

    ffmpeg.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {

      if (code !== 0) {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      } else if (!existsSync(outputPath)) {
        reject(new Error(`FFmpeg completed but output file not created: ${outputPath}`));
      } else {
        const stats = statSync(outputPath);
        resolve(true);
      }
    });

    ffmpeg.on('error', (error) => {
      console.error(`🚨 FFmpeg spawn error:`, error);
      reject(new Error(`FFmpeg spawn failed: ${error.message}`));
    });

    // ✅ Timeout handling
    setTimeout(() => {
      console.warn("⏰ FFmpeg timeout - killing process");
      ffmpeg.kill('SIGKILL');
      reject(new Error('FFmpeg timeout after 30 seconds'));
    }, 30000);
  });
}

async function uploadThumbnailToS3(localPath, s3Key) {
  if (!existsSync(localPath)) {
    throw new Error(`Thumbnail file not found for upload: ${localPath}`);
  }

  const fileBuffer = readFileSync(localPath);
  const stats = statSync(localPath);
  
  
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000' // 1 year cache
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return `${publicObjectUrl(BUCKET_NAME, s3Key)}`;
}
