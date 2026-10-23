// routes/dam/extractMetadata.mjs - Complete Video Transcoding Implementation
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { isEnabled } from "../../lib/features.mjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { users } from "../../db/schema.mjs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { UpdateCommand, GetCommand, ScanCommand } from "../../db/commands.mjs";
import { MediaConvertClient, CreateJobCommand } from "@aws-sdk/client-mediaconvert";
import docClient from "../../docClient.mjs";
import { spawn } from "child_process";
import { createWriteStream, unlinkSync, statSync, existsSync, readdirSync } from "fs";
import { pipeline } from "stream/promises";

//AI metadata
import { detectModeration } from '../analysis/Images/detectModeration.mjs';
// import { recognizeCelebrities } from '../analysis/Images/recognizeCelebrities.mjs'; // removed: celebrity detection feature deprecated
import { detectText } from '../analysis/Images/detectText.mjs';
import { detectLabels } from '../analysis/Images/detectLabels.mjs';
import { startVideoAnalysis } from '../analysis/videos/startVideoAnalysis.mjs';
import { createS3Client, clientConfig } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.STORAGE_REGION });
const TABLE_NAME = process.env.DOC_ASSETS_TABLE_NAME;
const BUCKET_NAME = process.env.DAM_BUCKET_NAME;
const REKOGNITION_BUCKET_NAME = process.env.ANALYSIS_BUCKET_NAME;



// Transcode client configuration
const transcodeClient = new MediaConvertClient({ ...clientConfig(),
  endpoint: process.env.TRANSCODE_ENDPOINT
});

// Find FFprobe from layers
const FFPROBE_ALTERNATIVES = [
  "/opt/ffprobe", "/opt/bin/ffprobe", "/opt/ffmpeg/ffprobe", "/opt/layer/ffprobe", "/usr/bin/ffprobe"
];

function findFFprobePath() {
  for (const path of FFPROBE_ALTERNATIVES) {
    if (existsSync(path)) return path;
  }
  return null; // not installed (e.g. Neon Functions): only basic metadata is recorded
}

