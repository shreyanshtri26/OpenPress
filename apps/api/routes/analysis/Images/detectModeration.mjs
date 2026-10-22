import { analysisClient } from '../../analysis/analysisClient.mjs';
import { DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";

const BUCKET_NAME = process.env.DAM_BUCKET_NAME;

export const detectModeration = async (s3Key, minConfidence = 60) => {
    try {
      const params = {
        Image: {
          S3Object: {
            Bucket: BUCKET_NAME,
            Name: s3Key
          }
        },
        MinConfidence: minConfidence
      };
  
      const response = await analysisClient.send(new DetectModerationLabelsCommand(params));
      
      const moderationLabels = response.ModerationLabels.map(label => ({
        name: label.Name,
        parentName: label.ParentName,
        confidence: Math.round(label.Confidence * 100) / 100
      }));
  
      const isSafe = moderationLabels.length === 0;
      const riskLevel = moderationLabels.length === 0 ? "SAFE" :
                       moderationLabels.some(l => l.confidence > 90) ? "HIGH_RISK" :
                       moderationLabels.some(l => l.confidence > 75) ? "MEDIUM_RISK" : "LOW_RISK";
  
      return {
        isSafe,
        riskLevel,
        labels: moderationLabels,
        totalFlags: moderationLabels.length
      };
  
    } catch (err) {
      console.error("Moderation detection failed:", err);
      return { error: err.message };
    }
  };
  export const handler = async (event) => {
    try {
      const body = JSON.parse(event.body);
      const { s3Key, minConfidence = 60 } = body;
  
      if (!s3Key) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "s3Key is required" })
        };
      }
  
      const result = await detectModeration(s3Key, minConfidence);
  
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