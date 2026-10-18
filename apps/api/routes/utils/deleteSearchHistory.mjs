import { ScanCommand, DeleteCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";

const SEARCH_HISTORY_TABLE = process.env.DYNAMO_SEARCH_HISTORY_TABLE || 'op_searchhistory';

export const handler = async (event) => {
    const user = event.user;
    const queryToDelete = event.queryStringParameters?.q;

    if (!user || !user.email) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }

    if (!queryToDelete) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Query parameter "q" is required' }),
        };
    }

    try {
        // Find all history records for this user and this query
        const scanCommand = new ScanCommand({
            TableName: SEARCH_HISTORY_TABLE,
            FilterExpression: "userEmail = :email AND #q = :query",
            ExpressionAttributeNames: {
                "#q": "query"
            },
            ExpressionAttributeValues: {
                ":email": user.email,
                ":query": queryToDelete
            }
        });

        const scanResult = await dynamoClient.send(scanCommand);
        const items = scanResult.Items || [];

        if (items.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No search history items found to delete' }),
            };
        }

        // Delete each found item
        const deletePromises = items.map(item => 
            dynamoClient.send(new DeleteCommand({
                TableName: SEARCH_HISTORY_TABLE,
                Key: {
                    searchId: item.searchId
                }
            }))
        );

        await Promise.all(deletePromises);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Search history query deleted successfully', deletedCount: items.length }),
        };
    } catch (err) {
        console.error('Error deleting search history:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to delete search history' }),
        };
    }
};