// Complete Multi-Quality Video Transcoding Function - FIXED H.264 SETTINGS
async function createMultiQualityTranscodingJob(assetId, videoKey, fileSize, duration, dimensions, videoMetadata) {

  // File size limits
  const maxFileSize = 10 * 1024 * 1024 * 1024; // 10GB limit
  const minFileSize = 100 * 1024; // 1MB minimum
  const minDuration = 1; // 1 second minimum

  if (fileSize > maxFileSize) {
      return null;
  }

  if (duration && duration < minDuration) {
      return null;
  }

  try {
      const inputUri = `s3://${BUCKET_NAME}/${videoKey}`;
      const outputUri = `s3://${BUCKET_NAME}/processed/`;

      // Analyze source video to determine optimal outputs
      const sourceWidth = videoMetadata?.width || 1920;
      const sourceHeight = videoMetadata?.height || 1080;
      const isVertical = sourceHeight > sourceWidth;
      const is4K = sourceWidth >= 3840 || sourceHeight >= 2160;
      const isHD = sourceWidth >= 1920 || sourceHeight >= 1080;
      

      // Quality configurations based on source
      const qualitySettings = [];

      // 4K - 2160p (only if source supports)
      if (is4K) {
          qualitySettings.push({
              suffix: "_2160p",
              width: isVertical ? 2160 : 3840,
              height: isVertical ? 3840 : 2160,
              bitrate: 15000000, // 15 Mbps
              profile: "HIGH",
              level: "H264_LEVEL_5_1"
          });
      }

      // 1080p - Full HD (always include if source is HD+)
      if (sourceHeight >= 1080 || sourceWidth >= 1920) {
          qualitySettings.push({
              suffix: "_1080p",
              width: isVertical ? 1080 : 1920,
              height: isVertical ? 1920 : 1080,
              bitrate: 5000000, // 5 Mbps
              profile: "HIGH",
              level: "H264_LEVEL_4_1"
          });
      }

      // 720p - HD (always include)
      qualitySettings.push({
          suffix: "_720p",
          width: isVertical ? 720 : 1280,
          height: isVertical ? 1280 : 720,
          bitrate: 3000000, // 3 Mbps
          profile: "MAIN",
          level: "H264_LEVEL_3_1"
      });

      // 480p - Standard Definition
      qualitySettings.push({
          suffix: "_480p",
          width: isVertical ? 480 : 854,
          height: isVertical ? 854 : 480,
          bitrate: 1500000, // 1.5 Mbps
          profile: "MAIN",
          level: "H264_LEVEL_3_0"
      });

      // 360p - Mobile/Low bandwidth
      qualitySettings.push({
          suffix: "_360p",
          width: isVertical ? 360 : 640,
          height: isVertical ? 640 : 360,
          bitrate: 800000, // 800 Kbps
          profile: "BASELINE",
          level: "H264_LEVEL_2_1"
      });


      // Build Transcode job with FIXED H.264 settings
      const outputs = qualitySettings.map(quality => ({
          NameModifier: quality.suffix,
          VideoDescription: {
              Width: quality.width,
              Height: quality.height,
              CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                      RateControlMode: "VBR", // ✅ FIXED: Using VBR instead of CBR
                      Bitrate: quality.bitrate,
                      GopSize: 60,
                      MaxBitrate: Math.round(quality.bitrate * 1.2), // ✅ FIXED: 20% above target bitrate
                      Profile: quality.profile,
                      Level: quality.level,
                      FramerateControl: "INITIALIZE_FROM_SOURCE",
                      FramerateConversionAlgorithm: "DUPLICATE_DROP"
                  }
              }
          },
          AudioDescriptions: [{
              AudioTypeControl: "FOLLOW_INPUT",
              AudioSourceName: "Audio Selector 1",
              CodecSettings: {
                  Codec: "AAC",
                  AacSettings: {
                      Bitrate: quality.suffix.includes('2160p') ? 256000 : 
                              quality.suffix.includes('1080p') ? 192000 :
                              quality.suffix.includes('720p') ? 128000 : 96000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000
                  }
              }
          }],
          ContainerSettings: {
              Container: "MP4",
              Mp4Settings: {
                  MoovPlacement: "PROGRESSIVE_DOWNLOAD"
              }
          }
      }));

      // Add thumbnail outputs
      const thumbnailOutputs = [
          {
              NameModifier: "_thumbnail_large",
              VideoDescription: {
                  Width: 640,
                  Height: 360,
                  CodecSettings: {
                      Codec: "H_264",
                      H264Settings: {
                          RateControlMode: "VBR", // ✅ FIXED: VBR for thumbnails too
                          FramerateControl: "SPECIFIED",
                          FramerateNumerator: 1,
                          FramerateDenominator: 1,
                          Bitrate: 500000,
                          MaxBitrate: 600000 // ✅ FIXED: Added MaxBitrate for VBR
                      }
                  }
              },
              ContainerSettings: { Container: "MP4" }
          },
          {
              NameModifier: "_thumbnail_small",
              VideoDescription: {
                  Width: 320,
                  Height: 180,
                  CodecSettings: {
                      Codec: "H_264",
                      H264Settings: {
                          RateControlMode: "VBR", 
                          FramerateControl: "SPECIFIED",
                          FramerateNumerator: 1,
                          FramerateDenominator: 1,
                          Bitrate: 200000,
                          MaxBitrate: 300000 // ✅ FIXED: Added MaxBitrate for VBR
                      }
                  }
              },
              ContainerSettings: { Container: "MP4" }
          }
      ];

      const jobSettings = {
          Role: process.env.TRANSCODE_ROLE_ARN,
          UserMetadata: {
              "AssetId": assetId,
              "OriginalKey": videoKey,
              "ProcessingType": "Multi-Quality-Transcode",
              "SourceFileSize": fileSize.toString(),
              "SourceDimensions": dimensions || "Unknown",
              "QualityCount": qualitySettings.length.toString(),
              "CreatedAt": new Date().toISOString()
          },
          Settings: {
              Inputs: [{
                  FileInput: inputUri,
                  AudioSelectors: {
                      "Audio Selector 1": {
                          DefaultSelection: "DEFAULT"
                      }
                  },
                  VideoSelector: {},
                  TimecodeSource: "ZEROBASED"
              }],
              OutputGroups: [
                  // Video Quality Outputs
                  {
                      Name: "Multi-Quality Video Outputs",
                      OutputGroupSettings: {
                          Type: "FILE_GROUP_SETTINGS",
                          FileGroupSettings: {
                              Destination: `${outputUri}${assetId}/videos/`
                          }
                      },
                      Outputs: outputs
                  },
                  // Thumbnail Outputs
                  {
                      Name: "Thumbnail Outputs",
                      OutputGroupSettings: {
                          Type: "FILE_GROUP_SETTINGS",
                          FileGroupSettings: {
                              Destination: `${outputUri}${assetId}/thumbnails/`
                          }
                      },
                      Outputs: thumbnailOutputs
                  }
              ]
          }
      };


      const command = new CreateJobCommand(jobSettings);
      const response = await transcodeClient.send(command);

      // Estimate processing time
      const baseMinutes = Math.ceil(duration / 60); // 1 minute per minute of video
      const qualityMultiplier = qualitySettings.length * 0.5; // 30s per quality
      const estimatedMinutes = Math.ceil(baseMinutes + qualityMultiplier + (is4K ? 10 : 5));


      return {
          jobId: response.Job.Id,
          status: response.Job.Status,
          jobArn: response.Job.Arn,
          createdAt: response.Job.CreatedAt,
          estimatedCompletion: new Date(Date.now() + estimatedMinutes * 60 * 1000),
          processingType: "MULTI_QUALITY",
          outputQualities: qualitySettings.map(q => q.suffix.replace('_', '')),
          thumbnailTypes: ["thumbnail_large", "thumbnail_small"],
          sourceAnalysis: {
              is4K,
              isHD,
              isVertical,
              sourceResolution: `${sourceWidth}x${sourceHeight}`
          }
      };

  } catch (error) {
      console.error(`❌ TRANSCODING JOB CREATION FAILED for ${assetId}`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Full error:`, error);
      
      if (error.name === 'BadRequestException') {
          console.error('   💡 Suggestion: Check Transcode job settings configuration');
      } else if (error.name === 'UnauthorizedOperation') {
          console.error('   💡 Suggestion: Check Transcode service role permissions');
      } else if (error.name === 'TooManyRequestsException') {
          console.error('   💡 Suggestion: Transcode queue is busy, try again later');
      }
      
      // Don't throw - let the video asset remain available in original format
      return {
          error: true,
          errorMessage: error.message,
          errorType: error.name,
          fallbackAvailable: true
      };
  }
}


export const handler = async (event) => {
  const startTime = Date.now();
  let tempFilePath = null;
  let assetId = null;

  try {
    // Parse event body
    let body;
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else if (typeof event.body === 'object') {
      body = event.body;
    } else {
      body = event; // Direct invocation
    }

    const { assetId: requestAssetId, userId, subtype } = body;
    assetId = requestAssetId;


    if (!assetId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Metadata extraction failed",
          error: "assetId is required"
        })
      };
    }

    // Get asset from database
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
        body: JSON.stringify({ message: "Asset not found" })
      };
    }


    // Get user details
    const userIdToLookup = userId || asset.userId;
    let userFullName = "Unknown";
    
    if (userIdToLookup) {
      try {
        const user = await getUserDetails(userIdToLookup);
        if (user) {
          userFullName = user.fullName || user.email || `User ${userIdToLookup.slice(0, 8)}`;
        }
      } catch (userError) {
        console.warn(`Could not fetch user: ${userError.message}`);
        userFullName = `Unknown User (${userIdToLookup.slice(0, 8)})`;
      }
    }

    // Determine asset type
    const isVideo = asset.isVideo || asset.type?.startsWith('video/');
    const isImage = asset.type?.startsWith('image/');
    const isAudio = asset.type?.startsWith('audio/');
    const isMp3 = asset.type === 'audio/mpeg' || asset.type === 'audio/mp3' || 
                 asset.url?.toLowerCase().endsWith('.mp3');

    if (!isVideo && !isImage && !isAudio) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Asset must be a video, image, or audio file"
        })
      };
    }

    const assetType = isVideo ? 'video' : (isImage ? 'image' : 'audio');

    // Handle very large files (basic metadata only)
    const key = asset.url.split('/').pop();
    let fileSize = 0;
    
    try {
      const headCommand = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
      const headResult = await s3Client.send(headCommand);
      fileSize = headResult.ContentLength;
      
      
      // 5GB limit for detailed processing
      if (fileSize > 5 * 1024 * 1024 * 1024) {
        
        let updateExpression = `SET fileSize = :fileSize, updatedAt = :updatedAt`;
        const expressionAttributeValues = {
          ":fileSize": fileSize, 
          ":updatedAt": new Date().toISOString()
        };
        let expressionAttributeNames = {};
        
        if (userId) {
          updateExpression += `, userId = :userId`;
          expressionAttributeValues[":userId"] = userId;
        }
        if (subtype) {
          updateExpression += `, #subtype = :subtype`;
          expressionAttributeNames["#subtype"] = "subtype";
          expressionAttributeValues[":subtype"] = subtype;
        }

        const updateCommand = new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { assetId },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ...(Object.keys(expressionAttributeNames).length > 0 && {
            ExpressionAttributeNames: expressionAttributeNames
          })
        });
        await docClient.send(updateCommand);

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Basic metadata extracted (very large file)",
            assetId, assetType,
            extractedMetadata: {
              fileSize,
              format: headResult.ContentType?.split('/')[1] || "Unknown",
              status: "basic_metadata_only_large_file"
            },
            previewUrl: isVideo ? asset.url : (isImage ? asset.url : (isMp3 ? null : asset.url)),
            uploadedBy: userFullName,
            processingTime: `${Date.now() - startTime}ms`
          })
        };
      }
    } catch (headError) {
      console.warn(`Could not get file size: ${headError.message}`);
    }

    // Download file and extract detailed metadata
    const ffprobePath = findFFprobePath();

    // Extract metadata based on file type
    let extractedMetadata;
    if (!ffprobePath) {
      extractedMetadata = {};
    } else {
    tempFilePath = `/tmp/${Date.now()}_${key}`;
    await downloadFileFromS3(BUCKET_NAME, key, tempFilePath);
    if (isVideo) {
      extractedMetadata = await extractVideoMetadata(tempFilePath, ffprobePath);
    } else if (isImage) {
      extractedMetadata = await extractImageMetadata(tempFilePath, ffprobePath);
    } else {
      extractedMetadata = await extractAudioMetadata(tempFilePath, ffprobePath);
    }
    }


   

    // Prepare database update
    let updateExpression = `SET fileSize = :fileSize, metadata = :metadata, updatedAt = :updatedAt`;
    let expressionAttributeNames = {};
    
    const expressionAttributeValues = {
      ":fileSize": extractedMetadata.fileSize || fileSize || 0,
      ":metadata": {
        ...((isVideo || isAudio) && {
          duration: extractedMetadata.duration || 0,
          durationFormatted: formatDuration(extractedMetadata.duration || 0)
        }),
        ...((isVideo || isImage) && {
          dimensions: extractedMetadata.dimensions || "Unknown"
        }),
        format: extractedMetadata.format || "Unknown",
        extractionSuccessful: true,
        extractedAt: new Date().toISOString(),
        assetType,
        ...(extractedMetadata.video && { video: extractedMetadata.video }),
        ...(extractedMetadata.audio && { audio: extractedMetadata.audio }),
        ...(extractedMetadata.image && { image: extractedMetadata.image })
      },
      ":updatedAt": new Date().toISOString()
    };

    if (userId) {
      updateExpression += `, userId = :userId`;
      expressionAttributeValues[":userId"] = userId;
    }
    
    if (subtype) {
      updateExpression += `, #subtype = :subtype`;
      expressionAttributeNames["#subtype"] = "subtype";
      expressionAttributeValues[":subtype"] = subtype;
    }
     //For AI metadata
     let analysisResults = null;
     if (isImage && isEnabled('analysis')) {
      analysisResults = {};

      try {

        const [labels, moderation, text] = await Promise.all([
          detectLabels(key, 70).catch(err => {
            console.error('❌ Label detection failed:', err.message);
            return { error: err.message, labels: [], totalLabels: 0 };
          }),
          detectModeration(key).catch(err => {
            console.error('❌ Moderation API failed:', err.message);
            return { error: err.message, isSafe: null, riskLevel: 'UNKNOWN' };
          }),
          // recognizeCelebrities(key).catch(err => { // removed: celebrity detection feature deprecated
          //   console.error('❌ Celebrity API failed:', err.message);
          //   return { error: err.message, celebrities: [], totalCelebrities: 0 };
          // }),
          detectText(key).catch(err => {
            console.error('❌ Text detection API failed:', err.message);
            return { error: err.message, fullText: '', totalLines: 0 };
          })
        ]);


        if (labels && !labels.error) {
          analysisResults.labels = labels;
        } else {
          analysisResults.labels = {
            error: labels?.error || 'Unknown error',
            labels: [],
            totalLabels: 0
          };
          console.warn('⚠️ Label detection failed');
        }
        
        if (moderation && !moderation.error) {
          analysisResults.moderation = moderation;
        } else {
          analysisResults.moderation = {
            error: moderation?.error || 'Unknown error',
            isSafe: null,
            riskLevel: 'UNKNOWN'
          };
          console.warn('⚠️ Moderation failed or returned invalid data');
        }
        
        // Process celebrity results (removed: celebrity detection feature deprecated)
        // if (celebrities && !celebrities.error) {
        //   analysisResults.celebrities = celebrities;
        //   if (celebrities.totalCelebrities > 0) {
        //   } else {
        //   }
        // } else {
        //   analysisResults.celebrities = {
        //     error: celebrities?.error || 'Unknown error',
        //     celebrities: [],
        //     totalCelebrities: 0
        //   };
        //   console.warn('⚠️ Celebrity detection failed or returned invalid data');
        // }
        
        // Process text results
        if (text && !text.error) {
          analysisResults.text = text;
          if (text.totalLines > 0) {
          } else {
          }
        } else {
          analysisResults.text = {
            error: text?.error || 'Unknown error',
            fullText: '',
            totalLines: 0,
            totalWords: 0
          };
          console.warn('⚠️ Text detection failed or returned invalid data');
        }
        
        // Summary log

        // Extract AI tags from ImageAnalysis results (for images)
        let aiTags = [];

        if (labels && labels.labels && Array.isArray(labels.labels)) {
          const labelNames = labels.labels.map((l) => l.name);
          const highConfidence = labels.labels
            .filter((l) => l.confidence > 90)
            .map((l) => l.name);

          aiTags = [...new Set([ ...highConfidence])];
        }

        // Also include text (if detected)
        if (text?.fullText && text.fullText.trim()) {
          aiTags.push(text.fullText.trim());
        }

        // ✅ Save tags in backend structure
        updateExpression += `, #tags = :tags`;
        expressionAttributeNames["#tags"] = "tags";
        expressionAttributeValues[":tags"] = {
          aiTags,
          customTags: [] // empty for now; frontend will later update this
        };


        const metadataToSave = {
          assetId: assetId,
          fileName: asset.fileName,
          fileUrl:asset.url,
          extractedAt: new Date().toISOString(),
          uploadedBy: userFullName,
          extractedMetadata: extractedMetadata,
          imageAnalysis: analysisResults
        };
        const metadataS3Key = `${assetId}-metadata.json`;

        const saveCommand = new PutObjectCommand({
          Bucket: REKOGNITION_BUCKET_NAME,
          Key: metadataS3Key,
          Body: JSON.stringify(metadataToSave, null, 2),
          ContentType: "application/json",
          Metadata: {
            assetId,
            fileName: asset.name,
            extractedAt: new Date().toISOString(),
          },
        });

        // 👇 THIS is the important part
        await s3Client.send(saveCommand);
        
      } catch (error) {
        console.error('❌ CRITICAL: AI analysis failed completely:', error);
        analysisResults.error = error.message;
      }

      updateExpression += `, imageAnalysis = :analysis`;
      expressionAttributeValues[":analysis"] = analysisResults;
    }

