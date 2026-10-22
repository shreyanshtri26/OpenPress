import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { clientConfig } from "../../lib/storage.mjs";

const analysisClient = new RekognitionClient(clientConfig());

export { analysisClient };
