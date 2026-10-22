import { analysisClient } from '../../analysis/analysisClient.mjs';
import { RecognizeCelebritiesCommand } from "@aws-sdk/client-rekognition";

const BUCKET_NAME = process.env.DAM_BUCKET_NAME;

export const recognizeCelebrities = async (s3Key) => {
  try {
    const params = {
      Image: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: s3Key
        }
      }
    };

    const response = await analysisClient.send(new RecognizeCelebritiesCommand(params));
    
    const celebrities = response.CelebrityFaces.map(celeb => ({
      name: celeb.Name,
      confidence: Math.round(celeb.MatchConfidence * 100) / 100,
      urls: celeb.Urls || []
    }));

    return {
      celebrities,
      totalCelebrities: celebrities.length
    };

  } catch (err) {
    console.error("Celebrity recognition failed:", err);
    return { error: err.message };
  }
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { s3Key } = body;

    if (!s3Key) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "s3Key is required" })
      };
    }

    const result = await recognizeCelebrities(s3Key);

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
