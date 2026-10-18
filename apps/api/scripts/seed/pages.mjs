import { randomUUID } from "node:crypto";
import { and, eq, like, sql as dsql } from "drizzle-orm";
import { db, sql } from "../../db/client.mjs";
import { pages, taxonomies } from "../../db/schema.mjs";

// Page Builder layouts for local development. Cards reference the stories from `seed/stories.mjs` by id;
// each card's title and image are filled in by the editor/publisher from the story itself.
// Cards live in named zones: "<block id>:<zone name>" (see HeroGridBlock, SectionGrid, ...).
const STORY = (n) => `seed-story-${String(n).padStart(2, "0")}`;
const card = (type, id, n, extra = {}) => ({ type, props: { id, storyId: STORY(n), ...extra } });
const navbar = (id) => ({ type: "AtlanticNavbar", props: { id } });
const footer = (id) => ({ type: "Footer", props: { id } });
const page = (title, content, zones = {}) => ({ root: { props: { title } }, content, zones });

// story number -> section (matches SAMPLE_STORIES order in stories.mjs)
const SECTION_OF = { 1: "Politics", 2: "News", 3: "Opinion", 4: "Business", 5: "Sports", 6: "Technology", 7: "Arts & Culture", 8: "Lifestyle", 9: "World", 10: "News" };

const home = () =>
  page(
    "Home",
    [
      navbar("home-navbar"),
      { type: "HeroGrid", props: { id: "hero-grid", mode: "manual" } },
      { type: "Heading", props: { id: "home-latest-heading", text: "Latest", align: "left", level: "2", size: "m" } },
      { type: "ThumbnailGrid", props: { id: "thumbnail-grid", mode: "manual" } },
      { type: "PopularGrid", props: { id: "popular-grid", mode: "manual" } },
      { type: "MultimediaGrid", props: { id: "multimedia-grid", mode: "manual" } },
      { type: "AllStoriesGrid", props: { id: "all-stories-grid", mode: "manual" } },
      footer("home-footer"),
    ],
    {
      "hero-grid:hero-grid-center-0": [card("MainCard", "hero-main", 1)],
      "hero-grid:hero-grid-left-0": [card("StoryCard", "hero-left-0", 2)],
      "hero-grid:hero-grid-left-1": [card("StoryCard", "hero-left-1", 3)],
      "hero-grid:hero-grid-right-0": [card("StoryCard", "hero-right-0", 4)],
      "hero-grid:hero-grid-right-1": [card("StoryCard", "hero-right-1", 5)],
      "thumbnail-grid:thumbnail-grid-box-0": [card("StoryCard", "thumb-0", 6)],
      "thumbnail-grid:thumbnail-grid-box-1": [card("StoryCard", "thumb-1", 7)],
      "thumbnail-grid:thumbnail-grid-box-2": [card("StoryCard", "thumb-2", 8)],
      "thumbnail-grid:thumbnail-grid-box-3": [card("StoryCard", "thumb-3", 9)],
      "popular-grid:popular-grid-left": [{ type: "MostPopularTable", props: { id: "popular-table" } }],
      "multimedia-grid:multimedia-grid-left": [card("StoryCard", "multimedia-0", 10)],
      "all-stories-grid:all-stories-grid-left": [card("MainCard", "all-main", 2)],
      "all-stories-grid:all-stories-grid-right-top-1": [card("StoryCard", "all-right-1", 3)],
      "all-stories-grid:all-stories-grid-right-top-2": [card("StoryCard", "all-right-2", 4)],
      "all-stories-grid:all-stories-grid-right-top-3": [card("StoryCard", "all-right-3", 5)],
    },
  );

// A section page leads with its own story and fills the right column with the others.
const sectionPage = (name) => {
  const own = Object.keys(SECTION_OF).map(Number).filter((n) => SECTION_OF[n] === name);
  const others = Object.keys(SECTION_OF).map(Number).filter((n) => SECTION_OF[n] !== name);
  const lead = own[0] ?? 1;
  const rest = [...own.slice(1), ...others];
  const zones = { "section-grid:section-grid-left-top-1": [card("MainCard", "section-lead", lead)] };
  rest.slice(0, 5).forEach((n, i) => {
    zones[`section-grid:section-grid-right-${i + 1}`] = [card("StoryCard", `section-right-${i + 1}`, n)];
  });
  return page(
    name,
    [
      navbar("section-navbar"),
      { type: "Heading", props: { id: "section-heading", text: name, align: "left", level: "1", size: "l" } },
      { type: "SectionGrid", props: { id: "section-grid" } },
      footer("section-footer"),
    ],
    zones,
  );
};

