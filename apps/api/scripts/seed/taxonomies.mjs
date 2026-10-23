import { randomUUID } from 'node:crypto';
import { db } from '../../db/client.mjs';
import { taxonomies } from '../../db/schema.mjs';

export const DEFAULT_TAXONOMIES = [
  {
    name: 'Section',
    isMendatory: true,
    values: [
      'News',
      'Opinion',
      'Business',
      'Sports',
      'Technology',
      'Arts & Culture',
      'Politics',
      'Lifestyle',
      'World',
    ],
    permissions: {
      Selection: 'single',
      'Raise a story': true,
      Ideas: true,
      'In progress': true,
      'In review': true,
      'Ready to publish': true,
      Published: true,
      'More Story Card': true,
      'Thumbnail Grid': true,
    },
  },
  {
    name: 'Category',
    isMendatory: false,
    values: [
      'Breaking News',
      'Feature',
      'Investigation',
      'Interview',
      'Analysis',
      'Editorial',
      'Press Release',
      'Community',
    ],
    permissions: {
      Selection: 'single',
      'Raise a story': true,
      Ideas: true,
      'In progress': true,
      'In review': true,
      'Ready to publish': true,
      Published: true,
      'More Story Card': true,
      'Thumbnail Grid': true,
    },
  },
  {
    // The palette the editor's colour pickers (navbar buttons, card accents) offer.
    name: 'Color',
    isMendatory: false,
    values: ['#0057FF', '#0071E3', '#1D1D1F', '#B42318', '#067647', '#B54708', '#6941C6', '#C11574', '#0E7090', '#6E6E73', '#000000', '#FFFFFF'],
    permissions: { Selection: 'single' },
  },
  {
    name: 'Editor',
    isMendatory: true,
    values: ['Test Editor', 'Sarah Vance', 'Marcus Thorne'],
    permissions: {
      Selection: 'single',
      'Raise a story': true,
      Ideas: true,
      'In progress': true,
      'In review': true,
      'Ready to publish': true,
      Published: true,
    },
  },
  {
    name: 'Reporter',
    isMendatory: false,
    values: ['Jane Doe', 'David Smith', 'Alex Rivera'],
    permissions: {
      Selection: 'single',
      'Raise a story': true,
      Ideas: true,
      'In progress': true,
      'In review': true,
      'Ready to publish': true,
      Published: true,
    },
  },
  {
    name: 'Tags',
    isMendatory: false,
    values: [
      'Economy',
      'Elections',
      'Health',
      'Climate',
      'Education',
      'Government',
      'Finance',
      'Artificial Intelligence',
    ],
    permissions: {
      Selection: 'multi',
      'Raise a story': true,
      Ideas: true,
      'In progress': true,
      'In review': true,
      'Ready to publish': true,
      Published: true,
    },
  },
  {
    name: 'Story Type',
    isMendatory: false,
    values: [
      'Standard Article',
      'Photo Essay',
      'Video Story',
      'Podcast / Audio',
      'Live Blog',
    ],
    permissions: {
      Selection: 'single',
      'Raise a story': true,
      Ideas: true,
      'In progress': true,
      'In review': true,
      'Ready to publish': true,
      Published: true,
    },
  },
  {
    name: 'Region',
    isMendatory: false,
    values: [
      'National',
      'North India',
      'South India',
      'East India',
      'West India',
      'International',
    ],
    permissions: {
      Selection: 'single',
      'Raise a story': true,
      Ideas: true,
      'In progress': true,
      'In review': true,
      'Ready to publish': true,
      Published: true,
    },
  },
];

export async function seedTaxonomies() {
  console.log('Seeding default taxonomies into Postgres...');
  let seeded = 0;
  for (const item of DEFAULT_TAXONOMIES) {
    const taxonomyId = `tax_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await db
      .insert(taxonomies)
      .values({
        taxonomyId,
        name: item.name,
        values: item.values,
        permissions: item.permissions,
        isMendatory: item.isMendatory,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: taxonomies.taxonomyId,
        set: {
          name: item.name,
          values: item.values,
          permissions: item.permissions,
          isMendatory: item.isMendatory,
          updatedAt: new Date(),
        },
      });
    seeded++;
    console.log(`  ✓ ${item.name} (${taxonomyId})`);
  }
  console.log(`Seeded ${seeded} taxonomies successfully.`);
}

if (process.argv[1]?.endsWith('taxonomies.mjs')) {
  try {
    await seedTaxonomies();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}
