import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Puck } from "@measured/puck";
import "../../styles/studio-theme.css";
import { type PageStudioData, getConfigForPage, type PageType, getInitialDataForPage, sanitizeAutomaticGridMode, renameLegacyTitle } from "./builderConfig";
import { savePublishedPage } from "./publishStorage";
import { syncNavbarLeaderboardFromHome, injectHomeNavbarIntoPageData } from "./syncNavbarLeaderboard";
import { initializeStories, initializeTaxonomies, initializeMoreStoryCardTaxonomyOptions, type Story } from "./storyData";
import { initializeAuthors, type Author } from "./authorData";
import { initializeCampaigns, initializePlacements } from "./campaignData";
import { registerDynamicBlocks } from "./CommonBlocksConfig";
import HomeLayout from "./layouts/home";
import BlogLayout from "./layouts/blog";
import VideosLayout from "./layouts/videos";
import SectionLayout from "./layouts/section";
import AuthorLayout from "./layouts/author";
import ErrorLayout from "./layouts/error";
import { PuckOverrides } from "./PuckOverrides";
import { ActiveSectionContext } from "./ActiveSectionContext";
import { checkAuth } from "../../utils/auth";
import { saveReducer, hasUnsavedChanges, retryDelayMs, MAX_SAVE_ATTEMPTS, type SaveStatus } from "./saveStatus";
import { LibraryPanel, LibraryItem } from "./LibrarySearch";
import { StudioSelectField } from "./fields/StudioSelectField";
import type { Overrides } from "@measured/puck";


// Block types the ad renderers' fallback switch statements actually know how to
// render. Any other non-Ad block (e.g. a grid/section container like HeroGrid)
// must never be captured as an ad's auto fallbackBlock — it renders as nothing.
const FALLBACK_CARD_TYPES = new Set([
  'StoryCard',
  'RecommendCard',
  'MultimediaCard',
  'MainCard',
  'SidebarStoryCard',
  'StorySubCard',
  'ShowcaseCard',
  'HoverCard',
  'MostPopularTable',
  'Heading',
  'FeaturedCard',
  'BottomCard',
  'AuthorCard',
  'ErrorCard',
]);
const isFallbackCardBlock = (block: any): boolean => FALLBACK_CARD_TYPES.has(block?.type);

// Backend stores parameterized pages under pageType strings like
// `Section-<sectionName>` and `Author-<authorId>`. Shared by fetchPageData
// and handlePublish so both target the exact same record.
const resolvePageTypeKey = (
  pageType: string,
  activeSection: string | null,
  activeAuthor: string | null
): string =>
  pageType === "Section" && activeSection
    ? `Section-${activeSection}`
    : pageType === "Author" && activeAuthor
      ? `Author-${activeAuthor}`
      : pageType;

// Device presets for the canvas switcher.
const STUDIO_VIEWPORTS = [
  { width: 390, height: "auto" as const, label: "Mobile", icon: "Smartphone" as const },
  { width: 820, height: "auto" as const, label: "Tablet", icon: "Tablet" as const },
  { width: 1280, height: "auto" as const, label: "Desktop", icon: "Monitor" as const },
];

