// get-mediaconvert-endpoint.mjs
import { MediaConvertClient, DescribeEndpointsCommand } from "@aws-sdk/client-mediaconvert";

const mediaConvertClient = new MediaConvertClient({
    region: process.env.AWS_OpenPress_REGION || "us-east-1" 
});

export const handler = async (event) => {
    try {
        console.log("🔍 Getting MediaConvert endpoint...");
        
        const command = new DescribeEndpointsCommand({});
        const response = await mediaConvertClient.send(command);
        
        const endpoint = response.Endpoints[0].Url;
        
        console.log("✅ MediaConvert endpoint found:", endpoint);
        
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: true,
                endpoint: endpoint,
                region: process.env.AWS_OpenPress_REGION || "us-east-1",
                message: "MediaConvert endpoint retrieved successfully",
                instructions: {
                    step1: "Copy this endpoint URL",
                    step2: "Add it to your Lambda environment variables as MEDIACONVERT_ENDPOINT",
                    step3: "Use it in your MediaConvert job creation"
                }
            })
        };
        
    } catch (error) {
        console.error("❌ Error getting MediaConvert endpoint:", error);
        
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                troubleshooting: {
                    check1: "Ensure Lambda has MediaConvert permissions",
                    check2: "Verify region is correct (AWS_OpenPress_REGION)",
                    check3: "Check if MediaConvert is available in your region"
                }
            })
        };
    }
};
