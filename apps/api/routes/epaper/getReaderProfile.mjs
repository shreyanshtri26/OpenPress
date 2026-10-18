import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db } from '../../db/client.mjs';
import { readerUsers } from '../../db/schema.mjs';

const READER_JWT_SECRET = process.env.EPAPER_JWT_SECRET || process.env.JWT_SECRET || 'epaper-reader-secret-key';

export const handler = async (event) => {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing or invalid authorization header' }),
      };
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, READER_JWT_SECRET);
    } catch {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid or expired reader token' }),
      };
    }

    if (!decoded?.readerId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Forbidden: not a valid reader token' }),
      };
    }

    const [reader] = await db
      .select()
      .from(readerUsers)
      .where(eq(readerUsers.id, decoded.readerId));

    if (!reader) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Reader account not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Reader profile fetched successfully',
        reader: {
          id: reader.id,
          neonAuthId: reader.neonAuthId,
          email: reader.email,
          displayName: reader.displayName,
          avatarUrl: reader.avatarUrl,
          subscriptionTier: reader.subscriptionTier,
          subscriptionStatus: reader.subscriptionStatus,
          subscriptionExpiresAt: reader.subscriptionExpiresAt,
          preferences: reader.preferences,
          createdAt: reader.createdAt,
          lastLoginAt: reader.lastLoginAt,
        },
      }),
    };
  } catch (error) {
    console.error('ePaper getReaderProfile error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Server error retrieving reader profile',
        error: error.message,
      }),
    };
  }
};
