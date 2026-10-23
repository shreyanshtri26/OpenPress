import { analysisClient } from '../../analysis/analysisClient.mjs';
import {
  StartLabelDetectionCommand,
  StartContentModerationCommand,
  // StartCelebrityRecognitionCommand, // removed: celebrity detection feature deprecated
  StartTextDetectionCommand
} from "@aws-sdk/client-rekognition";

const BUCKET_NAME = process.env.DAM_BUCKET_NAME;

export const startVideoAnalysis = async (s3Key, analysisTypes = ["labels", "moderation", "text"]) => { // "celebrities" removed: celebrity detection feature deprecated

  try {
    const jobs = {};
    const video = {
      S3Object: {
        Bucket: BUCKET_NAME,
        Name: s3Key
      }
    };

    if (analysisTypes.includes("labels")) {
      try {
        const command = new StartLabelDetectionCommand({
          Video: video,
          MinConfidence: 70
        });
        const response = await analysisClient.send(command);
        jobs.labelDetection = response.JobId;
      } catch (err) {
        console.error('❌ Label detection job failed:', err.message);
        jobs.labelDetection = { error: err.message };
      }
    }

    // Start content moderation
    if (analysisTypes.includes("moderation")) {
      try {
        const command = new StartContentModerationCommand({
          Video: video,
          MinConfidence: 60
        });
        const response = await analysisClient.send(command);
        jobs.contentModeration = response.JobId;
      } catch (err) {
        console.error('❌ Content moderation job failed:', err.message);
        jobs.contentModeration = { error: err.message };
      }
    }
    // if (analysisTypes.includes("celebrities")) { // removed: celebrity detection feature deprecated
    //   try {
    //     const command = new StartCelebrityRecognitionCommand({
    //       Video: video
    //     });
    //     const response = await analysisClient.send(command);
    //     jobs.celebrityRecognition = response.JobId;
    //   } catch (err) {
    //     console.error('❌ Celebrity recognition job failed:', err.message);
    //     jobs.celebrityRecognition = { error: err.message };
    //   }
    // }

    if (analysisTypes.includes("text")) {
      try {
        const command = new StartTextDetectionCommand({
          Video: video
        });
        const response = await analysisClient.send(command);
        jobs.textDetection = response.JobId;
      } catch (err) {
        console.error('❌ Text detection job failed:', err.message);
        jobs.textDetection = { error: err.message };
      }
    }

    return {
      jobs,
      status: "IN_PROGRESS",
      totalJobs: Object.keys(jobs).length,
      message: "Video analysis jobs started successfully"
    };

  } catch (err) {
    console.error("Video analysis start failed:", err);
    return {
      error: err.message,
      jobs: {},
      status: "FAILED"
    };
  }
};

// API Handler
export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { s3Key, analysisTypes } = body;

    if (!s3Key) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "s3Key is required" })
      };
    }

    const result = await startVideoAnalysis(s3Key, analysisTypes);

    if (result.error) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: result.error })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