// Article template: the Publish flow renders each story into the BlogPostCard slot.
const blogTemplate = () =>
  page(
    "Blog",
    [navbar("blog-navbar"), { type: "BlogGrid", props: { id: "blog-grid" } }, footer("blog-footer")],
    { "blog-grid:blog-grid-left-top-1": [{ type: "BlogPostCard", props: { id: "blog-post-card", storyId: "" } }] },
  );

const simple = (title, id, block) => page(title, [navbar(`${id}-navbar`), { type: block, props: { id } }, footer(`${id}-footer`)]);

export async function seedPages() {
  const [sectionTax] = await db.select().from(taxonomies).where(eq(taxonomies.name, "Section")).limit(1);
  const sections = Array.isArray(sectionTax?.values) && sectionTax.values.length ? sectionTax.values : Object.values(SECTION_OF);

  // Remove junk left by earlier test runs: placeholder pages, empty "Blog" skeletons and a fake sidebar widget.
  await db.delete(pages).where(like(pages.pageType, "TestPage\_%"));
  await db.delete(pages).where(and(eq(pages.pageType, "Blog"), dsql`jsonb_array_length(coalesce(data->'content', '[]'::jsonb)) = 0`));
  await db.delete(pages).where(and(eq(pages.pageType, "GlobalSidebar"), dsql`data::text like '%widget-1%'`));

  // Author pages the editor created empty: give each a masthead, the author profile and a footer.
  const emptyAuthors = await db.select().from(pages).where(and(like(pages.pageType, "Author-%"), dsql`jsonb_array_length(coalesce(data->'content', '[]'::jsonb)) = 0`));
  for (const row of emptyAuthors) {
    const data = page("Author", [navbar("author-navbar"), { type: "AuthorProfile", props: { id: "author-profile" } }, footer("author-footer")]);
    await db.update(pages).set({ data: { ...data, publishedSnapshot: data }, updatedAt: new Date() }).where(eq(pages.pageId, row.pageId));
    console.log(`  ✓ ${row.pageType} (filled)`);
  }

  const layouts = {
    Home: home(),
    Blog: blogTemplate(),
    About: simple("About OpenPress", "about-us", "AboutUs"),
    PrivacyPolicy: simple("Privacy Policy", "privacy-policy", "PrivacyPolicy"),
    MediaCouncil: simple("Editorial Standards", "media-council", "MediaCouncil"),
    ContactUs: simple("Contact Us", "contact-us", "ContactUs"),
    SupportUs: simple("Support Us", "support-us", "SupportUs"),
    AuthorsList: simple("Our Authors", "authors-grid", "AuthorsGrid"),
    Error: simple("Page not found", "error-card", "ErrorCard"),
  };
  for (const s of sections) layouts[`Section-${s}`] = sectionPage(s);

  let count = 0;
  for (const [pageType, layout] of Object.entries(layouts)) {
    // A publishedSnapshot marks the layout as deliberately published, so the site-wide republish builds it.
    const data = { ...layout, publishedSnapshot: layout };
    const [existing] = await db.select().from(pages).where(eq(pages.pageType, pageType)).limit(1);
    if (existing) {
      await db.update(pages).set({ data, updatedAt: new Date() }).where(eq(pages.pageId, existing.pageId));
    } else {
      await db.insert(pages).values({ pageId: randomUUID(), pageType, data, status: "draft" });
    }
    count++;
    console.log(`  ✓ ${pageType}${existing ? " (updated)" : ""}`);
  }
  console.log(`Successfully seeded ${count} page layouts.`);
}

if (process.argv[1]?.endsWith("pages.mjs")) {
  try {
    await seedPages();
    await sql.end({ timeout: 1 });
    process.exit(0);
  } catch (err) {
    console.error("Page seeding failed:", err);
    process.exit(1);
  }
}
