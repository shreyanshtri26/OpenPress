import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, sql } from '../../db/client.mjs';
import { users } from '../../db/schema.mjs';

export const SEED_USERS = [
  {
    email: 'editor@openpress.local',
    fullName: 'Test Editor',
    role: 'Editor',
    status: 'active',
    bio: 'Senior commissioning editor for OpenPress newsroom.',
  },
  {
    email: 'sarah.editor@openpress.local',
    fullName: 'Sarah Vance',
    role: 'Editor',
    status: 'active',
    bio: 'Executive editor overseeing investigations and in-depth reporting.',
  },
  {
    email: 'marcus.editor@openpress.local',
    fullName: 'Marcus Thorne',
    role: 'Editor',
    status: 'active',
    bio: 'Managing editor for politics, business, and national affairs.',
  },
  {
    email: 'jane.reporter@openpress.local',
    fullName: 'Jane Doe',
    role: 'Reporter',
    status: 'active',
    bio: 'Lead political correspondent and investigative journalist.',
  },
  {
    email: 'david.journalist@openpress.local',
    fullName: 'David Smith',
    role: 'Reporter',
    status: 'active',
    bio: 'Technology and science writer covering artificial intelligence.',
  },
  {
    email: 'alex.writer@openpress.local',
    fullName: 'Alex Rivera',
    role: 'Reporter',
    status: 'active',
    bio: 'Culture, arts, and lifestyle staff reporter.',
  },
];

async function seedUsers() {
  console.log('Seeding newsroom users into Postgres...');

  for (const u of SEED_USERS) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, u.email));

    if (existing.length > 0) {
      console.log(`  - ${u.fullName} (${u.email}) already exists, skipping.`);
      continue;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      userId,
      email: u.email,
      fullName: u.fullName,
      password: hashedPassword,
      role: u.role,
      status: u.status,
      isAuthor: true,
      authorName: u.fullName,
      bio: u.bio,
      profilePic: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
    });

    console.log(`  ✓ ${u.fullName} (${u.role}) created.`);
  }

  console.log('Finished seeding newsroom users.\n');
}

if (process.argv[1]?.endsWith('users.mjs')) {
  seedUsers()
    .then(() => sql.end({ timeout: 1 }))
    .catch((err) => {
      console.error('Failed to seed users:', err);
      process.exit(1);
    });
}