//  VIDEO AI ANALYSIS
let videoAnalysisJobs = null;

if (isVideo && !isMp3 && isEnabled('analysis')) {

  try {
    const analysisTypes = ["labels", "moderation", "text"]; // "celebrities" removed: celebrity detection feature deprecated
    videoAnalysisJobs = await startVideoAnalysis(key, analysisTypes);

    if (videoAnalysisJobs && !videoAnalysisJobs.error) {
      
      // Add to database
      updateExpression += `, videoAnalysisJobs = :videoJobs, videoAnalysisStatus = :videoStatus, videoAnalysisStartedAt = :videoStartedAt`;
      expressionAttributeValues[":videoJobs"] = videoAnalysisJobs.jobs;
      expressionAttributeValues[":videoStatus"] = videoAnalysisJobs.status;
      expressionAttributeValues[":videoStartedAt"] = new Date().toISOString();
    } else {
      console.warn('Video analysis failed to start:', videoAnalysisJobs?.error);
      updateExpression += `, videoAnalysisStatus = :videoStatus, videoAnalysisError = :videoError`;
      expressionAttributeValues[":videoStatus"] = "FAILED";
      expressionAttributeValues[":videoError"] = videoAnalysisJobs?.error || 'Unknown error';
    }
  } catch (videoError) {
    console.error(' Video analysis error:', videoError);
    updateExpression += `, videoAnalysisStatus = :videoStatus, videoAnalysisError = :videoError`;
    expressionAttributeValues[":videoStatus"] = "ERROR";
    expressionAttributeValues[":videoError"] = videoError.message;
  }

}


    // 🎬 AUTOMATIC VIDEO TRANSCODING INTEGRATION
    let transcodingResult = null;
    if (isVideo && !isMp3) {
        
        if (process.env.TRANSCODE_ROLE_ARN && process.env.TRANSCODE_ENDPOINT) {
            try {
                
                transcodingResult = await createMultiQualityTranscodingJob(
                    assetId,
                    key,
                    extractedMetadata.fileSize || fileSize,
                    extractedMetadata.duration,
                    extractedMetadata.dimensions,
                    extractedMetadata.video
                );

                if (transcodingResult && !transcodingResult.error) {
                    // Success - add transcoding info to database
                    updateExpression += `, transcodeJobId = :jobId, transcodingStatus = :transcodingStatus, transcodingStartedAt = :transcodingStartedAt, processingType = :processingType, estimatedCompletion = :estimatedCompletion, outputQualities = :outputQualities`;
                    
                    expressionAttributeValues[":jobId"] = transcodingResult.jobId;
                    expressionAttributeValues[":transcodingStatus"] = "SUBMITTED";
                    expressionAttributeValues[":transcodingStartedAt"] = new Date().toISOString();
                    expressionAttributeValues[":processingType"] = transcodingResult.processingType;
                    expressionAttributeValues[":estimatedCompletion"] = transcodingResult.estimatedCompletion.toISOString();
                    expressionAttributeValues[":outputQualities"] = transcodingResult.outputQualities;
                    
                } else if (transcodingResult && transcodingResult.error) {
                    // Error but graceful fallback
                    updateExpression += `, transcodingStatus = :transcodingStatus, transcodingError = :transcodingError, transcodingErrorType = :transcodingErrorType`;
                    expressionAttributeValues[":transcodingStatus"] = "ERROR";
                    expressionAttributeValues[":transcodingError"] = transcodingResult.errorMessage;
                    expressionAttributeValues[":transcodingErrorType"] = transcodingResult.errorType;
                }
            } catch (transcodingError) {
                console.error(`❌ CRITICAL TRANSCODING ERROR:`, transcodingError);
                // Still save the error but don't fail the entire process
                updateExpression += `, transcodingStatus = :transcodingStatus, transcodingError = :transcodingError`;
                expressionAttributeValues[":transcodingStatus"] = "CRITICAL_ERROR";
                expressionAttributeValues[":transcodingError"] = transcodingError.message;
            }
        } else {
        }
    }

    // Update database with all metadata and transcoding info
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames
      })
    });

    await docClient.send(updateCommand);

    const elapsed = Date.now() - startTime;

    // Build response based on transcoding result
    const response = {
      message: transcodingResult && !transcodingResult.error ? 
        "Metadata extracted and automatic video transcoding initiated" : 
        transcodingResult && transcodingResult.error ?
        "Metadata extracted successfully (transcoding failed, original available)" :
        "Metadata extracted successfully",
      assetId, 
      assetType,
      extractedMetadata: {
        fileSize: extractedMetadata.fileSize || fileSize || 0,
        ...((isVideo || isAudio) && {
          duration: extractedMetadata.duration || 0,
          durationFormatted: formatDuration(extractedMetadata.duration || 0)
        }),
        ...((isVideo || isImage) && {
          dimensions: extractedMetadata.dimensions || "Unknown"
        }),
        format: extractedMetadata.format || "Unknown",
        ...(extractedMetadata.video && { video: extractedMetadata.video }),
        ...(extractedMetadata.audio && { audio: extractedMetadata.audio }),
        ...(extractedMetadata.image && { image: extractedMetadata.image })
      },
      previewUrl: isVideo ? asset.url : (isImage ? asset.url : (isMp3 ? null : asset.url)),
      uploadedBy: userFullName,
      processingTime: `${elapsed}ms`
    };
    if (analysisResults) {
      response.imageAnalysis = analysisResults;
    }
    if (videoAnalysisJobs && !videoAnalysisJobs.error) {
      response.videoAnalysis = {
        status: videoAnalysisJobs.status,
        jobs: videoAnalysisJobs.jobs,
        totalJobs: videoAnalysisJobs.totalJobs,
        message: "Video AI analysis started. Use getVideoAnalysis API to retrieve results."
      };
    }
    

    // Add transcoding information if applicable
    if (transcodingResult && !transcodingResult.error) {
      response.transcoding = {
        jobId: transcodingResult.jobId,
        status: transcodingResult.status,
        processingType: transcodingResult.processingType,
        estimatedCompletion: transcodingResult.estimatedCompletion,
        outputLocations: {
          videos: `s3://${BUCKET_NAME}/processed/${assetId}/videos/`,
          thumbnails: `s3://${BUCKET_NAME}/processed/${assetId}/thumbnails/`
        },
        outputQualities: transcodingResult.outputQualities,
        thumbnailTypes: transcodingResult.thumbnailTypes,
        sourceAnalysis: transcodingResult.sourceAnalysis,
        message: `Multi-quality transcoding in progress (${transcodingResult.outputQualities.length} qualities)`
      };
    } else if (transcodingResult && transcodingResult.error) {
      response.transcoding = {
        status: "ERROR",
        error: transcodingResult.errorMessage,
        errorType: transcodingResult.errorType,
        fallbackAvailable: true,
        message: "Transcoding failed - original video remains available"
      };
    }

    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response)
    };
    

  } catch (err) {
    console.error(`❌ METADATA EXTRACTION FAILED:`, err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Metadata extraction failed",
        error: err.message,
        assetId, 
        processingTime: `${Date.now() - startTime}ms`
      })
    };
  } finally {
    // Cleanup
    if (tempFilePath && existsSync(tempFilePath)) {
      try { 
        unlinkSync(tempFilePath); 
      } catch (e) {
        console.warn(`Warning: Could not clean up temp file: ${e.message}`);
      }
    }
  }
};

