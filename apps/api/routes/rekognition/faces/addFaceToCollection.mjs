import { rekogClient } from '../../rekognition/rekognitionClient.mjs';
import { IndexFacesCommand } from "@aws-sdk/client-rekognition";

const BUCKET_NAME = process.env.S3_DAM_BUCKET_NAME;

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { 
      collectionId = "OpenPress-faces", 
      s3Key, 
      personName 
    } = body;

    console.log('👤 Adding face to collection');
    console.log('   Collection:', collectionId);
    console.log('   S3 Key:', s3Key);
    console.log('   Person:', personName);

    if (!s3Key || !personName) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "s3Key and personName are required",
          message: "Please provide both s3Key (image path) and personName (person identifier)"
        })
      };
    }

    const command = new IndexFacesCommand({
      CollectionId: collectionId,
      Image: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: s3Key
        }
      },
      ExternalImageId: personName,
      DetectionAttributes: ["ALL"],
      MaxFaces: 5,
      QualityFilter: "AUTO"
    });

    const response = await rekogClient.send(command);
    
    if (response.FaceRecords.length === 0) {
      console.warn('⚠️ No faces detected in image');
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "No faces detected in the image",
          message: "The image must contain at least one clear, frontal face. Make sure the face is well-lit and not obscured."
        })
      };
    }

    const faces = response.FaceRecords.map(record => ({
      faceId: record.Face.FaceId,
      imageId: record.Face.ImageId,
      confidence: Math.round(record.Face.Confidence * 100) / 100,
      boundingBox: record.Face.BoundingBox,
      quality: {
        brightness: record.FaceDetail?.Quality?.Brightness,
        sharpness: record.FaceDetail?.Quality?.Sharpness
      },
      attributes: {
        ageRange: record.FaceDetail?.AgeRange,
        gender: {
          value: record.FaceDetail?.Gender?.Value,
          confidence: Math.round(record.FaceDetail?.Gender?.Confidence * 100) / 100
        },
        smile: record.FaceDetail?.Smile?.Value,
        eyeglasses: record.FaceDetail?.Eyeglasses?.Value,
        emotions: record.FaceDetail?.Emotions?.slice(0, 3).map(e => ({
          type: e.Type,
          confidence: Math.round(e.Confidence * 100) / 100
        }))
      }
    }));

    console.log('✅ Face(s) added successfully:', faces.length);
    console.log('   Face IDs:', faces.map(f => f.faceId).join(', '));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `${faces.length} face(s) added to collection successfully`,
        collectionId,
        personName,
        s3Key,
        faces,
        totalFaces: faces.length
      })
    };

  } catch (err) {
    console.error("❌ Add face failed:", err.message);
    
    if (err.name === 'ResourceNotFoundException') {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Collection not found",
          message: `Face collection '${JSON.parse(event.body).collectionId || "OpenPress-faces"}' does not exist. Create it first using /createFaceCollection`,
          errorType: "COLLECTION_NOT_FOUND"
        })
      };
    } else if (err.name === 'InvalidParameterException') {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Invalid image",
          message: "The image format is invalid or the face quality is too low. Use a clear, high-quality image.",
          errorType: "INVALID_IMAGE"
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
