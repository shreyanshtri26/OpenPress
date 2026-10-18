import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import dynamoClient from "../../dynamoClient.mjs";

const SEARCH_HISTORY_TABLE = process.env.DYNAMO_SEARCH_HISTORY_TABLE || 'op_searchhistory';

export const handler = async (event) => {
    const user = event.user;

    if (!user || !user.email) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }

    try {
        // Since searchId is PK, we need to scan to find items by userEmail. 
        // For better performance, a Global Secondary Index (GSI) on userEmail should be added.
        const command = new ScanCommand({
            TableName: SEARCH_HISTORY_TABLE,
            FilterExpression: "userEmail = :email",
            ExpressionAttributeValues: {
                ":email": user.email
            }
        });

        const result = await dynamoClient.send(command);
        
        // Sort by timestamp descending
        const sortedHistory = (result.Items || []).sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Deduplicate by query text
        const uniqueQueries = [];
        const seen = new Set();
        for (const item of sortedHistory) {
            if (!seen.has(item.query.toLowerCase())) {
                uniqueQueries.push(item);
                seen.add(item.query.toLowerCase());
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ history: uniqueQueries }),
        };
    } catch (err) {
        console.error('Error fetching search history:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch search history' }),
        };
    }
};
