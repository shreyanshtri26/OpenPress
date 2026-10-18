import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { pages } from "../../db/schema.mjs";
import dynamoClient from "../../dynamoClient.mjs";

const CAMPAIGN_TABLE = process.env.DYNAMO_CAMPAIGN_TABLE_NAME;

// response helper
function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { campaignId } = body;

    if (!campaignId) {
      return json(400, { message: "campaignId is required" });
    }

    /* ------------------------------------------------ */
    /* 1️⃣ Fetch Campaign                               */
    /* ------------------------------------------------ */

    const campaignRes = await dynamoClient.send(
      new GetCommand({
        TableName: CAMPAIGN_TABLE,
        Key: { campaignId },
      })
    );

    const campaign = campaignRes.Item;

    if (!campaign) {
      return json(404, { message: "Campaign not found" });
    }

    const jobs = campaign.jobs || [];

    /* ------------------------------------------------ */
    /* 2️⃣ Fetch Home Page JSON                         */
    /* ------------------------------------------------ */

    // Page Builder pages live in Postgres.
    const allPages = await db.select().from(pages);
    
    const targetPages = allPages.filter(page => {
      const type = page.pageType;
    
      return (
        type === "Home" ||
        type === "Blog" ||
        (type && type.startsWith("Section"))
      );
    });

    

    /* ------------------------------------------------ */
    /* 3️⃣ Placement → Component Mapping                */
    /* ------------------------------------------------ */

    const placementComponentMap = {
      "leaderboard": "LeaderboardAd",
      "sidebar-rectangle": "SidebarAd",
      "in-story": "InStoryAd",
    };

    /* ------------------------------------------------ */
    /* 4️⃣ Helper to update component adId              */
    /* ------------------------------------------------ */

    // const updateAdComponent = (component, componentType, newAdId) => {
    //   if (component.type === componentType) {
    //     if (!component.props) component.props = {};
    //     component.props.adId = newAdId;
    //   }
    // };

    /* ------------------------------------------------ */
    /* 5️⃣ Process placements                           */
    /* ------------------------------------------------ */

    const ensureLeaderboardExists = (content, newAdId) => {
      if (!Array.isArray(content)) return content;
    
      let hasLeaderboard = false;
      let navbarIndex = -1;
    
      for (let i = 0; i < content.length; i++) {
        const comp = content[i];
    
        if (comp.type === "LeaderboardAd") {
          hasLeaderboard = true;
    
          if (!comp.props) comp.props = {};
          comp.props.adId = newAdId;
        }
    
        if (comp.type === "AtlanticNavbar") {
          navbarIndex = i;
        }
      }
    
      // insert if missing
      if (!hasLeaderboard) {
        const newComponent = {
          type: "LeaderboardAd",
          props: {
            id: `LeaderboardAd-${Date.now()}`,
            adId: newAdId
          }
        };
    
        // insert after navbar OR fallback to top
        if (navbarIndex !== -1) {
          content.splice(navbarIndex + 1, 0, newComponent);
        } else {
          content.unshift(newComponent);
        }
      }
    
      return content;
    };

    const ensureSidebarInHome = (data, newAdId) => {
      if (!data || !data.content || !data.zones) return data;
    
      // ✅ Step 1: Check HeroGrid exists
      const heroGrid = data.content.find(comp => comp.type === "HeroGrid");
      if (!heroGrid) return data;
    
      const heroGridId = heroGrid.props?.id;
      if (!heroGridId) return data;
    
      const zoneKey = `${heroGridId}:hero-grid-right-0`;
    
      // 🔥 ALWAYS OVERRIDE (important change)
      data.zones[zoneKey] = [
        {
          type: "SidebarAd",
          props: {
            id: `SidebarAd-${Date.now()}`,
            adId: newAdId
          }
        }
      ];
    
      return data;
    };

    const ensureSidebarInBlog = (data, newAdId) => {
      if (!data || !data.content || !data.zones) return data;
    
      // ✅ Step 1: Check BlogGrid exists
      const blogGrid = data.content.find(comp => comp.type === "BlogGrid");
    
      if (!blogGrid) return data;
    
      const blogGridId = blogGrid.props?.id;
      if (!blogGridId) return data;
    
      const zoneKey = `${blogGridId}:blog-grid-right-1`;
    
      // 🔥 ALWAYS OVERRIDE (same as home logic)
      data.zones[zoneKey] = [
        {
          type: "SidebarAd",
          props: {
            id: `SidebarAd-${Date.now()}`,
            adId: newAdId
          }
        }
      ];
    
      return data;
    };

    const now = new Date().toISOString();
    const updatedPages = [];

    for (const page of targetPages) {
      const { pageId, data, status } = page;
    
      if (!data) continue;
    
      const newData = JSON.parse(JSON.stringify(data)); // ✅ correct
    
      for (const job of jobs) {
        const placement = job.placement;
    
        // ✅ LEADERBOARD
        if (placement === "leaderboard") {
          const newAdId = `${campaignId}-leaderboard`;
    
          if (Array.isArray(newData.content)) {
            newData.content = ensureLeaderboardExists(newData.content, newAdId);
          }
        }
    
        // ✅ SIDEBAR
        if (placement === "sidebar-rectangle") {
          const newAdId = `${campaignId}-sidebar-rectangle`;
    
          if (page.pageType === "Home") {
            ensureSidebarInHome(newData, newAdId);
          }
    
          if (page.pageType && page.pageType.startsWith("Blog")) {
            ensureSidebarInBlog(newData, newAdId);
          }
        }
      }
    
      // ✅ VERY IMPORTANT
      page.data = newData;
    
      await db
        .update(pages)
        .set({ data: page.data, status: status || "draft", updatedAt: new Date(now) })
        .where(eq(pages.pageId, pageId));
    
      updatedPages.push(pageId);
    }

    

    /* ------------------------------------------------ */
    /* 7️⃣ Response                                     */
    /* ------------------------------------------------ */

    return json(200, {
      message: "Campaign published to all pages",
      campaignId,
      placements: jobs.map(j => j.placement).filter(Boolean),
      updatedPages
    });

  } catch (error) {
    console.error("Publish campaign error:", error);

    return json(500, {
      message: "Server error",
      error: error.message,
    });
  }
};