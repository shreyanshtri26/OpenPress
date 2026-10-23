import { randomUUID } from "node:crypto";
import { db } from "../../db/client.mjs";
import { assets } from "../../db/schema.mjs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, publicObjectUrl } from "../../lib/storage.mjs";

// With UPLOAD_ASSETS=1 the sample images are copied into the DAM bucket, so articles can use them from the media library.
export const seedUrl = (item) =>
  process.env.UPLOAD_ASSETS && process.env.DAM_BUCKET_NAME
    ? publicObjectUrl(process.env.DAM_BUCKET_NAME, `seed/${item.fileName}`)
    : item.fileUrl;

async function uploadSample(s3, item) {
  const res = await fetch(item.fileUrl);
  if (!res.ok) throw new Error(`Could not download ${item.fileUrl}: ${res.status}`);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.DAM_BUCKET_NAME,
    Key: `seed/${item.fileName}`,
    Body: Buffer.from(await res.arrayBuffer()),
    ContentType: item.fileType,
  }));
}

export const SAMPLE_ASSETS = [
  {
    name: "parliament-building.jpg",
    fileName: "parliament-building.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80",
    description: "Government buildings and parliamentary assembly grounds during afternoon session.",
    summary: "Government parliament building exterior with flags and public square.",
    caption: "The national parliament building during the spring legislative sitting.",
    category: "Politics",
    tags: ["Politics", "Government", "Parliament", "Legislation", "National"],
    creator: "Staff Photojournalist",
    licensing: "Editorial Use Only",
    location: "New Delhi",
  },
  {
    name: "technology-datacenter.jpg",
    fileName: "technology-datacenter.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    description: "Cloud computing server racks with glowing blue fiber optic cables.",
    summary: "Server infrastructure in a modern high-density data center facility.",
    caption: "Modern server racks powering cloud computing and artificial intelligence workloads.",
    category: "Technology",
    tags: ["Technology", "AI", "Cloud", "Data", "Innovation"],
    creator: "Tech Wire",
    licensing: "Editorial Use Only",
    location: "Mumbai",
  },
  {
    name: "business-stock-exchange.jpg",
    fileName: "business-stock-exchange.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80",
    description: "Financial stock market board displaying indices, charts, and trading volumes.",
    summary: "Global stock markets and financial indicators reaching record highs.",
    caption: "Stock market charts indicating trading trends and market movements.",
    category: "Business",
    tags: ["Business", "Finance", "Economy", "Markets", "Investment"],
    creator: "Market Watch",
    licensing: "Editorial Use Only",
    location: "New York",
  },
  {
    name: "sports-stadium-night.jpg",
    fileName: "sports-stadium-night.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80",
    description: "Filled sports stadium under bright floodlights before championship kickoff.",
    summary: "Major championship sports event under floodlights with capacity crowd.",
    caption: "The national arena illuminated during the final round of competition.",
    category: "Sports",
    tags: ["Sports", "Stadium", "Championship", "Athletics", "Competition"],
    creator: "Sports Desk",
    licensing: "Editorial Use Only",
    location: "Canterbury",
  },
  {
    name: "climate-glacier-nature.jpg",
    fileName: "climate-glacier-nature.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
    description: "Majestic alpine mountain peaks surrounded by clouds and glacier valley.",
    summary: "Glacial mountain range highlighted in climate impact studies.",
    caption: "Southern mountain peaks where scientific teams measure environmental shifts.",
    category: "Environment",
    tags: ["Climate", "Environment", "Nature", "Mountains", "Research"],
    creator: "Earth Sciences Reporter",
    licensing: "Editorial Use Only",
    location: "Southern Alps",
  },
  {
    name: "arts-museum-gallery.jpg",
    fileName: "arts-museum-gallery.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=600&q=80",
    description: "Visitors enjoying contemporary fine art exhibition in modern spacious museum gallery.",
    summary: "Contemporary art exhibition gallery attracting community visitors.",
    caption: "Visitors exploring the national gallery's autumn retrospective exhibition.",
    category: "Arts & Culture",
    tags: ["Arts & Culture", "Museum", "Exhibition", "Gallery", "Lifestyle"],
    creator: "Culture Reporter",
    licensing: "Editorial Use Only",
    location: "New Delhi",
  },
  {
    name: "healthcare-hospital-lab.jpg",
    fileName: "healthcare-hospital-lab.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
    description: "Medical researchers and laboratory scientists working on diagnostic healthcare studies.",
    summary: "Medical researchers working with diagnostic equipment in clinical health laboratory.",
    caption: "Clinical researchers reviewing data on the front line of medical innovation.",
    category: "Health",
    tags: ["Health", "Medicine", "Science", "Healthcare", "Research"],
    creator: "Health Desk",
    licensing: "Editorial Use Only",
    location: "Mumbai",
  },
  {
    name: "breaking-news-press-conference.jpg",
    fileName: "breaking-news-press-conference.jpg",
    fileType: "image/jpeg",
    fileUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80",
    previewUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80",
    description: "Microphones arrayed on podium ready for major media announcement and press briefing.",
    summary: "Press conference briefing microphones set up for major news announcement.",
    caption: "Media microphones ready for official statements in the press conference auditorium.",
    category: "News",
    tags: ["News", "Breaking News", "Press", "Media", "Briefing"],
    creator: "Press Pool",
    licensing: "Editorial Use Only",
    location: "National",
  },
];

export async function seedAssets() {
  console.log("Seeding sample DAM assets into Postgres...");
  let count = 0;
  const s3 = process.env.UPLOAD_ASSETS ? createS3Client() : null;

  for (const item of SAMPLE_ASSETS) {
    if (s3) await uploadSample(s3, item);
    const url = seedUrl(item);
    const assetId = `asset_${item.fileName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
    await db
      .insert(assets)
      .values({
        assetId,
        name: item.name,
        fileName: item.fileName,
        fileType: item.fileType,
        fileUrl: url,
        previewUrl: url,
        s3Key: s3 ? `seed/${item.fileName}` : item.fileName,
        userId: "admin-seed",
        uploadedBy: "Local Admin",
        description: item.description,
        summary: item.summary,
        caption: item.caption,
        category: item.category,
        tags: item.tags,
        creator: item.creator,
        licensing: item.licensing,
        location: item.location,
        videoMetadata: {},
        metadata: {
          extractionStatus: "completed",
        },
        status: "ready",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: assets.assetId,
        set: {
          name: item.name,
          fileName: item.fileName,
          fileType: item.fileType,
          fileUrl: url,
          previewUrl: url,
          description: item.description,
          summary: item.summary,
          caption: item.caption,
          category: item.category,
          tags: item.tags,
          updatedAt: new Date(),
        },
      });
    count++;
    console.log(`  ✓ ${item.name} (${assetId})`);
  }

  console.log(`Successfully seeded ${count} DAM assets.`);
}

if (process.argv[1]?.endsWith("assets.mjs")) {
  try {
    await seedAssets();
    process.exit(0);
  } catch (err) {
    console.error("Asset seeding failed:", err);
    process.exit(1);
  }
}
