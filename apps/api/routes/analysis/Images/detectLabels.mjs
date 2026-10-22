import { analysisClient } from '../../analysis/analysisClient.mjs';
import { DetectLabelsCommand } from "@aws-sdk/client-rekognition";

const BUCKET_NAME = process.env.DAM_BUCKET_NAME;

export const detectLabels = async (s3Key, minConfidence = 70) => {
  console.log(' Running label detection on:', s3Key);
  
  try {
    const params = {
      Image: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: s3Key
        }
      },
      MaxLabels: 50,
      MinConfidence: minConfidence
    };

    const response = await analysisClient.send(new DetectLabelsCommand(params));
    
    console.log('✅ Label detection API response received');
    
    const labels = response.Labels.map(label => ({
      name: label.Name,
      confidence: Math.round(label.Confidence * 100) / 100,
      categories: label.Categories?.map(c => c.Name) || [],
      instances: label.Instances?.length || 0,
      parents: label.Parents?.map(p => p.Name) || []
    }));

    console.log('📊 Label result:', { totalLabels: labels.length });
    console.log('🏷️ Top 5 labels:', labels.slice(0, 5).map(l => `${l.name} (${l.confidence}%)`).join(', '));

    return {
      labels,
      totalLabels: labels.length
    };

  } catch (err) {
    console.error("❌ Label detection failed:", err.message);
    return { 
      error: err.message,
      labels: [],
      totalLabels: 0
    };
  }
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { s3Key, minConfidence = 70 } = body;

    console.log('🚀 Label Detection API called');
    console.log('📋 Parameters:', { s3Key, minConfidence });

    if (!s3Key) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "s3Key is required" })
      };
    }

    const result = await detectLabels(s3Key, minConfidence);

    if (result.error) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: result.error,
          message: "Label detection failed"
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Labels detected successfully",
        ...result
      })
    };

  } catch (err) {
    console.error('❌ API Handler Error:', err.message);
    
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Label detection failed",
        error: err.message
      })
    };
  }
};
