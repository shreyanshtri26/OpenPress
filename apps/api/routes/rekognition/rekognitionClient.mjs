import { RekognitionClient } from "@aws-sdk/client-rekognition";

const REGION = process.env.AWS_OpenPress_REGION;

const rekogClient = new RekognitionClient({
  region: REGION
});

export { rekogClient };
