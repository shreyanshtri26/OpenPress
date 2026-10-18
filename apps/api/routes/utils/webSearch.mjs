import { PutCommand } from "../../db/commands.mjs";
import dynamoClient from "../../dynamoClient.mjs";
import { randomUUID } from "crypto";
import { generateGrounded } from "../../lib/gemini.mjs";

const SEARCH_HISTORY_TABLE = process.env.DYNAMO_SEARCH_HISTORY_TABLE || 'op_searchhistory';

const FRESHNESS = { pd: 'past 24 hours', pw: 'past week', pm: 'past month', py: 'past year' };

// Gemini cites sources through a Google redirect link; follow it once to get the real article URL.
async function resolveUrl(uri) {
    try {
        const res = await fetch(uri, { redirect: 'manual', signal: AbortSignal.timeout(4000) });
        return res.headers.get('location') || null;
    } catch {
        return null;
    }
}

// Turn the numbered "headline | summary | age" answer into results, linking each line to its cited source.
export function parseResults({ text, chunks, supports }) {
    const out = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*\d+\.\s*(.+)$/);
        if (!m) continue;
        const strip = (s) => s.replace(/\*\*/g, '').trim();
        // The model sometimes adds or reorders cells: age is the cell that looks like one, the summary the longest of the rest.
        const cells = m[1].split('|').map(strip).filter(Boolean);
        const age = cells.find((c) => /^(\d+\s+\w+ ago|unknown)$/i.test(c)) ?? '';
        const rest = cells.filter((c) => c !== age);
        if (rest.length < 2) continue;
        const description = rest.slice(1).sort((x, y) => y.length - x.length)[0];
        const idx = supports.find((s) => s.text.trim() && line.includes(s.text.trim().slice(0, 40)))?.chunks[0];
        if (idx === undefined || !chunks[idx]?.uri) continue;
        out.push({ title: rest[0], description, age: /^unknown$/i.test(age) ? '' : age, uri: chunks[idx].uri, site: chunks[idx].title });
    }
    return out;
}

// Brave Search, used first when BRAVE_API_KEY is set. A quota/rate error or outage falls through to Gemini.
async function braveSearch(query, offset, freshness) {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&offset=${offset}` +
        (freshness ? `&freshness=${encodeURIComponent(freshness)}&count=20` : '&count=10');
    const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Brave search failed (${res.status})`);
    return res.json();
}

async function geminiSearch(query, offset, freshness) {
    const window = FRESHNESS[freshness];
    const first = Number(offset) * 10 + 1;
    // ponytail: Gemini has no real paging, so later pages ask for the next ranks; fine for a few pages
    const found = await generateGrounded(
        `Search the web for: "${query}". ${window ? `Only include pages published within the ${window}. ` : ''}` +
        `List distinct web pages / news articles ranked ${first} to ${first + 9} by relevance and recency. ` +
        'One per line, numbered, in exactly this format: "1. headline | one-sentence summary | how old, like 3 hours ago or 2 days ago, or unknown". No other text.',
    );
    const parsed = parseResults(found);
    const urls = await Promise.all(parsed.map((r) => resolveUrl(r.uri)));
    const seen = new Set();
    const results = parsed.flatMap((r, i) => {
        const url = urls[i];
        if (!url || seen.has(url)) return [];
        seen.add(url);
        return [{ title: r.title, url, description: r.description, age: r.age, ...(r.site && { profile: { name: r.site } }) }];
    });
    return { web: { results } };
}

// Whichever provider has a key; Brave first, Gemini when Brave is missing or fails.
async function search(query, offset, freshness) {
    if (process.env.BRAVE_API_KEY) {
        try { return await braveSearch(query, offset, freshness); }
        catch (err) {
            if (!process.env.GEMINI_API_KEY) throw err;
            console.warn(`${err.message}; falling back to Gemini`);
        }
    }
    return geminiSearch(query, offset, freshness);
}

export const handler = async (event) => {
    const query = event.queryStringParameters?.q;
    const offset = event.queryStringParameters?.offset || 0;
    const freshness = event.queryStringParameters?.freshness;
    const user = event.user;

    if (!query) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Query parameter "q" is required' }),
        };
    }

    try {
        const data = await search(query, offset, freshness);

        const isPreview = event.queryStringParameters?.preview === 'true';

        // Save search history to database (skip if it's just fetching previews for history feed)
        if (!isPreview) {
            try {
                await dynamoClient.send(new PutCommand({
                    TableName: SEARCH_HISTORY_TABLE,
                    Item: {
                        searchId: randomUUID(),
                        userId: user?.userId || user?.email || 'anonymous',
                        userName: user?.userName || user?.email || 'Anonymous',
                        userEmail: user?.email || '',
                        query: query,
                        timestamp: new Date().toISOString(),
                        offset: offset,
                        resultsCount: data.web?.results?.length || 0
                    }
                }));
                console.log(`📊 Search history saved for user: ${user?.userName || 'anonymous'}`);
            } catch (dbError) {
                console.error('❌ Error saving search history:', dbError);
                // We don't return an error to the user if history tracking fails
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error('Web search error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message || 'An unexpected error occurred on the server.' }),
        };
    }
};