export function PuckEditor() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const [pageId, setPageId] = useState<string | undefined>("");
  const [saveStatus, dispatchSave] = useReducer(saveReducer, { state: 'idle' } as SaveStatus);
  // Bumped on every edit. A save only counts as "saved" if no newer edit arrived while it was in flight.
  const editVersionRef = useRef(0);
  // Only the newest request may update page state; an older, slower response is ignored.
  const requestSeqRef = useRef(0);
  // True while a debounced autosave is waiting to fire.
  const pendingRef = useRef(false);
  const debounceRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<PageStudioData | null>(null);
  // The last explicitly-published snapshot of this page's data, carried
  // forward on every autosave so it never gets silently dropped. Autosave
  // itself only ever updates the live-editing content/zones — this stays
  // untouched until the user actually clicks Publish. See handlePublish.
  const publishedSnapshotRef = useRef<PageStudioData | null>(null);
  // Holds the latest in-memory Home page data so non-Home pages always
  // display the most current navbar props without waiting for autosave/sync.
  const homeDataRef = useRef<PageStudioData | null>(null);
  const [pageData, setPageData] = useState<PageStudioData | null>(null);
  const previousDataRef = useRef<PageStudioData | null>(null);
  const lastCardsRef = useRef<Record<string, any>>({});
  const lastContentCardsRef = useRef<Record<number, any>>({});

  // Initialize from URL hash or search params
  const [selectedPage, setSelectedPage] = useState<PageType>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("page") as PageType) || "Home";
  });
  const [activeSection, setActiveSection] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("section");
  });
  const [activeAuthor, setActiveAuthor] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("author");
  });
  const [stories, setStories] = useState<Story[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);

  // Update URL when page or section changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.slice(1);

    // If we are on the login hash, keep the URL clean of builder params
    if (hash === '/login') {
      params.delete("page");
      params.delete("section");
      params.delete("author");
      const newUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
      return;
    }

    params.set("page", selectedPage);
    if (selectedPage === "Section" && activeSection) {
      params.set("section", activeSection);
    } else {
      params.delete("section");
    }
    if (selectedPage === "Author" && activeAuthor) {
      params.set("author", activeAuthor);
    } else {
      params.delete("author");
    }
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, "", newUrl);
  }, [selectedPage, activeSection, activeAuthor]);

  // --- Fetch and initialize stories
  useEffect(() => {
    if (!selectedPage) return;

    // Reset active section/author if not on that page type
    if (selectedPage !== "Section") {
      setActiveSection(null);
    }
    if (selectedPage !== "Author") {
      setActiveAuthor(null);
    }

    // Set by the cleanup below when this run is superseded (a page/section
    // switch, or StrictMode's remount). A stale run must not write state —
    // without this, a later run's setIsLoading(true) could land after an
    // earlier run's setIsLoading(false) and strand the loading screen.
    let cancelled = false;

    const loadContent = async () => {
      setIsLoading(true);

      // allSettled, not all: these six are independent, and only the first
      // four are actually rendered. A failure in one — especially a taxonomy
      // lookup that just fills a dropdown — must never keep the editor behind
      // the loading screen. Each falls back to an empty list.
      const settled = await Promise.allSettled([
        initializeStories({
          pageType: selectedPage,
          section: selectedPage === "Section" ? activeSection : undefined,
        }),
        initializeAuthors(),
        initializeCampaigns(),
        initializePlacements(),
        initializeTaxonomies(),
        initializeMoreStoryCardTaxonomyOptions(),
      ]);

      if (cancelled) return;

      const labels = ["stories", "authors", "campaigns", "placements", "taxonomies", "story card taxonomy options"];
      settled.forEach((outcome, i) => {
        if (outcome.status === "rejected") {
          console.error(`Failed to load ${labels[i]} — continuing without it:`, outcome.reason);
        }
      });

      const valueOf = <T,>(index: number): T[] => {
        const outcome = settled[index];
        return outcome.status === "fulfilled" ? ((outcome.value as T[]) ?? []) : [];
      };

      const fetchedStories = valueOf<Story>(0);
      const fetchedAuthors = valueOf<Author>(1);
      const fetchedCampaigns = valueOf<any>(2);
      const fetchedPlacements = valueOf<any>(3);

      try {
        registerDynamicBlocks(fetchedPlacements);
      } catch (error) {
        console.error("Failed to register dynamic ad blocks:", error);
      }

      setStories(fetchedStories);
      setAuthors(fetchedAuthors);
      setCampaigns(fetchedCampaigns);
      setPlacements(fetchedPlacements);
      console.log("Stories loaded:", fetchedStories.length);
      console.log("Authors loaded:", fetchedAuthors.length);
      console.log("Campaigns loaded:", fetchedCampaigns.length);
      console.log("Placements loaded:", fetchedPlacements.length);
      setIsLoading(false);
    };
    loadContent();

    return () => {
      cancelled = true;
    };
  }, [selectedPage, activeSection]);

  // --- Helper to inject fallbacks
  const injectFallbacks = useCallback((data: PageStudioData) => {
    if (!data) return data;
    const finalData = JSON.parse(JSON.stringify(data));
    
    // 1. Inject into top-level content
    // Skip ads that already have a fallbackStoryId (the newer "Fallback Story"
    // selector) or fallbackBlock — this legacy auto-capture must never override
    // an explicit user selection.
    if (finalData.content) {
      finalData.content.forEach((block: any, index: number) => {
        if (block.type?.includes('Ad') && !block.props?.fallbackBlock && !block.props?.fallbackStoryId && lastContentCardsRef.current[index]) {
          block.props = block.props || {};
          block.props.fallbackBlock = lastContentCardsRef.current[index];
        }
      });
    }

    // 2. Inject into zones
    if (finalData.zones) {
      Object.keys(finalData.zones).forEach(zoneKey => {
        const blocks = finalData.zones[zoneKey];
        if (!blocks || !Array.isArray(blocks)) return;
        blocks.forEach((block: any, idx: number) => {
          if (block.type?.includes('Ad') && !block.props?.fallbackBlock && !block.props?.fallbackStoryId) {
            const keyWithIdx = `${zoneKey}-${idx}`;
            const lastCard = lastCardsRef.current[keyWithIdx] || lastCardsRef.current[zoneKey];
            if (lastCard) {
              block.props = block.props || {};
              block.props.fallbackBlock = lastCard;
            }
          }
        });
      });
    }
    return finalData;
  }, []);

  // --- Autosave: debounced, retried with backoff, never reports "saved" for edits it has not sent.
  const persistNow = useCallback(
    async (attempt = 1): Promise<void> => {
      const data = latestRef.current;
      if (!data) return;
      const token = checkAuth();
      if (!token) {
        dispatchSave({ type: "failure", message: "You are signed out. Sign in again to save.", attempt: MAX_SAVE_ATTEMPTS });
        return;
      }
      const version = editVersionRef.current;
      const seq = ++requestSeqRef.current;
      dispatchSave({ type: "start", attempt });
      try {
        const base = import.meta.env.VITE_BACKEND_API;
        const res = await fetch(`${base}/pagestudio/autosave`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            pageId,
            // The last-published snapshot is carried forward untouched on every autosave; only handlePublish updates it.
            data: { ...injectFallbacks(data as PageStudioData), publishedSnapshot: publishedSnapshotRef.current },
            status: "draft",
            pageType: selectedPage,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const detail = await res.json();
        if (seq !== requestSeqRef.current) return; // superseded by a newer request
        setPageId(detail.pageId);
        // Edited again while this request was in flight: stay dirty, the next debounce saves it.
        dispatchSave(editVersionRef.current === version ? { type: "success", at: Date.now() } : { type: "edit" });
        // Editing Home: propagate navbar/footer changes to every other page so switching pages shows them.
        if (selectedPage === "Home") void syncNavbarLeaderboardFromHome(data as PageStudioData);
      } catch (e) {
        if (seq !== requestSeqRef.current) return;
        console.error("Autosave failed:", e);
        const message = e instanceof Error ? e.message : "Unknown error";
        dispatchSave({ type: "failure", message, attempt });
        if (attempt < MAX_SAVE_ATTEMPTS) {
          debounceRef.current = setTimeout(() => { void persistNow(attempt + 1); }, retryDelayMs(attempt));
        }
      }
    },
    [pageId, selectedPage, injectFallbacks]
  );

  const scheduleAutosave = useCallback(
    (data: PageStudioData) => {
      if (!isPageReady) return;
      latestRef.current = data;
      editVersionRef.current += 1;
      dispatchSave({ type: "edit" });
      if (debounceRef.current) clearTimeout(debounceRef.current as any);
      pendingRef.current = true;
      debounceRef.current = setTimeout(() => { pendingRef.current = false; void persistNow(1); }, 800);
    },
    [isPageReady, persistNow]
  );

  // Save right now (Save draft button, Ctrl/Cmd+S): skips the debounce and restarts the retry count.
  const saveNow = useCallback(() => {
    if (!isPageReady || !latestRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current as any);
    pendingRef.current = false;
    void persistNow(1);
  }, [isPageReady, persistNow]);

  // Warn before leaving with edits that are not on the server.
  useEffect(() => {
    if (!hasUnsavedChanges(saveStatus)) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveStatus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  // Leaving a page with an unsent edit saves it first (this cleanup still holds the old page's save function and data).
  useEffect(() => {
    return () => {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current as any);
      void persistNow(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage, activeSection, activeAuthor]);

  const handleOnChange = useCallback((newData: PageStudioData) => {
    if (!previousDataRef.current) {
      previousDataRef.current = newData;
      scheduleAutosave(newData);
      return;
    }

    const prevData = previousDataRef.current;

    // 1. Track top-level content cards
    if (newData.content) {
      newData.content.forEach((block, index) => {
        if (isFallbackCardBlock(block)) {
          lastContentCardsRef.current[index] = JSON.parse(JSON.stringify(block));
        }
      });
    }

    // 2. Auto-capture fallback blocks for zones
    if (newData.zones) {
      const zones = newData.zones;
      Object.keys(zones).forEach(zoneKey => {
        const blocks = zones[zoneKey];
        const prevBlocks = prevData.zones?.[zoneKey] || [];
        if (!blocks || !Array.isArray(blocks)) return;

        // Track items by index for precision
        blocks.forEach((block: any, idx: number) => {
          if (isFallbackCardBlock(block)) {
            lastCardsRef.current[`${zoneKey}-${idx}`] = JSON.parse(JSON.stringify(block));
          }
        });

        // Also track the general zone card (best match)
        const currentCard = blocks.find(isFallbackCardBlock);
        if (currentCard) {
          lastCardsRef.current[zoneKey] = JSON.parse(JSON.stringify(currentCard));
        }
        else {
          const prevCard = prevBlocks.find(isFallbackCardBlock);
          if (prevCard) {
            lastCardsRef.current[zoneKey] = JSON.parse(JSON.stringify(prevCard));
          }
        }
      });
    }

    previousDataRef.current = newData;
    // Keep homeDataRef up-to-date with the latest in-memory Home page data
    if (selectedPage === "Home") {
      homeDataRef.current = newData;
    }
    scheduleAutosave(newData);
  }, [selectedPage, scheduleAutosave]);

  // --- Fetch page data
  const fetchPageData = useCallback(
    async (pageType: string) => {
      setIsPageLoading(true);
      setIsPageReady(false);
      const base = import.meta.env.VITE_BACKEND_API;
      // 🔑 Encode section into pageType
      const resolvedPageType = resolvePageTypeKey(pageType, activeSection, activeAuthor);

      const url = `${base}/pagestudio/page?pageType=${encodeURIComponent(
        resolvedPageType
      )}`;

      const token = checkAuth();
      if (!token) {
        // This return is above the try/finally that would clear the flag, so
        // it has to clear it itself — otherwise a missing token pins the
        // editor on "Loading page data…" forever.
        setIsPageLoading(false);
        return;
      }

      try {
        const res = await fetch(url, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();



        // If backend returns no content, use the default initial data for this page type
        const rawData = (Array.isArray(data?.data?.content) && data.data.content.length > 0)
          ? data.data
          : getInitialDataForPage(pageType as PageType);

        // Track the last explicitly-published snapshot for this page so
        // autosave can carry it forward untouched (see scheduleAutosave).
        // Pages that have never been published under this scheme have none.
        publishedSnapshotRef.current = data?.data?.publishedSnapshot ?? null;

        // For Home page, cache the data so non-Home pages always get the latest navbar
        if (pageType === "Home") {
          homeDataRef.current = rawData;
        } else if (!homeDataRef.current) {
          try {
            const homeUrl = `${base}/pagestudio/page?pageType=Home`;
            const homeRes = await fetch(homeUrl, {
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                'Content-Type': 'application/json'
              }
            });
            const homeDataJson = await homeRes.json();
            if (Array.isArray(homeDataJson?.data?.content) && homeDataJson.data.content.length > 0) {
              homeDataRef.current = homeDataJson.data;
            } else {
              homeDataRef.current = getInitialDataForPage('Home');
            }
          } catch (e) {
            console.warn("Failed to fetch Home navbar for cross-page sync:", e);
            homeDataRef.current = getInitialDataForPage('Home');
          }
        }

        // For non-Home pages, inject the latest Home navbar props so any
        // show/hide changes made on Home are immediately reflected here,
        // without waiting for autosave or publish to sync.
        const navbarSyncedData =
          pageType !== "Home" && homeDataRef.current
            ? injectHomeNavbarIntoPageData(rawData, homeDataRef.current)
            : rawData;

        // Grid blocks' Automatic mode only applies on Home — correct any
        // stale `mode: 'automatic'` left over from before this restriction
        // (or copied over from Home) so the editor doesn't show automatic
        // notices/behavior on other page types.
        const finalData = renameLegacyTitle(sanitizeAutomaticGridMode(navbarSyncedData, pageType as PageType));

        setPageData(finalData);
        setPageId(data?.pageId || null);
        setIsPageReady(true);
      } catch (error) {
        console.error("Error fetching page:", error);
      } finally {
        setIsPageLoading(false);
      }
    },
    // Not pageId: the fetch sets it, which would refetch the page it just loaded.
    [activeSection, activeAuthor]
  );

  useEffect(() => {
    if (!selectedPage) return;

    if (debounceRef.current) clearTimeout(debounceRef.current as any);
    latestRef.current = null;
    publishedSnapshotRef.current = null;
    setPageData(null);
    fetchPageData(selectedPage);
  }, [selectedPage, activeSection, activeAuthor, fetchPageData]);

  // --- Publish function
  const handlePublish = useCallback(
    (data: PageStudioData, skipPreview: boolean = false) => {
      // Ensure all fallbacks are injected before publishing
      const finalData = injectFallbacks(data);

      // Record this as the new "last published" snapshot so unrelated
      // republish triggers elsewhere (campaign pause/play, story publish,
      // navbar sync, etc.) always render from a deliberately published
      // state, never an in-progress unpublished edit. Carry it forward
      // locally immediately — not just after the request resolves — so an
      // autosave firing right after this publish doesn't race it.
      publishedSnapshotRef.current = finalData;
      const publishToken = checkAuth();
      if (publishToken) {
        const base = import.meta.env.VITE_BACKEND_API;
        void fetch(`${base}/pagestudio/autosave`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publishToken}`,
          },
          body: JSON.stringify({
            pageId,
            data: { ...finalData, publishedSnapshot: finalData },
            status: "draft",
            pageType: selectedPage,
          }),
        })
          .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); })
          .catch((e) => {
            console.error("Failed to persist published snapshot:", e);
            window.dispatchEvent(new CustomEvent("studio:notice", { detail: { tone: "error", title: "Publish not saved", message: "The server did not accept this publish. Your edits are still here — try Publish again." } }));
          });
      }

      const payload = { ...finalData, __meta: { pageType: selectedPage, activeSection, activeAuthor } };
      const id = savePublishedPage(payload);
      if (!id) {
        window.dispatchEvent(new CustomEvent("studio:notice", { detail: { tone: "error", title: "Preview unavailable", message: "Allow site storage in your browser to open previews." } }));
        return finalData;
      }
      // When the Home page is published, propagate any leaderboard placement
      // card sitting next to the navbar to every other navbar-bearing page so
      // it shows up there in the same position. Fire-and-forget — do not
      // block the existing publish flow.
      if (selectedPage === "Home") {
        void syncNavbarLeaderboardFromHome(finalData);
      }
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const publishUrl = `${baseUrl}#/published/${id}`;
      if (!skipPreview) {
        window.open(publishUrl, "_blank", "noopener,noreferrer");
      }
      return finalData;
    },
    [selectedPage, activeSection, activeAuthor, pageId]
  );

  if (isLoading) return <LoadingScreen text="Loading stories..." />;
  if (isPageLoading) return <LoadingScreen text="Loading page data..." />;

  // const stories = getStories(); // Remove redundant call
  const hasNoStories = stories.length === 0;
  const activeConfig = getConfigForPage(selectedPage);

  const libraryLabels = Object.fromEntries(
    Object.entries((activeConfig as any).components ?? {}).map(([key, c]: [string, any]) => [key, c?.label ?? key])
  ) as Record<string, string>;
  const overrides = {
    // Every Puck `select` field (Select Story, colours, ...) uses the shared Studio dropdown.
    fieldTypes: { select: StudioSelectField } as unknown as NonNullable<Overrides["fieldTypes"]>,
    // Search box above the grouped list; non-matching items are hidden (see LibrarySearch.tsx).
    components: ({ children }: { children: React.ReactNode }) => <LibraryPanel labels={libraryLabels}>{children}</LibraryPanel>,
    componentItem: ({ children, name }: { children: React.ReactNode; name: string }) => (
      <LibraryItem name={name} label={libraryLabels[name]}>{children}</LibraryItem>
    ),
    ...PuckOverrides(
    selectedPage,
    setSelectedPage,
    scheduleAutosave,
    handlePublish,
    saveStatus,
    saveNow,
    activeSection,
    setActiveSection,
    activeAuthor,
    setActiveAuthor
  ),
  };

  const Layout =
    selectedPage === "Home"
      ? HomeLayout
      : selectedPage === "Section"
        ? SectionLayout
        : selectedPage === "Blog"
          ? BlogLayout
          : selectedPage === "Videos"
            ? VideosLayout
            : selectedPage === "Author" || selectedPage === "AuthorsList"
              ? AuthorLayout
              : selectedPage === "Error"
                ? ErrorLayout
                : HomeLayout;

  return (
    <ActiveSectionContext.Provider value={{ activeSection, setActiveSection, activeAuthor, setActiveAuthor }}>
      <div className="studio-shell studio-workspace">
      {pageData ? (
        <Layout>
          {hasNoStories && (
            <div className="studio-banner">
              <p>⚠️ No stories available from API. Dropdowns will be empty.</p>
            </div>
          )}
          {selectedPage === "Author" || selectedPage === "AuthorsList" ? (
            authors.length === 0 && (
              <div className="studio-banner">
                <p>⚠️ No authors available from API. Author dropdowns may be empty.</p>
              </div>
            )
          ) : null
          }
          <div className="studio-puck">
          <Puck
            key={`${selectedPage}-${activeSection || ''}-${stories.length}-${authors.length}-${campaigns.length}-${placements.length}`}
            config={activeConfig}
            data={pageData}
            onPublish={(data) => handlePublish(data as PageStudioData)}
            onChange={(data) => handleOnChange(data as PageStudioData)}
            overrides={overrides}
            viewports={STUDIO_VIEWPORTS}
          />
          </div>
        </Layout>
      ) : (
        <p>Loading page {selectedPage}...</p>
      )}
      </div>
    </ActiveSectionContext.Provider>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg font-semibold">{text}</p>
    </div>
  );
}
