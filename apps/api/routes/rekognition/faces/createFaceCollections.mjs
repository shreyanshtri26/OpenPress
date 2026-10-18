import { rekogClient } from '../../rekognition/rekognitionClient.mjs';
import { CreateCollectionCommand } from "@aws-sdk/client-rekognition";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { collectionId = "OpenPress-faces" } = body;

    console.log('🆕 Creating face collection:', collectionId);

    const command = new CreateCollectionCommand({
      CollectionId: collectionId
    });

    const response = await rekogClient.send(command);
    
    console.log('✅ Face collection created successfully');
    console.log('   Collection ARN:', response.CollectionArn);
    console.log('   Face Model Version:', response.FaceModelVersion);

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
