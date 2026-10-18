import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Search, Loader2, ExternalLink, Globe, Info, ArrowLeft, MoreVertical, X, ChevronLeft, Clock, Trash2, ChevronDown } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import apiFetch from '@/utils/api';
import env from '@/utils/env';
import toast from 'react-hot-toast';
import { useRouter } from '@/hooks/useRouter';
import CustomButton from '../common/CustomButton';
import BackToDashboardButton from '../common/BackToDashboardButton';

const fetchWithTimeout = async (url: string, timeout = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
};

const fetchWithProxies = async (url: string, minLength = 500) => {
    const proxies = [
        { url: `${env.backendApi}/api/proxy?url=${encodeURIComponent(url)}`, isJson: true },
        { url: `https://api.cors.lol/?url=${encodeURIComponent(url)}`, isJson: false },
        { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, isJson: false },
        { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, isJson: false },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, isJson: true },
        { url: `https://corsproxy.io/?url=${encodeURIComponent(url)}`, isJson: false },
        { url: `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`, isJson: false },
    ];

    for (const proxy of proxies) {
        try {
            const response = await fetchWithTimeout(proxy.url, 2500); // Fail fast after 2.5 seconds!
            if (response.ok) {
                let textOutput = '';
                if (proxy.isJson) {
                    try {
                        const data = await response.json();
                        textOutput = data.contents;
                        if (textOutput && textOutput.startsWith('data:')) {
                            const commaIndex = textOutput.indexOf(',');
                            if (commaIndex !== -1) {
                                const base64Str = textOutput.substring(commaIndex + 1);
                                try {
                                    const binary = atob(base64Str);
                                    const bytes = new Uint8Array(binary.length);
                                    for (let i = 0; i < binary.length; i++) {
                                        bytes[i] = binary.charCodeAt(i);
                                    }
                                    textOutput = new TextDecoder('utf-8').decode(bytes);
                                } catch (decodeErr) {
                                    console.error('Failed to decode base64 from allorigins:', decodeErr);
                                }
                            }
                        }
                    } catch (jsonErr) {
                        continue; // Cloudflare blocked and returned HTML instead of JSON
                    }
                } else {
                    textOutput = await response.text();
                }
                if (textOutput && textOutput.length > minLength) return textOutput;
            }
        } catch (err) {
            // Silently ignore proxy failures and try the next one
        }
    }
    return null;
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

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

interface SearchResult {
    title: string;
    url: string;
    description: string;
    age?: string;
    thumbnail?: { src: string };
    profile?: {
        name: string;
        img: string;
    };
}

