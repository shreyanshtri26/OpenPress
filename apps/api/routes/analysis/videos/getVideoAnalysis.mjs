import { analysisClient } from '../../analysis/analysisClient.mjs';
import {
  GetLabelDetectionCommand,
  GetContentModerationCommand,
  // GetCelebrityRecognitionCommand, // removed: celebrity detection feature deprecated
  GetTextDetectionCommand
} from "@aws-sdk/client-rekognition";

export const getVideoAnalysis = async (jobs) => {
  
  try {
    const results = {};

    if (jobs.labelDetection && typeof jobs.labelDetection === 'string') {
      try {
        const command = new GetLabelDetectionCommand({
          JobId: jobs.labelDetection
        });
        const response = await analysisClient.send(command);
        
        results.labels = {
          status: response.JobStatus,
          labels: response.JobStatus === "SUCCEEDED" ? 
            response.Labels.map(item => ({
              timestamp: item.Timestamp,
              label: {
                name: item.Label.Name,
                confidence: Math.round(item.Label.Confidence * 100) / 100
              }
            })).slice(0, 50) : [], 
          totalLabels: response.Labels?.length || 0
        };
      } catch (err) {
        console.error('❌ Get labels failed:', err.message);
        results.labels = { status: "ERROR", error: err.message };
      }
    }

    if (jobs.contentModeration && typeof jobs.contentModeration === 'string') {
      try {
        const command = new GetContentModerationCommand({
          JobId: jobs.contentModeration
        });
        const response = await analysisClient.send(command);
        
        results.moderation = {
          status: response.JobStatus,
          labels: response.JobStatus === "SUCCEEDED" ?
            response.ModerationLabels.map(item => ({
              timestamp: item.Timestamp,
              label: {
                name: item.ModerationLabel.Name,
                parentName: item.ModerationLabel.ParentName,
                confidence: Math.round(item.ModerationLabel.Confidence * 100) / 100
              }
            })).slice(0, 50) : [],
          totalFlags: response.ModerationLabels?.length || 0,
          isSafe: response.ModerationLabels?.length === 0
        };
      } catch (err) {
        console.error('❌ Get moderation failed:', err.message);
        results.moderation = { status: "ERROR", error: err.message };
      }
    }

    // if (jobs.celebrityRecognition && typeof jobs.celebrityRecognition === 'string') { // removed: celebrity detection feature deprecated
    //   try {
    //     const command = new GetCelebrityRecognitionCommand({
    //       JobId: jobs.celebrityRecognition
    //     });
    //     const response = await analysisClient.send(command);
    //     
    //     results.celebrities = {
    //       status: response.JobStatus,
    //       celebrities: response.JobStatus === "SUCCEEDED" ?
    //         response.Celebrities.map(item => ({
    //           timestamp: item.Timestamp,
    //           celebrity: {
    //             name: item.Celebrity.Name,
    //             confidence: Math.round(item.Celebrity.Confidence * 100) / 100,
    //             urls: item.Celebrity.Urls || []
    //           }
    //         })).slice(0, 50) : [],
    //       totalCelebrities: response.Celebrities?.length || 0
    //     };
    //   } catch (err) {
    //     console.error('❌ Get celebrities failed:', err.message);
    //     results.celebrities = { status: "ERROR", error: err.message };
    //   }
    // }

    if (jobs.textDetection && typeof jobs.textDetection === 'string') {
      try {
        const command = new GetTextDetectionCommand({
          JobId: jobs.textDetection
        });
        const response = await analysisClient.send(command);
        
        results.text = {
          status: response.JobStatus,
          text: response.JobStatus === "SUCCEEDED" ?
            response.TextDetections.map(item => ({
              timestamp: item.Timestamp,
              text: {
                detectedText: item.TextDetection.DetectedText,
                type: item.TextDetection.Type,
                confidence: Math.round(item.TextDetection.Confidence * 100) / 100
              }
            })).slice(0, 50) : [],
          totalDetections: response.TextDetections?.length || 0
        };
      } catch (err) {
        console.error('❌ Get text failed:', err.message);
        results.text = { status: "ERROR", error: err.message };
      }
    }

    const allStatuses = Object.values(results).map(r => r.status);
    const overallStatus = allStatuses.every(s => s === "SUCCEEDED") ? "COMPLETED" :
                         allStatuses.some(s => s === "IN_PROGRESS") ? "IN_PROGRESS" :
                         allStatuses.some(s => s === "FAILED") ? "FAILED" : "UNKNOWN";

    return {
      status: overallStatus,
      results,
      message: `Video analysis ${overallStatus.toLowerCase()}`
    };

  } catch (err) {
    console.error("Get video analysis failed:", err);
    return {
      error: err.message,
      status: "ERROR"
    };
  }
};

// API Handler
export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { jobs } = body;

    if (!jobs || typeof jobs !== 'object') {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "jobs object is required" })
      };
    }

    const result = await getVideoAnalysis(jobs);

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
