import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UserContext } from '../../context/UserContext';
import CustomButton from '../common/CustomButton';
import env from '@/utils/env';
import apiFetch from '@/utils/api';
import toast from 'react-hot-toast';
import { useRouter } from '@/hooks/useRouter';
import DataGrid, {
    Column,
    ColumnChooser,
    Export,
    FilterRow,
    Grouping,
    GroupPanel,
    HeaderFilter,
    Paging,
    Pager,
    Selection,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/dx/data-grid';
import { AllStoriesHeader } from './all-stories/AllStoriesHeader';
import { AdminMobileSidebarToggle } from '../SideBar/AdminDashboardLayout';
import { createGridExportHandler } from '../../utils/dataGridExport';
const SCRAPED_ENDPOINTS = [
    '/story/scrapedStories',
];

const LOCAL_SNAPSHOT_PATH = '/scraped-stories.json';
const FEED_URL_RSS = 'https://theconversation.com/topics/new-zealand-205/articles.rss';
const FEED_URL_ATOM = 'https://theconversation.com/topics/new-zealand-205/articles.atom';
const ARTICLE_SCRAPE_CACHE_PREFIX = 'openpress_article_scrape_';

const editorJsToText = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        return value.map(item => editorJsToText(item)).filter(Boolean).join('\n\n');
    }
    if (typeof value === 'object') {
        if (Array.isArray(value.blocks)) {
            return value.blocks
                .map((block: any) => editorJsToText(block?.data?.text || block?.data?.caption || block?.text || ''))
                .filter(Boolean)
                .join('\n\n');
        }
        return editorJsToText(value.data?.text || value.data?.caption || value.text || value.caption || '');
    }
    return '';
};

const text = (value: any = '') =>
    String(value)
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const ARTICLE_BODY_SELECTORS = [
    '[itemprop="articleBody"]',
    '.content-body',
    'article',
    '.article-body',
    '.post-content',
    '.entry-content',
];

const ARTICLE_SUMMARY_EXCLUDED_SELECTOR = '.slot, .inline-promo, .author-bio, .content-authors, .content-authors-group, [itemprop="author"], .role, .content-disclosure-statement, .content-partners, .content-doi, form, aside, script, style, .ad-container, .newsletter-signup, .related-articles, .social-share, .fine-print, .tags, .tag-list, .content-tags, .article-tags, .story-tags';

const getArticleBodyContainer = (doc: Document) =>
    ARTICLE_BODY_SELECTORS.map(selector => doc.querySelector(selector)).find(Boolean) || null;

const getVerifiedArticleBodyContainer = (doc: Document) =>
    ARTICLE_BODY_SELECTORS
        .filter(selector => selector !== 'article')
        .map(selector => doc.querySelector(selector))
        .find(Boolean) || null;

