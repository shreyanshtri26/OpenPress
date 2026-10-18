import { inArray } from "drizzle-orm";
import { db, sql } from "../../db/client.mjs";
import { stories, users } from "../../db/schema.mjs";
import { SAMPLE_ASSETS, seedUrl } from "./assets.mjs";

// Sample content for local development only. Fixed story ids make the script safe to re-run (upsert).
const REPORTERS = ["jane.reporter@openpress.local", "david.journalist@openpress.local", "alex.writer@openpress.local"];
const EDITORS = ["sarah.editor@openpress.local", "marcus.editor@openpress.local"];

const SAMPLE_STORIES = [
  ["Parliament opens a new session with a packed legislative agenda", "Politics", "Feature",
    "Lawmakers return with housing, transport and digital-privacy bills at the top of the order paper.",
    ["The new session opened on Monday with a full agenda, and early debate centred on how quickly the housing bill can move through committee.", "Opposition members asked for more time to review the transport proposals, while the government said the timetable leaves room for public submissions.", "Observers expect the digital-privacy bill to draw the most amendments before it reaches a final vote."]],
  ["Local councils pilot free public Wi-Fi in town centres", "News", "Community",
    "Three councils are testing open Wi-Fi in libraries and main streets for six months.",
    ["The pilot covers library precincts and the busiest shopping streets in three towns, with no sign-up or data limits.", "Council officers say usage will be reviewed monthly, and the network will be extended if demand stays high."]],
  ["Why small newsrooms are choosing open publishing tools", "Opinion", "Editorial",
    "Independent outlets are moving off closed platforms to keep control of their archives and their readers.",
    ["For years the default choice was whichever platform offered the easiest set-up. The costs of that convenience are now clearer: fees, lock-in and rules that change without notice.", "Open tools let a newsroom own its archive and publish to any host. That freedom matters most when budgets are tight and trust with readers is the main asset."]],
  ["Regional manufacturers report a steady rise in export orders", "Business", "Analysis",
    "Order books at mid-sized factories have grown for a third straight quarter.",
    ["A survey of regional manufacturers shows export orders rising in food processing, machinery and packaging.", "Owners cited steadier shipping costs and new buyers in neighbouring markets, though many said hiring skilled workers remains the main constraint."]],
  ["Youth league final goes to extra time in a record crowd", "Sports", "Breaking News",
    "A late equaliser sent the championship decider into extra time before a sell-out stadium.",
    ["The home side trailed until the 88th minute, when a header from a corner levelled the score and sent the crowd into celebration.", "Extra time stayed tense, with both goalkeepers making key saves before the match was settled."]],
  ["New open-source model helps small teams transcribe local languages", "Technology", "Feature",
    "A community-built speech model now covers a dozen regional languages with usable accuracy.",
    ["Volunteers recorded and checked thousands of hours of speech to train the model, which runs on an ordinary laptop.", "Early users in newsrooms and schools say it cuts transcription time from hours to minutes, though accents outside the training data still cause errors."]],
  ["A weekend festival brings street theatre back to the old market", "Arts & Culture", "Community",
    "More than forty troupes will perform across the market square over two days.",
    ["Organisers say the festival is the largest of its kind in the city, with free shows for families and late-night performances for adults.", "Local traders have extended opening hours, and a shuttle will run between the festival and the main station."]],
  ["Simple habits that make long commutes easier", "Lifestyle", "Feature",
    "Readers share the routines that turned travel time into something they look forward to.",
    ["Podcasts, audiobooks and a fixed morning playlist were the most common tips, followed by leaving ten minutes earlier to avoid the rush.", "Several readers recommended using the journey to plan the day, and one suggested a short walk at the far end to reset before work."]],
  ["Climate talks end with a modest deal on shared monitoring", "World", "Analysis",
    "Negotiators agreed to share emissions data openly, but left funding questions for next year.",
    ["After two weeks of talks, delegates settled on a common format for reporting emissions, which researchers say will make progress easier to check.", "Developing countries pressed for firm funding commitments and were told the issue will return at the next round."]],
  ["Hospitals extend evening clinics to cut emergency waiting times", "News", "Investigation",
    "Extra evening appointments are meant to draw non-urgent cases away from emergency departments.",
    ["Three hospitals have added evening clinics for minor injuries and routine checks, staffed by existing teams working new rosters.", "Early figures show a modest fall in late-night emergency arrivals, and managers say the trial will run through the winter."]],
  ["Shipping lanes reopen after weeks of rerouted cargo", "World", "Breaking News",
    "Major carriers confirmed the route is safe again, easing delays for importers worldwide.",
    ["Carriers began sending vessels through the shortened route this week after inspectors cleared the last of the hazards.", "Port operators expect backlogs to clear within a month, and freight forecasters have already trimmed their price outlook for the quarter.", "Importers say the biggest relief will come for perishable goods, which had been the hardest hit by the longer journeys."]],
  ["Small shops see a lift as the high street gets a weekend market", "Business", "Community",
    "A monthly street market is bringing new customers to independent traders.",
    ["Traders on the main street report higher footfall since the market began, with many first-time visitors stepping into neighbouring shops.", "The council says the market will run all year if turnout holds, and is looking at extending opening hours into the evening.", "Owners say the lift is modest but steady, and several have hired extra weekend staff."]],
  ["A free coding club turns library afternoons into a starter course", "Technology", "Feature",
    "Volunteers teach teenagers to build their first websites using only borrowed laptops.",
    ["The weekly club began with six students and now fills the library's study room, with a waiting list for the autumn term.", "Volunteers from local companies run the sessions and say the aim is confidence, not careers, though several students have already built sites for family businesses.", "The library plans to lend out the laptops for home practice once a donation drive reaches its target."]],
  ["Veteran striker signs a final contract with her hometown club", "Sports", "Feature",
    "After a decade abroad, the forward returns to finish her career where it began.",
    ["The announcement came after training on Tuesday, to cheers from fans who had gathered at the gates.", "The club's coach said her experience will guide a young squad through a difficult run of fixtures.", "She will also run weekend clinics for girls' teams in the area as part of the deal."]],
  ["Community kitchens swap recipes for the long winter ahead", "Lifestyle", "Community",
    "Cooks across the city are trading low-cost, high-flavour meals for cold months.",
    ["Volunteers at four kitchens have started a shared recipe book, filled with soups, stews and bakes that cost little and freeze well.", "Organisers say the book is meant to be copied, so anyone can print it or add a page of their own.", "The first edition will be handed out at the winter food drive next month."]],

];