const isImportableArticle = (result: SearchResult): boolean => {
    try {
        const parsedUrl = new URL(result.url);
        const path = parsedUrl.pathname;

        // 1. Exclude root domains and short paths
        if (path === '/' || path.length < 5) return false;

        // 2. Exclude non-article files
        const ext = path.split('.').pop()?.toLowerCase();
        if (ext && ['pdf', 'jpg', 'png', 'gif', 'mp4', 'mp3', 'zip'].includes(ext)) return false;

        // 3. Exclude known generic domains
        const domain = parsedUrl.hostname.toLowerCase();
        const nonNewsDomains = ['youtube.com', 'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'github.com'];
        if (nonNewsDomains.some(d => domain.includes(d))) return false;

        const pathSegments = path.split('/').filter(Boolean);
        if (pathSegments.length === 0) return false;

        const lastSegment = pathSegments[pathSegments.length - 1];

        // An article slug is usually long and descriptive (multiple words joined by hyphens)
        const hyphenCount = (lastSegment.match(/-/g) || []).length;

        // If the last segment has at least 2 hyphens and is reasonably long, it's very likely an article title slug
        if (lastSegment.length > 15 && hyphenCount >= 2) return true;

        // If it ends in .html/.htm, it's very likely an article
        if (lastSegment.includes('.html') || lastSegment.includes('.htm')) return true;

        // Check for date pattern in the URL (e.g., /2023/11/)
        if (/\/\d{4}\/\d{2}\//.test(path)) return true;

        // Check if there is an ID pattern at the end (like -1234567)
        if (/\d{5,}/.test(lastSegment)) return true;

        return false;
    } catch {
        return false;
    }
};

interface SearchResponse {
    web?: {
        results: SearchResult[];
    };
}

interface QueriesProps {
    onBack: () => void;
    isTab?: boolean;
}

export default function Queries({ onBack, isTab = false }: QueriesProps) {
    const userContext = useContext(UserContext);
    const user = userContext?.user ?? null;
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [importedUrls, setImportedUrls] = useState<string[]>([]);
    const [importingUrl, setImportingUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchHistory, setSearchHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [livePreviews, setLivePreviews] = useState<Record<string, SearchResult[]>>({});
    const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});
    const [timeFilter, setTimeFilter] = useState('day');
    const [totalPages, setTotalPages] = useState(10);
    const resultsPerPage = 10;

    const fetchHistory = useCallback(async () => {
        if (!user?.token) return;
        try {
            const response = await apiFetch(`${env.backendApi}/api/utils/search/history`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Accept': 'application/json'
                },
                skipAuthRedirect: true // Prevent logout if this secondary call fails
            });
            if (response.ok) {
                const data = await response.json();
                setSearchHistory(data.history || []);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    }, [user?.token]);

    useEffect(() => {
        if (!hasSearched) {
            fetchHistory();
        }
    }, [fetchHistory, hasSearched]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('openPress_imported_urls');
            if (raw) {
                setImportedUrls(JSON.parse(raw));
            }
        } catch (e) { /* ignore */ }
    }, []);

    const handleImport = async (result: SearchResult) => {
        if (!env.backendApi) return;
        setImportingUrl(result.url);
        toast.loading(`Importing...`, { id: 'import' });
        try {
            const domain = new URL(result.url).hostname;
            const rawSlug = result.url.split('/').filter(Boolean).pop();
            const slug = rawSlug ? `/${rawSlug}` : `/scraped-${Date.now()}`;

            let bodyBlocks: any[] = [];

            try {
                const html = await fetchWithProxies(result.url, 100);
                if (html) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    const bodyContainer =
                        doc.querySelector('[itemprop="articleBody"]') ||
                        doc.querySelector('.content-body') ||
                        doc.querySelector('article') ||
                        doc.querySelector('.article-body') ||
                        doc.querySelector('.post-content') ||
                        doc.querySelector('.entry-content') ||
                        doc.querySelector('main') ||
                        doc.body;

                    if (bodyContainer) {
                        const contentBlocks: any[] = [];
                        const walk = (node: Element) => {
                            if (node.nodeType !== 1) return;
                            if (node.matches('.slot, .inline-promo, .author-bio, form, aside, script, style, .ad-container, .newsletter-signup, .related-articles, .social-share')) return;
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
                            bodyBlocks = contentBlocks.map((b: any) => ({
                                id: `block-${Math.random().toString(36).substr(2, 9)}`,
                                type: b.type || 'paragraph',
                                data: b.data || { text: b.text || '' }
                            }));
                        }
                    }
                }
            } catch (scrapeErr) {
                console.warn('Scraping failed, falling back to description', scrapeErr);
            }

            if (bodyBlocks.length === 0) {
                bodyBlocks = [{
                    id: `block-${Date.now()}`,
                    type: 'paragraph',
                    data: { text: result.description || 'No content scraped.' }
                }];
            }

            const payload = {
                title: result.title.slice(0, 180),
                slug: slug,
                description: {
                    time: Date.now(),
                    blocks: bodyBlocks,
                    version: '2.30.8',
                },
                storySummary: stripHtml(editorJsToText(bodyBlocks)).slice(0, 280) || stripHtml(result.description || '').slice(0, 280),
                section: 'World',
                category: 'External',
                source: domain || 'Search Result',
                sourceUrl: result.url,
                authorName: result.profile?.name || domain || 'Unknown',
                status: 'raise_a_story',
                state: 'draft',
                proposedFilingDate: null,
            };

            const response = await apiFetch(`${env.backendApi}/api/articles/postStory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Import failed');
            const resultData = await response.json();
            const importedStory = resultData.data || { ...payload, storyId: resultData.storyId || resultData.id };

            toast.success('Imported! Redirecting...', { id: 'import' });

            try {
                const existing = JSON.parse(localStorage.getItem('openPress_imported_urls') || '[]');
                if (!existing.includes(result.url)) {
                    existing.push(result.url);
                    localStorage.setItem('openPress_imported_urls', JSON.stringify(existing));
                    setImportedUrls(existing);
                }
            } catch { }

            window.sessionStorage.setItem('dashboard_edit_story', JSON.stringify(importedStory));
            setTimeout(() => router.push('/dashboard'), 1000);
        } catch (err: any) {
            toast.error(`Import failed: ${err.message}`, { id: 'import' });
        } finally {
            setImportingUrl(null);
        }
    };

    useEffect(() => {
        const fetchPreviews = async () => {
            if (!searchHistory || searchHistory.length === 0 || !user?.token) return;

            for (const item of searchHistory) {
                // Skip if we already have results or are currently loading this query
                if (livePreviews[item.query] || loadingPreviews[item.query]) continue;

                setLoadingPreviews(prev => ({ ...prev, [item.query]: true }));

                let retries = 3;
                let delay = 1000; // start with a 1-second delay
                let success = false;

                while (retries > 0 && !success) {
                    try {
                        // Wait for the staggered or backoff delay before making the request
                        await new Promise(resolve => setTimeout(resolve, delay));

                        const response = await apiFetch(
                            `${env.backendApi}/api/utils/search?q=${encodeURIComponent(item.query)}&offset=0&preview=true&freshness=pd`,
                            {
                                headers: {
                                    Accept: 'application/json',
                                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                                },
                                skipAuthRedirect: true
                            }
                        );

                        if (response.ok) {
                            const data = await response.json();
                            const results = (data.web?.results || []).slice(0, 10);
                            // Update state immediately for each query to show results progressively
                            setLivePreviews(prev => ({ ...prev, [item.query]: results }));
                            success = true;
                        } else if (response.status === 429) {
                            console.warn(`Rate limit hit (429) for: "${item.query}". Retrying... (${retries - 1} retries left)`);
                            retries--;
                            // Exponential backoff: increase delay exponentially (e.g. 1000ms -> 3000ms -> 7000ms)
                            delay = delay * 2 + 1000;
                        } else {
                            // Any other HTTP error (e.g. 400, 500), stop retrying
                            break;
                        }
                    } catch (err) {
                        console.error(`Failed to fetch preview for "${item.query}":`, err);
                        break;
                    }
                }

                setLoadingPreviews(prev => ({ ...prev, [item.query]: false }));
            }
        };

        fetchPreviews();
    }, [searchHistory, user?.token]);

    const parseAgeToMs = (ageStr?: string): number => {
        if (!ageStr) return Infinity;
        const str = ageStr.toLowerCase().trim();
        const parsedDate = Date.parse(str);
        if (!isNaN(parsedDate)) {
            return Date.now() - parsedDate;
        }
        const numMatch = str.match(/^([\d.]+)\s*([a-z]+)/);
        if (numMatch) {
            const value = parseFloat(numMatch[1]);
            const unit = numMatch[2];
            if (unit.startsWith('sec') || unit === 's') return value * 1000;
            if (unit.startsWith('min') || unit === 'm') return value * 60 * 1000;
            if (unit.startsWith('hour') || unit === 'h') return value * 60 * 60 * 1000;
            if (unit.startsWith('day') || unit === 'd') return value * 24 * 60 * 60 * 1000;
            if (unit.startsWith('week') || unit === 'w') return value * 7 * 24 * 60 * 60 * 1000;
            if (unit.startsWith('month')) return value * 30 * 24 * 60 * 60 * 1000;
            if (unit.startsWith('year') || unit === 'y') return value * 365 * 24 * 60 * 60 * 1000;
        }
        return Infinity;
    };

    const getMergedAndSortedPreviews = () => {
        const allResults: SearchResult[] = [];
        const seenUrls = new Set<string>();

        searchHistory.forEach(item => {
            const queryResults = livePreviews[item.query] || [];
            queryResults.forEach(res => {
                if (!seenUrls.has(res.url)) {
                    seenUrls.add(res.url);
                    allResults.push(res);
                }
            });
        });

        return allResults.sort((a, b) => parseAgeToMs(a.age) - parseAgeToMs(b.age));
    };

    const mergedPreviews = getMergedAndSortedPreviews();
    const isAnyPreviewLoading = searchHistory.some(item => loadingPreviews[item.query]);

    const deleteHistoryItem = async (e: React.MouseEvent, queryText: string) => {
        e.stopPropagation(); // Prevent search execution when clicking delete

        if (!user?.token) return;

        // Optimistically remove the item from local states to keep interface responsive
        setSearchHistory(prev => prev.filter(item => item.query.toLowerCase() !== queryText.toLowerCase()));
        setLivePreviews(prev => {
            const updated = { ...prev };
            delete updated[queryText];
            return updated;
        });

        try {
            const response = await apiFetch(
                `${env.backendApi}/api/utils/search/history?q=${encodeURIComponent(queryText)}`,
                {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    },
                    skipAuthRedirect: true
                }
            );

            if (!response.ok) {
                console.error('Failed to delete history item on the backend');
                fetchHistory(); // Revert to source of truth if server call failed
            }
        } catch (err) {
            console.error('Error while deleting search history item:', err);
            fetchHistory(); // Revert state
        }
    };

    const mapFilterToFreshness = (filter: string): string => {
        switch (filter) {
            case 'hour': return 'pd';
            case 'day': return 'pd';
            case 'week': return 'pw';
            case 'month': return 'pm';
            case 'year': return 'py';
            default: return '';
        }
    };

    const handleSearch = async (e?: React.FormEvent, page: number = 1, overrideQuery?: string, filterOverride?: string) => {
        if (e) e.preventDefault();
        const searchTerm = overrideQuery !== undefined ? overrideQuery : query;
        if (!searchTerm.trim()) return;

        setIsLoading(true);
        setError(null);
        setCurrentPage(page);
        setShowHistory(false);

        const activeFilter = filterOverride !== undefined ? filterOverride : timeFilter;

        try {
            const backendApi = env.backendApi;
            // 'offset' is a 0-based page index (10 results per page, max 9).
            const offset = page - 1;

            const freshnessParam = mapFilterToFreshness(activeFilter);
            const freshnessUrlPart = freshnessParam ? `&freshness=${freshnessParam}` : '';

            const response = await apiFetch(
                `${backendApi}/api/utils/search?q=${encodeURIComponent(searchTerm)}&offset=${offset}${freshnessUrlPart}`,
                {
                    headers: {
                        Accept: 'application/json',
                        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    },
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch search results.');
            }

            const data: SearchResponse = await response.json();

            const rawResultsCount = data.web?.results?.length || 0;
            const expectedCount = freshnessParam ? 20 : 10;

            if (rawResultsCount === 0 && page > 1) {
                setTotalPages(page - 1);
                setCurrentPage(page - 1);
                setIsLoading(false);
                return;
            } else if (rawResultsCount < expectedCount) {
                setTotalPages(page);
            } else if (page === 1) {
                setTotalPages(10);
            }

            let fetchedResults = data.web?.results || [];

            // If the filter is "hour", filter the fetched results to only keep those <= 1 hour ago
            if (activeFilter === 'hour') {
                fetchedResults = fetchedResults.filter(res => {
                    const ageMs = parseAgeToMs(res.age);
                    return ageMs <= 60 * 60 * 1000;
                });
            }

            setResults(fetchedResults);
            setHasSearched(true);

            // Scroll to top of results
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Refresh history after a search
            fetchHistory();
        } catch (err) {
            console.error('Search Error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (page: number) => {
        handleSearch(undefined, page);
    };

    return (
        <div className="flex flex-col h-full w-full bg-white text-[#202124] font-sans overflow-hidden">
            {/* Top Back Button */}
            {!isTab && (
                <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <BackToDashboardButton onClick={onBack} />
                    </div>
                </div>
            )}

            {/* Split layout: main content area and right sidebar */}
            <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full overflow-y-auto">

                    {/* Header / Search Bar Section */}
                    <div className="sticky top-0 z-20 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 lg:px-8 py-4 gap-4 justify-between">
                            <div className="flex items-center gap-6 flex-1">

                                <form onSubmit={(e) => handleSearch(e, 1)} className="relative w-full max-w-md group">
                                    <div className="relative flex w-full items-center border border-black px-[2px]">
                                        <button type="submit" className="pr-4 pl-2 text-gray-400 hover:text-black">
                                            <Search className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="search"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Search the web..."
                                            className="w-full bg-transparent py-2 text-sm pr-8 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                                        />
                                        {query && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setQuery('');
                                                    setHasSearched(false);
                                                    setResults([]);
                                                }}
                                                className="absolute right-2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {hasSearched && (
                                    <div className="relative select-none shrink-0">
                                        <select
                                            value={timeFilter}
                                            onChange={(e) => {
                                                setTimeFilter(e.target.value);
                                                handleSearch(undefined, 1, query, e.target.value);
                                            }}
                                            className="appearance-none bg-white border border-black rounded-none pl-4 pr-10 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none cursor-pointer transition-colors duration-200"
                                        >
                                            <option value="anytime">Anytime</option>
                                            <option value="hour">Past hour</option>
                                            <option value="day">Past 24 hours</option>
                                            <option value="week">Past week</option>
                                            <option value="month">Past month</option>
                                            <option value="year">Past year</option>
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-900">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <main className="flex-1 overflow-auto pt-4">
                        <div className={`px-4 sm:px-6 lg:px-8 ${hasSearched ? 'md:pl-[180px] max-w-[832px]' : 'max-w-4xl'}`}>

                            {!isLoading && !hasSearched && searchHistory.length > 0 && (
                                <div className="mt-6 pb-20">
                                    {/* Left/Main Column: Recent Searches Results (without term name header) */}
                                    <div className="space-y-10">

                                        <div className="space-y-12">
                                            {isAnyPreviewLoading && mergedPreviews.length === 0 ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Fetching live results...</span>
                                                </div>
                                            ) : mergedPreviews.length > 0 ? (
                                                <div className="space-y-8">
                                                    {mergedPreviews.map((res: any, idx: number) => (
                                                        <div key={idx} className="group max-w-2xl">
                                                            <div className="flex flex-col">
                                                                <a
                                                                    href={res.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-[#202124] mb-1 flex items-center gap-2 hover:underline truncate"
                                                                >
                                                                    <div className="w-4 h-4 bg-gray-100 rounded-none flex items-center justify-center">
                                                                        <Globe className="w-2.5 h-2.5 text-gray-400" />
                                                                    </div>
                                                                    <span>{res.url}</span>
                                                                    {res.age && (
                                                                        <span className="text-[10px] text-gray-400 font-normal px-1.5 py-0.5 bg-gray-100 rounded-none ml-2">
                                                                            {res.age}
                                                                        </span>
                                                                    )}
                                                                </a>
                                                                <a
                                                                    href={res.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xl text-[#1a0dab] hover:underline mb-1 leading-tight"
                                                                >
                                                                    {res.title}
                                                                </a>
                                                                <p className="text-sm text-[#4d5156] leading-relaxed line-clamp-2 mt-1">
                                                                    {res.description}
                                                                </p>
                                                                {isImportableArticle(res) && (
                                                                    <div className="flex items-center gap-4 mt-2">
                                                                        <CustomButton
                                                                            onClick={() => handleImport(res)}
                                                                            disabled={importingUrl === res.url || importedUrls.includes(res.url)}
                                                                            variant="white"
                                                                            className="text-xs py-1 px-3 w-24 h-auto"
                                                                        >
                                                                            {importingUrl === res.url ? 'Importing...' : importedUrls.includes(res.url) ? 'Imported' : 'Import'}
                                                                        </CustomButton>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {isAnyPreviewLoading && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 py-4 border-t border-gray-100 mt-4">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Updating results with more recent searches...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500 italic">No live results available for your research history.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                    <p className="text-gray-500 font-medium">Searching the web...</p>
                                </div>
                            )}

                            {!isLoading && error && (
                                <div className="my-8 p-4 rounded-none bg-red-50 text-red-700 text-sm border border-red-100">
                                    <p className="font-semibold mb-1">An error occurred</p>
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Results List */}
                            {!isLoading && results.length > 0 && (
                                <div className="space-y-8 pb-10">
                                    <div className="text-sm text-gray-500 py-2">
                                        About {results.length * 1234} results (0.42 seconds)
                                    </div>

                                    {results.map((result, index) => (
                                        <div key={index} className="group">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex items-center gap-2 text-sm text-[#202124]">
                                                    <div className="w-7 h-7 flex-shrink-0 rounded-none bg-gray-100 flex items-center justify-center border border-gray-200">
                                                        <Globe className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                    <div className="flex flex-col leading-tight overflow-hidden">
                                                        <span className="text-xs truncate font-normal">{new URL(result.url).hostname}</span>
                                                        <span className="text-[10px] text-gray-500 truncate">{result.url}</span>
                                                    </div>
                                                </div>
                                                <button className="ml-auto p-1 hover:bg-gray-100 rounded-none text-gray-400">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <a
                                                href={result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block mb-1"
                                            >
                                                <h3 className="text-xl text-[#1a0dab] group-hover:underline font-normal leading-tight">
                                                    {result.title}
                                                </h3>
                                            </a>
                                            <div className="text-sm text-[#4d5156] leading-relaxed line-clamp-3">
                                                {result.age && <span className="text-gray-500 mr-1">{result.age} —</span>}
                                                {result.description}
                                            </div>
                                            {isImportableArticle(result) && (
                                                <div className="flex items-center gap-4 mt-2">
                                                    <CustomButton
                                                        onClick={() => handleImport(result)}
                                                        disabled={importingUrl === result.url || importedUrls.includes(result.url)}
                                                        variant="white"
                                                        className="text-xs py-1 px-3 w-24 h-auto"
                                                    >
                                                        {importingUrl === result.url ? 'Importing...' : importedUrls.includes(result.url) ? 'Imported' : 'Import'}
                                                    </CustomButton>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Pagination */}
                                    <div className="flex flex-col items-center pt-10 pb-20">
                                        <div className="flex items-center gap-4 text-xs font-medium text-blue-700">
                                            {currentPage > 1 && (
                                                <button onClick={() => handlePageChange(currentPage - 1)} className="hover:underline">
                                                    Previous
                                                </button>
                                            )}
                                            <div className="flex items-center gap-3">
                                                {[...Array(totalPages)].map((_, i) => {
                                                    const p = i + 1;
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => handlePageChange(p)}
                                                            className={`${p === currentPage ? 'text-gray-900 cursor-default font-bold' : 'hover:underline'}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {currentPage < totalPages && (
                                                <button onClick={() => handlePageChange(currentPage + 1)} className="hover:underline">
                                                    Next
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Empty State / Welcome */}
                            {!isLoading && !hasSearched && (
                                <div className="mt-10 flex flex-col items-center">
                                    {/* Buttons and tagline removed as requested */}
                                </div>
                            )}

                            {/* No Results */}
                            {!isLoading && hasSearched && results.length === 0 && (
                                <div className="py-20 text-left">
                                    <p className="text-lg mb-4">Your search - <span className="font-bold">{query}</span> - did not match any documents.</p>
                                    <p className="mb-2">Suggestions:</p>
                                    <ul className="list-disc ml-8 text-sm space-y-1">
                                        <li>Make sure all words are spelled correctly.</li>
                                        <li>Try different keywords.</li>
                                        <li>Try more general keywords.</li>
                                        <li>Try fewer keywords.</li>
                                    </ul>
                                </div>
                            )}

                        </div>
                    </main>
                </div>

                {/* Right Column: Search History Sidebar */}
                {!isLoading && !hasSearched && searchHistory.length > 0 && (
                    <div className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
                        <div className="p-6 border-b border-gray-200 bg-white">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                Research History
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin bg-white">
                            {searchHistory.map((item) => (
                                <div
                                    key={item.searchId}
                                    onClick={() => {
                                        setQuery(item.query);
                                        handleSearch(undefined, 1, item.query);
                                    }}
                                    className="group flex items-center justify-between p-3 rounded-none bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 cursor-pointer transition-all duration-200 shadow-sm"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-none bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition-colors">
                                            <Search className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 truncate transition-colors">
                                                {item.query}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(item.timestamp).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => deleteHistoryItem(e, item.query)}
                                        className="p-1.5 rounded-none hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all duration-200 focus:outline-none shrink-0"
                                        title="Delete from history"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}