const extractVerifiedFirstArticleParagraph = (doc: Document): string => {
    const bodyContainer = getVerifiedArticleBodyContainer(doc);
    if (!bodyContainer) return '';

    const paragraphs = bodyContainer.matches('p')
        ? [bodyContainer]
        : Array.from(bodyContainer.querySelectorAll('p'));

    for (const paragraph of paragraphs) {
        if (paragraph.closest(ARTICLE_SUMMARY_EXCLUDED_SELECTOR)) continue;

        const plainText = (paragraph.textContent || '').replace(/\s+/g, ' ').trim();
        if (!plainText) continue;
        if (plainText.toLowerCase().includes('does not work for, consult')) continue;
        if (/^\(?about the author\b/i.test(plainText)) continue;
        if (/^(?:tags?|topics?|keywords?|categories|category)\s*:/i.test(plainText)) continue;

        return plainText;
    }

    return '';
};

const getArticleScrapeCacheKey = (sourceUrl: string) => `${ARTICLE_SCRAPE_CACHE_PREFIX}${sourceUrl}`;

const readCachedArticleScrape = (sourceUrl: string) => {
    try {
        const cached = localStorage.getItem(getArticleScrapeCacheKey(sourceUrl));
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const writeCachedArticleScrape = (sourceUrl: string, data: any) => {
    try {
        localStorage.setItem(getArticleScrapeCacheKey(sourceUrl), JSON.stringify({
            ...data,
            cachedAt: Date.now(),
        }));
    } catch { }
};

const extractBody = (item: any) => {
    const raw = item.body ||
        item.fullDescription ||
        item.storySummary ||
        item.summary ||
        editorJsToText(item.description) ||
        editorJsToText(item.content) ||
        item.excerpt ||
        '';

    // If it's already a JSON string (blocks) or has HTML, don't strip it aggressively here
    // But clean up CDATA
    return String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
};

const toIsoDate = (value: any = '') => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const getItemNodeText = (item: Element, selectors: string[] = []) => {
    for (const selector of selectors) {
        const node = item.querySelector(selector);
        if (!node) continue;
        if (selector === 'link' && node.getAttribute('href')) {
            return node.getAttribute('href');
        }
        const value = text(node.textContent || '');
        if (value) return value;
    }
    return '';
};

const parseRssRows = (xmlString: string) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item, entry'));

    return items.map((item, index) => {
        const title = getItemNodeText(item, ['title']) || 'Untitled';
        const sourceUrl = getItemNodeText(item, ['link']);
        const authorName = getItemNodeText(item, ['dc\\:creator', 'creator', 'author', 'name']) || 'The Conversation';
        const body = getItemNodeText(item, ['content\\:encoded', 'encoded', 'description', 'summary', 'content']);
        const publishedAt = toIsoDate(getItemNodeText(item, ['pubDate', 'published', 'updated']));
        const source = 'The Conversation IN (Live)';

        return {
            id: `${index}-${sourceUrl || title}`,
            title,
            sourceUrl,
            authorName,
            author_bio: '',
            body,
            publishedAt,
            importedAt: null,
            source,
            status: 'rss_preview',
        };
    });
};

const fetchLocalSnapshotRows = async () => {
    const response = await fetch(LOCAL_SNAPSHOT_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error('Local snapshot not found.');
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
};

const fetchWithTimeout = async (url: string, timeout = 8000, headers?: HeadersInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal, headers });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
};

const fetchWithProxies = async (url: string, minLength = 500, token?: string) => {
    const proxies = [
        // Own backend proxy requires auth and needs more time than public fallbacks since it's actually reliable
        { url: `${env.backendApi}/api/proxy?url=${encodeURIComponent(url)}`, isJson: true, timeout: 9000, auth: true },
        { url: `https://api.cors.lol/?url=${encodeURIComponent(url)}`, isJson: false, timeout: 2500, auth: false },
        { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, isJson: false, timeout: 2500, auth: false },
        { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, isJson: false, timeout: 2500, auth: false },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, isJson: true, timeout: 2500, auth: false },
        { url: `https://corsproxy.io/?url=${encodeURIComponent(url)}`, isJson: false, timeout: 2500, auth: false },
        { url: `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`, isJson: false, timeout: 2500, auth: false },
    ];

    const tryProxy = async (proxy: typeof proxies[0]): Promise<string> => {
        const headers = proxy.auth && token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await fetchWithTimeout(proxy.url, proxy.timeout, headers);
        if (!response.ok) {
            throw new Error(`Proxy status error: ${response.status}`);
        }
        let textOutput = '';
        if (proxy.isJson) {
            const data = await response.json();
            textOutput = data.contents;
            if (textOutput && textOutput.startsWith('data:')) {
                const commaIndex = textOutput.indexOf(',');
                if (commaIndex !== -1) {
                    const base64Str = textOutput.substring(commaIndex + 1);
                    const binary = atob(base64Str);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    textOutput = new TextDecoder('utf-8').decode(bytes);
                }
            }
        } else {
            textOutput = await response.text();
        }
        if (textOutput && textOutput.length > minLength) {
            return textOutput;
        }
        throw new Error('Response empty or too short');
    };

    for (const proxy of proxies) {
        try {
            return await tryProxy(proxy);
        } catch (err) {
            console.warn(`Proxy failed for URL: ${proxy.url}`, err);
        }
    }

    console.warn('All proxies failed for URL:', url);
    return null;
};

