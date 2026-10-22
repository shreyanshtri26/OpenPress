import { lookup } from "node:dns/promises";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB hard cap enforced while streaming, not just via Content-Length
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FORBIDDEN_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

// Best-effort per-hostname throttle so a single warm function container can't hammer a source
// site in a tight loop. Allows short bursts (normal clicking) but caps sustained hammering.
// Not a distributed limiter - each warm container tracks its own window.
const RATE_LIMIT_WINDOW_MS = 2000;
const RATE_LIMIT_MAX_PER_WINDOW = 5;
const hostRequestTimestamps = new Map();

function isThrottled(hostname) {
    const now = Date.now();
    const recent = (hostRequestTimestamps.get(hostname) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);

    // Avoid unbounded growth of the map across a long-lived warm container
    if (hostRequestTimestamps.size > 500) hostRequestTimestamps.clear();
    hostRequestTimestamps.set(hostname, recent);

    return recent.length > RATE_LIMIT_MAX_PER_WINDOW;
}

function isPrivateIPv4(ip) {
    const octets = ip.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return false;
    const [a, b] = octets;

    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 carrier-grade NAT
    if (a === 0) return true; // 0.0.0.0/8
    return false;
}

function isPrivateIPv6(ip) {
    const normalized = ip.toLowerCase();
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);

    return (
        normalized === "::1" ||
        normalized === "::" ||
        normalized.startsWith("fe80") || // link-local
        normalized.startsWith("fc") || // unique local fc00::/7
        normalized.startsWith("fd") // unique local + cloud metadata IMDSv2 (fd00:ec2::254)
    );
}

function isPrivateIP(ip) {
    return ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

class ProxyError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Validates protocol + resolves DNS so hostnames that merely point at an internal/reserved
// IP (DNS rebinding) are rejected, not just literal "localhost"/IP strings.
async function assertPublicUrl(rawUrl) {
    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        throw new ProxyError(400, "Invalid URL format");
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new ProxyError(403, "Only HTTP/HTTPS protocols are allowed");
    }

    const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (FORBIDDEN_HOSTNAMES.has(hostname) || isPrivateIP(hostname)) {
        throw new ProxyError(403, "Internal network requests are forbidden");
    }

    let addresses;
    try {
        addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new ProxyError(400, "Could not resolve host");
    }

    if (addresses.length === 0 || addresses.some((a) => isPrivateIP(a.address))) {
        throw new ProxyError(403, "Internal network requests are forbidden");
    }

    return parsedUrl;
}

export const handler = async (event) => {
    try {
        const queryParams = event.queryStringParameters || {};
        let targetUrl = queryParams.url;

        if (!targetUrl) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing url parameter" }) };
        }

        targetUrl = decodeURIComponent(targetUrl);

        let currentUrl = targetUrl;
        let response;

        // Manually follow redirects so each hop is re-validated against SSRF rules
        for (let hop = 0; ; hop++) {
            if (hop > MAX_REDIRECTS) {
                return { statusCode: 400, body: JSON.stringify({ message: "Too many redirects" }) };
            }

            let parsedUrl;
            try {
                parsedUrl = await assertPublicUrl(currentUrl);
            } catch (err) {
                const statusCode = err instanceof ProxyError ? err.statusCode : 400;
                return { statusCode, body: JSON.stringify({ message: err.message }) };
            }

            if (isThrottled(parsedUrl.hostname)) {
                return {
                    statusCode: 429,
                    headers: { "Retry-After": "1" },
                    body: JSON.stringify({ message: "Too many requests to this source, please retry shortly" }),
                };
            }

            response = await fetch(currentUrl, {
                redirect: "manual",
                headers: {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                // Prevent fetch from hanging indefinitely on slow servers
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });

            const location = response.headers.get("location");
            if ([301, 302, 303, 307, 308].includes(response.status) && location) {
                currentUrl = new URL(location, currentUrl).toString();
                continue;
            }
            break;
        }

        // Content-Type / declared length checks (defense in depth; actual cap is enforced below)
        const contentType = response.headers.get("Content-Type") || "";
        const contentLength = response.headers.get("Content-Length");

        if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
            return { statusCode: 413, body: JSON.stringify({ message: "Payload too large (exceeds 5MB limit)" }) };
        }
        // Accept any textual content (html/xml/json incl. rss+xml, atom+xml) and unset headers;
        // block only content types that are clearly binary (images, video, octet-stream, etc.)
        const isAllowedContentType = !contentType || /text\/|[+/](xml|json|html)\b/i.test(contentType);
        if (!isAllowedContentType) {
            return { statusCode: 415, body: JSON.stringify({ message: "Unsupported content type for scraping" }) };
        }

        if (!response.ok) {
            // Pass through 429 status so the frontend knows the source site is rate-limiting us
            return {
                statusCode: response.status === 429 ? 429 : 502,
                body: JSON.stringify({ message: `Proxy fetch failed with status ${response.status}` }),
            };
        }

        // Stream the body with a hard byte cap instead of trusting Content-Length, which can be
        // absent (chunked responses) or wrong, letting a malicious/misconfigured site blow up
        // function memory.
        const reader = response.body?.getReader?.();
        if (!reader) {
            const text = await response.text();
            if (Buffer.byteLength(text, "utf-8") > MAX_BYTES) {
                return { statusCode: 413, body: JSON.stringify({ message: "Payload too large (exceeds 5MB limit)" }) };
            }
            return { statusCode: 200, body: JSON.stringify({ contents: text }) };
        }

        const chunks = [];
        let received = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            received += value.byteLength;
            if (received > MAX_BYTES) {
                await reader.cancel().catch(() => { });
                return { statusCode: 413, body: JSON.stringify({ message: "Payload too large (exceeds 5MB limit)" }) };
            }
            chunks.push(value);
        }

        const text = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf-8");

        return {
            statusCode: 200,
            body: JSON.stringify({ contents: text }),
        };
    } catch (err) {
        console.error("Proxy fetch error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error during proxy fetch", error: err.toString() }),
        };
    }
};