// Helper Functions (keeping your existing ones)
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getUserDetails(userId) {
  // Users live in Postgres; same { userId, fullName, email, role } shape as before.
  const [user] = await db
    .select({ userId: users.userId, fullName: users.fullName, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  return user || null;
}

async function downloadFileFromS3(bucket, key, localPath) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const writeStream = createWriteStream(localPath);
  await pipeline(response.Body, writeStream);
}

async function extractVideoMetadata(filePath, ffprobePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath]);
    let stdout = '';
    ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
    ffprobe.on('close', (code) => {
      if (code !== 0) { reject(new Error(`FFprobe failed with code ${code}`)); return; }
      try {
        const probeData = JSON.parse(stdout);
        const fileSize = statSync(filePath).size;
        const videoStream = probeData.streams?.find(s => s.codec_type === 'video');
        const audioStream = probeData.streams?.find(s => s.codec_type === 'audio');
        
        resolve({
          fileSize,
          duration: parseFloat(probeData.format?.duration) || 0,
          dimensions: videoStream ? `${videoStream.width || 0}x${videoStream.height || 0}` : "Unknown",
          format: probeData.format?.format_name || "Unknown",
          video: videoStream ? { 
            codec: videoStream.codec_name || "Unknown", 
            width: videoStream.width || 0, 
            height: videoStream.height || 0,
            frameRate: videoStream.r_frame_rate || "Unknown",
            bitrate: videoStream.bit_rate || "Unknown"
          } : null,
          audio: audioStream ? { 
            codec: audioStream.codec_name || "Unknown", 
            sampleRate: audioStream.sample_rate ? `${audioStream.sample_rate} Hz` : "Unknown", 
            channels: audioStream.channels === 2 ? "stereo" : (audioStream.channels === 1 ? "mono" : `${audioStream.channels} channels`), 
            bitrate: audioStream.bit_rate ? `${Math.round(audioStream.bit_rate / 1000)} kbps` : "Unknown" 
          } : null
        });
      } catch (parseError) {
        reject(new Error(`Failed to parse FFprobe output: ${parseError.message}`));
      }
    });
    setTimeout(() => { ffprobe.kill('SIGKILL'); reject(new Error('FFprobe timeout')); }, 60000); // Increased to 60s
  });
}