const parseHtmlToBlocks = (htmlString: string): string => {
    if (!htmlString) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const contentBlocks: any[] = [];

        const walk = (node: Element) => {
            if (node.nodeType !== 1) return;
            if (node.matches('.slot, .inline-promo, .author-bio, .content-authors, .content-disclosure-statement, .content-partners, .content-doi, form, aside, script, style, .ad-container, .newsletter-signup, .related-articles, .social-share, .fine-print')) return;
            if (['BUTTON', 'INPUT', 'IFRAME', 'NOSCRIPT'].includes(node.tagName)) return;

            const tagName = node.tagName.toLowerCase();
            if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tagName)) {
                const payloadText = node.innerHTML.trim();
                if (payloadText.length > 0) {
                    contentBlocks.push({
                        type: (tagName === 'blockquote' ? 'quote' : (tagName.startsWith('h') ? 'header' : 'paragraph')),
                        data: { text: payloadText, ...(tagName.startsWith('h') && { level: parseInt(tagName[1]) }) }
                    });
                }
            } else if (['ul', 'ol'].includes(tagName)) {
                const items = Array.from(node.querySelectorAll('li')).map(li => li.innerHTML.trim()).filter(Boolean);
                if (items.length > 0) {
                    contentBlocks.push({ type: 'list', data: { style: tagName === 'ul' ? 'unordered' : 'ordered', items } });
                }
            } else {
                Array.from(node.children).forEach(child => walk(child as Element));
            }
        };

        walk(doc.body);

        if (contentBlocks.length > 0) {
            return JSON.stringify(contentBlocks);
        }
    } catch (e) {
        console.error('Error parsing HTML to blocks:', e);
    }
    return '';
};

const parseRssJsonRows = (data: any) => {
    if (!data || !Array.isArray(data.items)) return [];
    return data.items.map((item: any, index: number) => {
        const title = item.title || 'Untitled';
        const sourceUrl = item.link || item.guid || '';
        const authorName = item.author || 'The Conversation';

        const rawHtml = item.content || item.description || '';
        const blocksJson = parseHtmlToBlocks(rawHtml);
        const hasBlocks = blocksJson && blocksJson.length > 50;

        const publishedAt = toIsoDate(item.pubDate);
        const source = 'The Conversation IN (Live)';

        return {
            id: `${index}-${sourceUrl || title}`,
            title,
            sourceUrl,
            authorName,
            author_bio: '',
            body: hasBlocks ? blocksJson : (item.description || item.content || ''),
            publishedAt,
            importedAt: null,
            source,
            status: hasBlocks ? 'scraped' : 'rss_preview',
        };
    });
};

const fetchRssRows = async (token?: string) => {
    const candidates = [
        FEED_URL_ATOM,
        FEED_URL_RSS,
    ];

    // 1. Try rss2json first as it handles feeds reliably in client environments
    for (const feedUrl of candidates) {
        try {
            const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
            const response = await fetchWithTimeout(rss2jsonUrl, 8000);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
                    const rows = parseRssJsonRows(data);
                    if (rows.length > 0) return rows;
                }
            }
        } catch (err) {
            console.warn(`rss2json failed for ${feedUrl}:`, err);
        }
    }

    // 2. Fall back to fetching XML via CORS proxies
    for (const feedUrl of candidates) {
        try {
            const xmlText = await fetchWithProxies(feedUrl, 100, token);
            if (xmlText) {
                const rows = parseRssRows(xmlText);
                if (rows.length > 0) return rows;
            }
        } catch (err) {
            console.warn(`Feed ${feedUrl} failed with XML proxies:`, err);
        }
    }
    throw new Error('Could not fetch RSS feed.');
};

