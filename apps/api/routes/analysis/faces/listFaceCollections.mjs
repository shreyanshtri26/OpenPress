import { analysisClient } from '../../analysis/analysisClient.mjs';
import { 
  ListCollectionsCommand, 
  DescribeCollectionCommand,
  ListFacesCommand 
} from "@aws-sdk/client-rekognition";

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { collectionId, maxResults = 100 } = body;


    // If collectionId provided, list faces in that collection
    if (collectionId) {
      
      const command = new ListFacesCommand({
        CollectionId: collectionId,
        MaxResults: maxResults
      });
      
      const response = await analysisClient.send(command);

      const faces = response.Faces.map(face => ({
        faceId: face.FaceId,
        imageId: face.ImageId,
        personName: face.ExternalImageId,
        confidence: Math.round(face.Confidence * 100) / 100,
        boundingBox: face.BoundingBox
      }));


      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId,
          faces,
          totalFaces: faces.length,
          faceModelVersion: response.FaceModelVersion
        })
      };
    }

    // Otherwise, list all collections
    
    const listCommand = new ListCollectionsCommand({});
    const listResponse = await analysisClient.send(listCommand);

    const collections = [];
    
    // Get details for each collection
    for (const id of listResponse.CollectionIds || []) {
      try {
        const describeCommand = new DescribeCollectionCommand({
          CollectionId: id
        });
        const details = await analysisClient.send(describeCommand);
        
        collections.push({
          collectionId: id,
          collectionArn: details.CollectionARN,
          faceCount: details.FaceCount,
          faceModelVersion: details.FaceModelVersion,
          createdTimestamp: details.CreationTimestamp
        });
      } catch (err) {
        console.error(`Failed to get details for ${id}:`, err.message);
      }
    }


    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collections,
        totalCollections: collections.length
      })
    };

  } catch (err) {
    console.error("❌ List collections failed:", err.message);
    
    if (err.name === 'ResourceNotFoundException') {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Collection not found",
          message: `Face collection '${JSON.parse(event.body || '{}').collectionId}' does not exist`,
          errorType: "COLLECTION_NOT_FOUND"
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