async function extractImageMetadata(filePath, ffprobePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath]);
    let stdout = '';
    ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
    ffprobe.on('close', (code) => {
      if (code !== 0) { reject(new Error(`FFprobe failed with code ${code}`)); return; }
      try {
        const probeData = JSON.parse(stdout);
        const fileSize = statSync(filePath).size;
        const imageStream = probeData.streams?.[0];
        
        const getImageFormat = () => {
          const formatName = probeData.format?.format_name;
          if (formatName) {
            if (formatName.includes('jpeg') || formatName.includes('jpg')) return 'jpeg';
            if (formatName.includes('png')) return 'png';
            if (formatName.includes('gif')) return 'gif';
            if (formatName.includes('webp')) return 'webp';
          }
          const codecName = imageStream?.codec_name;
          if (codecName === 'mjpeg') return 'jpeg';
          return codecName || 'Unknown';
        };
        
        resolve({
          fileSize,
          dimensions: imageStream ? `${imageStream.width || 0}x${imageStream.height || 0}` : "Unknown",
          format: getImageFormat(),
          image: imageStream ? { 
            width: imageStream.width || 0, 
            height: imageStream.height || 0, 
            colorSpace: imageStream.pix_fmt || "Unknown" 
          } : null
        });
      } catch (parseError) {
        reject(new Error(`Failed to parse FFprobe output: ${parseError.message}`));
      }
    });
    setTimeout(() => { ffprobe.kill('SIGKILL'); reject(new Error('FFprobe timeout')); }, 30000);
  });
}