const convertBlocksToHtml = (blocks: any[]): string => {
    if (!Array.isArray(blocks)) return '';
    return blocks
        .map((block: any) => {
            const type = block.type || 'paragraph';
            const data = block.data || {};
            const textContent = data.text || '';

            switch (type) {
                case 'paragraph':
                    return `<p>${textContent}</p>`;
                case 'header':
                    const level = data.level || 2;
                    return `<h${level}>${textContent}</h${level}>`;
                case 'quote':
                    return `<blockquote>${textContent}</blockquote>`;
                case 'list': {
                    const tag = data.style === 'ordered' ? 'ol' : 'ul';
                    const items = Array.isArray(data.items)
                        ? data.items.map((item: any) => `  <li>${item}</li>`).join('\n')
                        : '';
                    return `<${tag}>\n${items}\n</${tag}>`;
                }
                default:
                    return `<p>${textContent}</p>`;
            }
        })
        .join('\n');
};

interface SignalsProps {
    onBack: () => void;
}

export default function Signals({ onBack }: SignalsProps) {
    const userContext = useContext(UserContext);
    const user = userContext?.user ?? null;
    const router = useRouter();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [importingId, setImportingId] = useState<string | null>(null);
    const [importedUrls, setImportedUrls] = useState<string[]>([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('openpress_imported_urls');
            if (raw) setImportedUrls(JSON.parse(raw));
        } catch (e) { /* ignore */ }
    }, []);

    const backendApi = env.backendApi;

    const normalizeRows = useCallback((payload: any) => {
        let importedUrls: string[] = [];
        try {
            const raw = localStorage.getItem('openpress_imported_urls');
            if (raw) importedUrls = JSON.parse(raw);
        } catch (e) { /* ignore */ }

        const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
                ? payload
                : payload?.data
                    ? [payload.data]
                    : [];

        return list.map((item: any, index: number) => {
            const sourceUrl = item.sourceUrl || item.url || '';
            const isImported = item.status === 'ingested' || importedUrls.includes(sourceUrl);

            return {
                id: item.scrapedStoryId || item.storyId || item.id || `${index}-${sourceUrl || item.title}`,
                title: item.title || 'Untitled',
                sourceUrl: sourceUrl,
                authorName: item.authorName || item.author || 'Unknown',
                author_bio: item.author_bio || item.authorBio || '',
                body: extractBody(item),
                publishedAt: item.publishedAt || item.publishedDate || null,
                importedAt: item.createdAt || item.importedAt || item.updatedAt || null,
                source: item.source || 'The Conversation IN',
                status: isImported ? 'ingested' : (item.status || 'new'),
            };
        });
    }, []);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        setError('');
        let hasData = false;

        // Try to load from localStorage cache first
        try {
            const cached = localStorage.getItem('openpress_scraped_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setRows(parsed);
                    hasData = true;
                    setLoading(false);
                }
            }
        } catch { }

        if (backendApi) {
            for (const path of SCRAPED_ENDPOINTS) {
                const url = `${backendApi}${path}`;
                try {
                    const response = await apiFetch(url, {
                        headers: {
                            'Content-Type': 'application/json',
                            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                        },
                    });
                    if (!response.ok) continue;
                    const data = await response.json();
                    const normalized = normalizeRows(data);
                    if (normalized.length > 0) {
                        setRows(normalized);
                        localStorage.setItem('openpress_scraped_cache', JSON.stringify(normalized));
                        hasData = true;
                        setLoading(false);
                        return;
                    }
                } catch { }
            }
        }

        if (!hasData) {
            try {
                const localRows = await fetchLocalSnapshotRows();
                const normalized = normalizeRows({ data: localRows });
                if (normalized.length > 0) {
                    setRows(normalized);
                    hasData = true;
                    setLoading(false);
                    return;
                }
            } catch { }

            try {
                const rssRows = await fetchRssRows(user?.token || undefined);
                if (rssRows.length > 0) {
                    setRows(rssRows);
                    hasData = true;
                    setLoading(false);
                    return;
                }
            } catch (rssError: any) {
                if (!hasData) setError('No stories found. Try "Fetch Live" for the latest updates.');
            }
        }

        setLoading(false);
    }, [backendApi, user?.token, normalizeRows]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const handleFetchLive = async () => {
        setIsScraping(true);
        setError('');
        toast.loading('Fetching live RSS feed...', { id: 'scrape' });

        try {
            const rssRows = await fetchRssRows(user?.token || undefined);
            setRows(rssRows);
            localStorage.setItem('openpress_scraped_cache', JSON.stringify(rssRows));
            toast.success(`Found ${rssRows.length} latest stories.`, { id: 'scrape' });
        } catch (err: any) {
            console.error('Fetch live error:', err);
            setError(err.message);
            toast.error('Failed to fetch live feed.', { id: 'scrape' });
        } finally {
            setIsScraping(false);
        }
    };

    const handleImport = useCallback(async (story: any) => {
        if (!backendApi) return;
        setImportingId(story.id);
        toast.loading(`Importing...`, { id: 'import' });
        try {
            let finalStory = { ...story };
            let verifiedFirstArticleParagraph: string | null = null;

            // Dynamically scrape the full article and author details if not already done
            if (story.sourceUrl && (story.status !== 'scraped' || !story.author_bio)) {
                const cachedScrape = readCachedArticleScrape(story.sourceUrl);
                if (cachedScrape) {
                    finalStory = {
                        ...finalStory,
                        ...cachedScrape,
                        sourceUrl: finalStory.sourceUrl,
                    };
                    console.log('handleImport: Using cached scrape for story:', story.sourceUrl);
                } else {
                    console.log('handleImport: Story not fully scraped. Scraping now...', story.sourceUrl);
                    try {
                        const html = await fetchWithProxies(story.sourceUrl, 1000, user?.token || undefined);
                        if (html) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');
                            verifiedFirstArticleParagraph = extractVerifiedFirstArticleParagraph(doc);

                            let scrapedAuthorName = '';
                            let scrapedAuthorBio = '';

                            const authorNodes = doc.querySelectorAll('.content-authors li.vcard, .content-authors-group li.vcard, [itemprop="author"]');
                            if (authorNodes && authorNodes.length > 0) {
                                const authorNames: string[] = [];
                                const authorBios: string[] = [];

                                authorNodes.forEach((n) => {
                                    const nameNode = n.querySelector('.author-name, [itemprop="name"]');
                                    if (nameNode && nameNode.textContent) authorNames.push(nameNode.textContent.trim());

                                    const roleNode = n.querySelector('.role, .author-bio');
                                    if (roleNode && roleNode.textContent) authorBios.push(roleNode.textContent.trim());
                                });

                                if (authorNames.length > 0) scrapedAuthorName = Array.from(new Set(authorNames)).join(', ');
                                if (authorBios.length > 0) scrapedAuthorBio = Array.from(new Set(authorBios)).join(' | ');
                            }

                            if (!scrapedAuthorName) {
                                const nameNode = doc.querySelector('.author-name, [itemprop="name"]');
                                if (nameNode) scrapedAuthorName = nameNode.textContent?.trim() || '';
                            }
                            if (!scrapedAuthorBio) {
                                const roleNode = doc.querySelector('.role, .author-bio');
                                if (roleNode) scrapedAuthorBio = roleNode.textContent?.trim() || '';
                            }

                            const bodyContainer = getArticleBodyContainer(doc);

                            if (bodyContainer) {
                                const contentBlocks: any[] = [];
                                const walk = (node: Element) => {
                                    if (node.nodeType !== 1) return;
                                    if (node.matches('.slot, .inline-promo, .author-bio, .content-authors, .content-disclosure-statement, .content-partners, .content-doi, form, aside, script, style, .ad-container, .newsletter-signup, .related-articles, .social-share, .fine-print')) return;
                                    if (['BUTTON', 'INPUT', 'IFRAME', 'NOSCRIPT'].includes(node.tagName)) return;

                                    const tagName = node.tagName.toLowerCase();
                                    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tagName)) {
                                        const payloadText = node.innerHTML.trim();
                                        if (payloadText.length > 0) {
                                            contentBlocks.push({
                                                type: (tagName === 'blockquote' ? 'quote' : (tagName.startsWith('h') ? 'header' : 'paragraph')),
                                                data: { text: payloadText, ...(tagName.startsWith('h') && { level: parseInt(tagName[1]) }) }
                                            });
                                        }
                                    } else if (['ul', 'ol'].includes(tagName)) {
                                        const items = Array.from(node.querySelectorAll('li')).map(li => li.innerHTML.trim()).filter(Boolean);
                                        if (items.length > 0) {
                                            contentBlocks.push({ type: 'list', data: { style: tagName === 'ul' ? 'unordered' : 'ordered', items } });
                                        }
                                    } else {
                                        Array.from(node.children).forEach(child => walk(child as Element));
                                    }
                                };

                                walk(bodyContainer as Element);

                                if (contentBlocks.length > 0) {
                                    finalStory.body = JSON.stringify(contentBlocks);
                                    finalStory.status = 'scraped';
                                    if (scrapedAuthorName) finalStory.authorName = scrapedAuthorName;
                                    if (scrapedAuthorBio) finalStory.author_bio = scrapedAuthorBio;
                                    writeCachedArticleScrape(story.sourceUrl, {
                                        body: finalStory.body,
                                        status: finalStory.status,
                                        authorName: finalStory.authorName,
                                        author_bio: finalStory.author_bio || '',
                                    });
                                    console.log('handleImport: Successfully scraped story details:', { scrapedAuthorName, scrapedAuthorBio });
                                }
                            }
                        } else {
                            verifiedFirstArticleParagraph = '';
                        }
                    } catch (scrapeErr) {
                        verifiedFirstArticleParagraph = '';
                        console.error('handleImport: Scrape error on import:', scrapeErr);
                    }
                }
            }

            if (verifiedFirstArticleParagraph === null && story.sourceUrl) {
                try {
                    const html = await fetchWithProxies(story.sourceUrl, 1000, user?.token || undefined);
                    if (html) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        verifiedFirstArticleParagraph = extractVerifiedFirstArticleParagraph(doc);
                    } else {
                        verifiedFirstArticleParagraph = '';
                    }
                } catch (scrapeErr) {
                    verifiedFirstArticleParagraph = '';
                    console.error('handleImport: Summary scrape error on import:', scrapeErr);
                }
            }

            const rawSlug = finalStory.sourceUrl?.split('/').filter(Boolean).pop();
            const slug = rawSlug ? `/${rawSlug}` : `/scraped-${Date.now()}`;
            let bodyBlocks = [];
            let replacedDisclosure = false;

            try {
                const parsed = JSON.parse(finalStory.body);
                if (Array.isArray(parsed)) {
                    bodyBlocks = parsed.map((b: any) => {
                        const blockText = b.data?.text || b.text || '';
                        if (typeof blockText === 'string' && blockText.includes('does not work for, consult')) {
                            replacedDisclosure = true;
                            return {
                                id: `block-${Math.random().toString(36).substr(2, 9)}`,
                                type: 'paragraph',
                                data: {
                                    text: ''
                                }
                            };
                        }
                        return {
                            id: `block-${Math.random().toString(36).substr(2, 9)}`,
                            type: b.type || 'paragraph',
                            data: b.data || { text: b.text || '' }
                        };
                    }).filter((b: any) => b.data.text !== '');
                }
            } catch {
                const paragraphs = (finalStory.body || '').split('\n\n').filter(Boolean);
                bodyBlocks = paragraphs.map((text: string, idx: number) => {
                    if (text.includes('does not work for, consult')) {
                        replacedDisclosure = true;
                        return {
                            id: `block-${idx}-${Date.now()}`,
                            type: 'paragraph',
                            data: {
                                text: ''
                            }
                        };
                    }
                    return {
                        id: `block-${idx}-${Date.now()}`,
                        type: 'paragraph',
                        data: { text }
                    };
                }).filter((b: any) => b.data.text !== '');
            }

            // Always append the author bio at the end of the bodyBlocks if author_bio is available
            console.log('--- Author Bio Import Debug ---');
            console.log('finalStory.author_bio:', finalStory.author_bio);
            console.log('replacedDisclosure:', replacedDisclosure);
            console.log('bodyBlocks length before checking end block:', bodyBlocks.length);

            if (finalStory.author_bio) {
                const lastBlock = bodyBlocks[bodyBlocks.length - 1];
                const hasAboutAuthor = lastBlock &&
                    lastBlock.type === 'paragraph' &&
                    typeof lastBlock.data?.text === 'string' &&
                    lastBlock.data.text.toLowerCase().includes('(about the author');

                console.log('lastBlock:', lastBlock);
                console.log('hasAboutAuthor:', hasAboutAuthor);

                if (!hasAboutAuthor) {
                    bodyBlocks.push({
                        id: `block-${Math.random().toString(36).substr(2, 9)}`,
                        type: 'paragraph',
                        data: {
                            text: `<em>(About the Author : ${finalStory.author_bio})</em>`
                        }
                    });
                    console.log('Successfully appended author bio block to the end.');
                } else {
                    console.log('Author bio block already exists at the end.');
                    const currentText = lastBlock.data.text;
                    if (!currentText.toLowerCase().includes('<em>') && !currentText.toLowerCase().includes('<i>')) {
                        const cleanText = currentText.replace(/<\/?(em|i|b|strong)>/gi, '');
                        lastBlock.data.text = `<em>${cleanText}</em>`;
                        console.log('Formatted existing author bio block with <em> tags.');
                    }
                }
            } else {
                console.log('Cannot add author bio: finalStory.author_bio is empty or undefined.');
            }
            console.log('--------------------------------');

            const payload = {
                title: finalStory.title.slice(0, 180),
                slug: slug,
                description: {
                    time: Date.now(),
                    blocks: bodyBlocks.length > 0 ? bodyBlocks : [{ type: 'paragraph', data: { text: 'No content scraped.' } }],
                    version: '2.30.8',
                },
                storySummary: verifiedFirstArticleParagraph || '',
                section: 'World',
                category: 'External',
                source: 'The Conversation IN',
                sourceUrl: finalStory.sourceUrl,
                authorId: user?.userId || null,
                authorName: finalStory.authorName || 'The Conversation',
                author_bio: finalStory.author_bio || '',
                status: 'raise_a_story',
                state: 'draft',
                proposedFilingDate: null,
            };

            const response = await apiFetch(`${backendApi}/api/articles/postStory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Import failed');
            const result = await response.json();
            const importedStory = {
                ...(result.data || { ...payload, storyId: result.storyId || result.id }),
                storySummary: payload.storySummary,
            };

            // Print the converted HTML representation to the console
            const htmlContent = convertBlocksToHtml(bodyBlocks);
            console.log('%c--- Created Story HTML ---', 'color: #10b981; font-weight: bold; font-size: 1.1em;');
            console.log(htmlContent);
            console.log('%c---------------------------', 'color: #10b981; font-weight: bold;');

            toast.success('Imported! Redirecting...', { id: 'import' });

            if (finalStory.sourceUrl) {
                try {
                    const existing = JSON.parse(localStorage.getItem('openpress_imported_urls') || '[]');
                    if (!existing.includes(finalStory.sourceUrl)) {
                        existing.push(finalStory.sourceUrl);
                        localStorage.setItem('openpress_imported_urls', JSON.stringify(existing));
                        setImportedUrls(existing);
                    }
                } catch { }
            }

            window.sessionStorage.setItem('dashboard_edit_story', JSON.stringify(importedStory));
            setTimeout(() => router.push('/dashboard'), 1000);

            setRows(prev => {
                const next = prev.map(r => r.id === finalStory.id ? { ...r, status: 'ingested' } : r);
                localStorage.setItem('openpress_scraped_cache', JSON.stringify(next));
                return next;
            });
        } catch (err: any) {
            toast.error(`Import failed: ${err.message}`, { id: 'import' });
        } finally {
            setImportingId(null);
        }
    }, [backendApi, user?.token, router]);

    const content = useMemo(() => {
        if (loading && rows.length === 0) return <div className="p-6 text-sm text-gray-600">Loading scraped stories...</div>;
        if (error && rows.length === 0) return <div className="p-6 text-sm text-red-600">{error}</div>;
        if (rows.length === 0) return <div className="p-6 text-sm text-gray-600">No scraped stories found yet.</div>;

        return (
            <div className="overflow-auto">
                <DataGrid
                    dataSource={rows}
                    keyExpr="id"
                    showBorders={false}
                    showColumnLines={false}
                    showRowLines={false}
                    hoverStateEnabled={true}
                    columnAutoWidth={true}
                    wordWrapEnabled={true}
                    noDataText="No scraped stories found"
                    elementAttr={{ class: 'scraped-stories-datagrid' }}
                    height="auto"
                    rowAlternationEnabled={false}
                    allowColumnResizing={true}
                    allowColumnReordering={true}
                    onExporting={createGridExportHandler('Wires')}
                >
                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                    <Grouping autoExpandAll={false} />
                    <ColumnChooser enabled={true} mode="select" />
                    <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                    <Selection mode="multiple" showCheckBoxesMode="always" />
                    <FilterRow visible={true} applyFilter="auto" />
                    <FilterPanel visible={true} />
                    <FilterBuilderPopup width={700} height={500} />
                    <HeaderFilter visible={true} />
                    <Paging defaultPageSize={10} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />

                    <Column
                        dataField="title"
                        caption="Title"
                        allowFiltering={true}
                        allowSorting={true}
                        allowGrouping={false}
                        minWidth={200}
                        cellRender={(cellData: any) => (
                            <div className="py-1 text-gray-900 leading-relaxed">
                                {cellData.data.title}
                            </div>
                        )}
                    />
                    <Column dataField="source" caption="Source" allowFiltering={true} allowSorting={true} allowGrouping={true} minWidth={220} />

                    <Column
                        dataField="publishedAt"
                        caption="Published At"
                        dataType="datetime"
                        format="shortDateShortTime"
                        allowFiltering={true}
                        allowSorting={true}
                        allowGrouping={true}
                        minWidth={200}
                    />
                    <Column
                        caption="Actions"
                        minWidth={180}
                        allowFiltering={false}
                        allowSorting={false}
                        allowGrouping={false}
                        allowExporting={false}
                        cellRender={(cellData: any) => (
                            <div className="flex flex-col gap-2 py-1">
                                {cellData.data.sourceUrl && (
                                    <a
                                        href={cellData.data.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-blue-600 hover:underline break-all"
                                    >
                                        View Original
                                    </a>
                                )}
                                <CustomButton
                                    onClick={() => handleImport(cellData.data)}
                                    disabled={importingId === cellData.data.id || cellData.data.status === 'ingested' || (cellData.data.sourceUrl && importedUrls.includes(cellData.data.sourceUrl))}
                                    variant="white"
                                    className="text-xs w-24"
                                >
                                    {importingId === cellData.data.id ? 'Importing...' : (cellData.data.status === 'ingested' || (cellData.data.sourceUrl && importedUrls.includes(cellData.data.sourceUrl))) ? 'Imported' : 'Import'}
                                </CustomButton>
                            </div>
                        )}
                    />
                </DataGrid>
            </div>
        );
    }, [error, loading, rows, importingId, importedUrls, handleImport]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <AllStoriesHeader onBack={onBack} />

            <div className="flex-1 overflow-auto">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                    <div className="mb-4 md:hidden">
                        <AdminMobileSidebarToggle className="border border-gray-300" />
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-8">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 relative py-2">
                                Wires
                            </h2>
                        </div>

                        <CustomButton
                            onClick={handleFetchLive}
                            disabled={isScraping}
                            variant="black"
                            className="flex items-center gap-2"
                        >
                            {isScraping ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Scraping...
                                </>
                            ) : 'Fetch Live'}
                        </CustomButton>
                    </div>

                    <div className="max-w-[1600px]">
                        {content}
                    </div>
                </div>
            </div>
        </div>
    );
}