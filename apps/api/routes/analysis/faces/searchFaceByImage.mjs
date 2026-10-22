import { analysisClient } from '../../analysis/analysisClient.mjs';
import { SearchFacesByImageCommand } from "@aws-sdk/client-rekognition";

const BUCKET_NAME = process.env.DAM_BUCKET_NAME;

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { 
      s3Key, 
      collectionId = "OpenPress-faces",
      maxFaces = 10,
      threshold = 80
    } = body;

    console.log('🔍 Searching for faces');
    console.log('   Collection:', collectionId);
    console.log('   S3 Key:', s3Key);
    console.log('   Threshold:', threshold);

    if (!s3Key) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "s3Key is required",
          message: "Please provide the S3 key of the image to search"
        })
      };
    }

    const command = new SearchFacesByImageCommand({
      CollectionId: collectionId,
      Image: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: s3Key
        }
      },
      MaxFaces: maxFaces,
      FaceMatchThreshold: threshold
    });

    const response = await analysisClient.send(command);
    
    const faceMatches = response.FaceMatches.map(match => ({
      personName: match.Face.ExternalImageId,
      faceId: match.Face.FaceId,
      imageId: match.Face.ImageId,
      similarity: Math.round(match.Similarity * 100) / 100,
      confidence: Math.round(match.Face.Confidence * 100) / 100
    }));

    console.log('✅ Search complete');
    console.log('   Matches found:', faceMatches.length);
    if (faceMatches.length > 0) {
      console.log('   Top match:', faceMatches[0].personName, `(${faceMatches[0].similarity}% similar)`);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: faceMatches.length > 0 ? 
          `Found ${faceMatches.length} matching face(s)` : 
          "No matching faces found",
        faceMatches,
        totalMatches: faceMatches.length,
        searchedFace: response.SearchedFaceBoundingBox,
        searchedFaceConfidence: response.SearchedFaceConfidence
      })
    };

  } catch (err) {
    console.error("❌ Face search failed:", err.message);
    
    if (err.name === 'ResourceNotFoundException') {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Collection not found or empty",
          message: `Face collection '${JSON.parse(event.body).collectionId || "OpenPress-faces"}' does not exist or has no faces. Add faces first.`,
          errorType: "COLLECTION_NOT_FOUND"
        })
      };
    } else if (err.name === 'InvalidParameterException') {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "No face detected in search image",
          message: "The image must contain at least one clear, frontal face to search.",
          errorType: "NO_FACE_DETECTED"
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