async function extractAudioMetadata(filePath, ffprobePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath]);
    let stdout = '';
    ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
    ffprobe.on('close', (code) => {
      if (code !== 0) { reject(new Error(`FFprobe failed with code ${code}`)); return; }
      try {
        const probeData = JSON.parse(stdout);
        const fileSize = statSync(filePath).size;
        const audioStream = probeData.streams?.find(s => s.codec_type === 'audio') || probeData.streams?.[0];
        
        resolve({
          fileSize,
          duration: parseFloat(probeData.format?.duration) || 0,
          format: probeData.format?.format_name || audioStream?.codec_name || "Unknown",
          audio: audioStream ? { 
            codec: audioStream.codec_name || "Unknown", 
            sampleRate: audioStream.sample_rate ? `${audioStream.sample_rate} Hz` : "Unknown", 
            channels: audioStream.channels === 2 ? "stereo" : (audioStream.channels === 1 ? "mono" : `${audioStream.channels} channels`), 
            bitrate: audioStream.bit_rate ? `${Math.round(audioStream.bit_rate / 1000)} kbps` : (probeData.format?.bit_rate ? `${Math.round(probeData.format.bit_rate / 1000)} kbps` : "Unknown") 
          } : null
        });
      } catch (parseError) {
        reject(new Error(`Failed to parse FFprobe output: ${parseError.message}`));
      }
    });
    setTimeout(() => { ffprobe.kill('SIGKILL'); reject(new Error('FFprobe timeout')); }, 30000);
  });
}

