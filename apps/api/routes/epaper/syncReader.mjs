import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db } from '../../db/client.mjs';
import { readerUsers } from '../../db/schema.mjs';

const READER_JWT_SECRET = process.env.EPAPER_JWT_SECRET || process.env.JWT_SECRET || 'epaper-reader-secret-key';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { neonAuthId, email, displayName, avatarUrl } = body;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email is required for reader authentication' }),
      };
    }

    const cleanEmail = email.toLowerCase().trim();
    const effectiveAuthId = neonAuthId || `neon_${Buffer.from(cleanEmail).toString('hex').slice(0, 24)}`;
    const now = new Date();

    // Look for existing reader in reader_users table
    const [existing] = await db
      .select()
      .from(readerUsers)
      .where(eq(readerUsers.email, cleanEmail));

    let readerRecord = null;

    if (existing) {
      // Update reader record
      const [updated] = await db
        .update(readerUsers)
        .set({
          neonAuthId: effectiveAuthId,
          displayName: displayName || existing.displayName || cleanEmail.split('@')[0],
          avatarUrl: avatarUrl !== undefined ? avatarUrl : existing.avatarUrl,
          lastLoginAt: now,
          updatedAt: now,
        })
        .where(eq(readerUsers.id, existing.id))
        .returning();

      readerRecord = updated;
    } else {
      // Insert new reader in reader_users table
      const [created] = await db
        .insert(readerUsers)
        .values({
          neonAuthId: effectiveAuthId,
          email: cleanEmail,
          displayName: displayName || cleanEmail.split('@')[0],
          avatarUrl: avatarUrl || null,
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          preferences: {},
          lastLoginAt: now,
        })
        .returning();

      readerRecord = created;
    }

    // Generate reader-scoped JWT token (isReader: true, distinct audience/claims)
    const token = jwt.sign(
      {
        readerId: readerRecord.id,
        neonAuthId: readerRecord.neonAuthId,
        email: readerRecord.email,
        displayName: readerRecord.displayName,
        subscriptionTier: readerRecord.subscriptionTier,
        isReader: true,
      },
      READER_JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'ePaper reader authenticated successfully',
        reader: {
          id: readerRecord.id,
          neonAuthId: readerRecord.neonAuthId,
          email: readerRecord.email,
          displayName: readerRecord.displayName,
          avatarUrl: readerRecord.avatarUrl,
          subscriptionTier: readerRecord.subscriptionTier,
          subscriptionStatus: readerRecord.subscriptionStatus,
          lastLoginAt: readerRecord.lastLoginAt,
        },
        token,
      }),
    };
  } catch (error) {
    console.error('ePaper syncReader error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Server error during reader authentication',
        error: error.message,
      }),
    };
  }
};
