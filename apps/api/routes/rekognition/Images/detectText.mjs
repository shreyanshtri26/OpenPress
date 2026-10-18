import { rekogClient } from '../../rekognition/rekognitionClient.mjs';
import { DetectTextCommand } from "@aws-sdk/client-rekognition";

const BUCKET_NAME = process.env.S3_DAM_BUCKET_NAME;

export const detectText = async (s3Key, minConfidence = 80) => {
  try {
    const params = {
      Image: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: s3Key
        }
      }
    };

    const response = await rekogClient.send(new DetectTextCommand(params));
    
    const textDetections = response.TextDetections
      .filter(text => text.Confidence >= minConfidence)
      .map(text => ({
        text: text.DetectedText,
        type: text.Type,
        confidence: Math.round(text.Confidence * 100) / 100
      }));

    const lines = textDetections.filter(t => t.type === "LINE");
    const words = textDetections.filter(t => t.type === "WORD");
    const fullText = lines.map(l => l.text).join(" ");

    return {
      fullText,
      lines,
      words,
      totalLines: lines.length,
      totalWords: words.length
    };

  } catch (err) {
    console.error("Text detection failed:", err);
    return { error: err.message };
  }
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { s3Key, minConfidence = 80 } = body;

    if (!s3Key) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "s3Key is required" })
      };
    }

    const result = await detectText(s3Key, minConfidence);

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
