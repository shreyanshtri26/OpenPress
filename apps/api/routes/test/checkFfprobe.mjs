import { execSync } from "child_process";

export const handler = async () => {
  try {
    const version = execSync("/opt/bin/ffprobe -version");
    return {
      statusCode: 200,
      body: `✅ FFprobe is available:\n${version.toString()}`,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `❌ FFprobe not found or failed: ${error.message}`,
    };
  }
};
