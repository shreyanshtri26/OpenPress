import { clientConfig } from "../../lib/storage.mjs";
// get-transcode-endpoint.mjs
import { MediaConvertClient, DescribeEndpointsCommand } from "@aws-sdk/client-mediaconvert";

const transcodeClient = new MediaConvertClient({ ...clientConfig(),});

export const handler = async (event) => {
    try {
        console.log("🔍 Getting Transcode endpoint...");
        
        const command = new DescribeEndpointsCommand({});
        const response = await transcodeClient.send(command);
        
        const endpoint = response.Endpoints[0].Url;
        
        console.log("✅ Transcode endpoint found:", endpoint);
        
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: true,
                endpoint: endpoint,
                region: process.env.STORAGE_REGION || "us-east-1",
                message: "Transcode endpoint retrieved successfully",
                instructions: {
                    step1: "Copy this endpoint URL",
                    step2: "Add it to your function environment variables as TRANSCODE_ENDPOINT",
                    step3: "Use it in your Transcode job creation"
                }
            })
        };
        
    } catch (error) {
        console.error("❌ Error getting Transcode endpoint:", error);
        
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                troubleshooting: {
                    check1: "Ensure function has Transcode permissions",
                    check2: "Verify region is correct (STORAGE_REGION)",
                    check3: "Check if Transcode is available in your region"
                }
            })
        };
    }
};
