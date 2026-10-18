// GET /taxonomy/colors: { colors: { "<value>": "#hex" } } across all taxonomies. Public: the published site reads it
//   to tint category chips and nav pills. PUT /taxonomy/colors { taxonomy, value, color }: Admin / Super User; empty color clears.
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { taxonomies } from "../../db/schema.mjs";

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const HEX = /^#[0-9a-fA-F]{6}$/;

export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  try {
    if (method === "GET") {
      const rows = await db.select({ colors: taxonomies.colors }).from(taxonomies);
      return json(200, { colors: Object.assign({}, ...rows.map((r) => r.colors || {})) });
    }

    const role = String(event.user?.role || "").toLowerCase();
    if (role !== "super user" && role !== "admin") return json(403, { message: "Only an Admin or Super User can set colors" });

    const { taxonomy, value, color } = JSON.parse(event.body || "{}");
    if (!taxonomy || !value || (color && !HEX.test(color))) return json(400, { message: "taxonomy, value and a #rrggbb color are required" });

    const [row] = await db.select().from(taxonomies).where(eq(taxonomies.name, taxonomy));
    if (!row) return json(404, { message: "Taxonomy not found" });

    const colors = { ...(row.colors || {}) };
    if (color) colors[value] = color; else delete colors[value];
    await db.update(taxonomies).set({ colors, updatedAt: new Date() }).where(eq(taxonomies.taxonomyId, row.taxonomyId));
    return json(200, { colors });
  } catch (err) {
    console.error("taxonomy colors failed:", err);
    return json(500, { message: "Could not update colors" });
  }
};
