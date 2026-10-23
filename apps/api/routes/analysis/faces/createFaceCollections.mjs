import { analysisClient } from '../../analysis/analysisClient.mjs';
import { CreateCollectionCommand } from "@aws-sdk/client-rekognition";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { collectionId = "OpenPress-faces" } = body;


    const command = new CreateCollectionCommand({
      CollectionId: collectionId
    });

    const response = await analysisClient.send(command);
    

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Face collection created successfully",
        collectionId,
        collectionArn: response.CollectionArn,
        faceModelVersion: response.FaceModelVersion,
        statusCode: response.StatusCode
      })
    };

  } catch (err) {
    console.error("❌ Face collection creation failed:", err.message);
    
    if (err.name === 'ResourceAlreadyExistsException') {
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "Collection already exists",
          message: `Face collection '${JSON.parse(event.body).collectionId || "OpenPress-faces"}' already exists`,
          errorType: "ALREADY_EXISTS"
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
