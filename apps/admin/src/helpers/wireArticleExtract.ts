// Pulls the readable article out of a fetched page for Wires imports. Publishers differ, so it tries the most reliable
// source first (known body containers, then schema.org JSON-LD, then the element with the most paragraph text, then the
// meta description) and returns an empty list only when the page has no readable text.

export const ARTICLE_BODY_SELECTORS = [
    '[itemprop="articleBody"]',
    '.content-body',
    '.articlebody',
    '.article-body',
    '.article-content',
    '.article_content',
    '.story-details',
    '.story_details',
    '.story-content',
    '.storyContent',
    '.story__content',
    '.full-details',
    '.ssrcss-uf6wea-RichTextComponentWrapper',
    '[data-component="text-block"]',
    '.article__content',
    '.Normal',
    '.post-content',
    '.entry-content',
    'article',
];

const BLOCK_EXCLUDED_SELECTOR = '.slot, .inline-promo, .author-bio, .content-authors, .content-disclosure-statement, .content-partners, .content-doi, form, aside, script, style, noscript, figure, .ad-container, .newsletter-signup, .related-articles, .social-share, .fine-print, .also-read, .related, .advert, [class*="advert"], [class*="promo"], [class*="newsletter"], [class*="share"]';
const BOILERPLATE_LINE = /^(also read|read more|read also|advertisement|follow us|subscribe|sign up|click here|join our|download the|ai narration|listen to this|listen now)\b/i;

// The paragraphs, headings, quotes and lists inside a container, as editor blocks.
const walkBlocks = (container: Element): any[] => {
    const blocks: any[] = [];
    const walk = (node: Element) => {
        if (node.nodeType !== 1) return;
        if (node.matches(BLOCK_EXCLUDED_SELECTOR)) return;
        if (['BUTTON', 'INPUT', 'IFRAME', 'NOSCRIPT', 'NAV', 'FOOTER', 'HEADER'].includes(node.tagName)) return;
        const tag = node.tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tag)) {
            const html = node.innerHTML.trim();
            const plain = (node.textContent || '').replace(/\s+/g, ' ').trim();
            if (html && plain && !BOILERPLATE_LINE.test(plain)) {
                // Some sites separate paragraphs with a double <br> inside one <p>.
                const parts = tag === 'p' ? html.split(/(?:<br\s*\/?>\s*){2,}/i).map((part) => part.trim()).filter(Boolean) : [html];
                parts.forEach((part) => blocks.push({
                    type: tag === 'blockquote' ? 'quote' : (tag.startsWith('h') ? 'header' : 'paragraph'),
                    data: { text: part, ...(tag.startsWith('h') && { level: parseInt(tag[1], 10) }) },
                }));
            }
        } else if (['ul', 'ol'].includes(tag)) {
            const items = Array.from(node.querySelectorAll('li')).map((li) => li.innerHTML.trim()).filter(Boolean);
            if (items.length > 0) blocks.push({ type: 'list', data: { style: tag === 'ul' ? 'unordered' : 'ordered', items } });
        } else {
            Array.from(node.children).forEach((child) => walk(child as Element));
        }
    };
    walk(container);
    return blocks;
};

const blocksTextLength = (blocks: any[]) =>
    blocks.reduce((sum, b) => sum + String(b?.data?.text || (b?.data?.items || []).join(' ') || '').length, 0);

// Publishers often put the full text in schema.org JSON-LD, which survives layout changes.
const blocksFromJsonLd = (doc: Document): any[] => {
    let body = '';
    const visit = (node: any) => {
        if (!node || body.length > 0) return;
        if (Array.isArray(node)) { node.forEach(visit); return; }
        if (typeof node !== 'object') return;
        if (typeof node.articleBody === 'string' && node.articleBody.length > 200) { body = node.articleBody; return; }
        Object.values(node).forEach(visit);
    };
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try { visit(JSON.parse(script.textContent || '')); } catch { /* not valid JSON-LD */ }
    });
    const clean = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    return body
        .split(/\r?\n+|(?<=[.!?])\s{2,}/)
        .map(clean)
        .filter((line) => line.length > 0 && !BOILERPLATE_LINE.test(line))
        .map((line) => ({ type: 'paragraph', data: { text: line } }));
};

// Last resort: the element holding the most paragraph text (a small readability heuristic).
export const findMainContent = (doc: Document): Element | null => {
    let best: Element | null = null;
    let bestScore = 0;
    doc.querySelectorAll('article, main, section, div').forEach((el) => {
        if (el.closest('nav, header, footer, aside')) return;
        const score = Array.from(el.children)
            .filter((child) => child.tagName === 'P')
            .reduce((sum, p) => sum + Math.min((p.textContent || '').trim().length, 600), 0);
        if (score > bestScore) { best = el; bestScore = score; }
    });
    return bestScore >= 250 ? best : null;
};

// Best effort, most reliable source first. Empty only when the page truly has no readable text.
export const extractBlocksFromDoc = (doc: Document): any[] => {
    const container = ARTICLE_BODY_SELECTORS.map((selector) => doc.querySelector(selector)).find(Boolean) || null;
    let blocks = container ? walkBlocks(container) : [];
    if (blocksTextLength(blocks) >= 400) return blocks;

    const fromJsonLd = blocksFromJsonLd(doc);
    if (blocksTextLength(fromJsonLd) > blocksTextLength(blocks)) blocks = fromJsonLd;
    if (blocksTextLength(blocks) >= 400) return blocks;

    const main = findMainContent(doc);
    const fromMain = main ? walkBlocks(main) : [];
    if (blocksTextLength(fromMain) > blocksTextLength(blocks)) blocks = fromMain;
    if (blocks.length > 0) return blocks;

    const description = doc.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute('content')?.trim();
    return description ? [{ type: 'paragraph', data: { text: description } }] : [];
};