const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function seedStories() {
  const people = await db
    .select({ userId: users.userId, email: users.email })
    .from(users)
    .where(inArray(users.email, [...REPORTERS, ...EDITORS]));
  const idOf = Object.fromEntries(people.map((p) => [p.email, p.userId]));
  if (REPORTERS.some((e) => !idOf[e]) || EDITORS.some((e) => !idOf[e])) {
    throw new Error("Seed users are missing. Run `node scripts/seed/users.mjs` first.");
  }

  const siteUrl = (process.env.FRONTEND_WEBSITE_URL || "http://127.0.0.1:9000/openpress-website").replace(/\/+$/, "");
  const images = SAMPLE_ASSETS.map(seedUrl);
  let count = 0;

  for (const [i, [title, section, category, summary, paragraphs]] of SAMPLE_STORIES.entries()) {
    const storyId = `seed-story-${String(i + 1).padStart(2, "0")}`;
    const slug = slugify(title);
    const publishedAt = new Date(Date.now() - i * 6 * 60 * 60 * 1000);
    const authorId = idOf[REPORTERS[i % REPORTERS.length]];
    const row = {
      storyId,
      title,
      slug,
      status: "published",
      authorId,
      assignedTo: idOf[EDITORS[i % EDITORS.length]],
      image: images.length ? images[i % images.length] : null,
      description: JSON.stringify({ blocks: paragraphs.map((text) => ({ type: "paragraph", data: { text } })) }),
      isComplete: true,
      publishedAt,
      publishUrl: `${siteUrl}/${slugify(section)}/${slug}.html`,
      fields: { section, Section: section, category, Category: category, storySummary: summary, isSeedData: true },
      updatedAt: new Date(),
    };
    await db.insert(stories).values(row).onConflictDoUpdate({ target: stories.storyId, set: { ...row, storyId: undefined } });
    count++;
    console.log(`  ✓ ${title}`);
  }
  console.log(`Successfully seeded ${count} published stories.`);
}

if (process.argv[1]?.endsWith("stories.mjs")) {
  try {
    await seedStories();
    await sql.end({ timeout: 1 });
    process.exit(0);
  } catch (err) {
    console.error("Story seeding failed:", err);
    process.exit(1);
  }
}
