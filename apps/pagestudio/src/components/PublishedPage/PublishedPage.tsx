import { Render } from "@measured/puck";
import { useCallback, useEffect, useRef, useState } from "react";

import "@measured/puck/puck.css";
import "../../App.css";
import "../../index.css";
import "../PuckEditor/blocks/MastheadNavbarBlock.css";
import {
  type PageBuilderData,
  type PageType,
  getConfigForPage,
} from "../PuckEditor/builderConfig";
import { loadPublishedPage } from "../PuckEditor/publishStorage";
import { initializeStories } from "../PuckEditor/storyData";
import { initializeAuthors } from "../PuckEditor/authorData";
import { initializeCampaigns, initializePlacements } from "../PuckEditor/campaignData";
import { registerDynamicBlocks } from "../PuckEditor/CommonBlocksConfig";
import { ActiveSectionContext } from "../PuckEditor/ActiveSectionContext";
import { PageZonesContext } from "../PuckEditor/blocks/PageZonesContext";
import { getToken } from "../../utils/auth";


type PublishedPageProps = {
  pageId: string;
  authorSlug?: string;
};

// Extend the PageBuilderData type to include __meta
type PublishedPageData = PageBuilderData & {
  __meta?: {
    pageType: string;
    activeSection?: string | null;
    activeAuthor?: string | null;
  };
};

export function PublishedPage({ pageId, authorSlug }: PublishedPageProps) {
  const [pageData, setPageData] = useState<PublishedPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null);
  const [currentPageType, setCurrentPageType] = useState<PageType>("Home");
  const contentRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);

  // Fetch author-specific page data
  const fetchAuthorPageData = useCallback(async (slug: string) => {
    setIsLoading(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;
      const token = getToken(); // optional — page is public, token just improves cache/auth

      // Initialize stories + authors
      await Promise.all([
        initializeStories({ pageType: "Author" }),
        initializeAuthors(),
        initializePlacements().then(registerDynamicBlocks),
      ]);

      // Fetch page data for Author type
      const url = `${base}/pagestudio/page?pageType=Author`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (data?.data) {
        setPageData({
          ...data.data,
          __meta: { pageType: "Author", activeAuthor: slug }
        });
        setCurrentPageType("Author");
        setActiveAuthor(slug);
      }
    } catch (error) {
      console.error("Failed to fetch author page data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch section-specific page data
  const fetchSectionPageData = useCallback(async (section: string | null) => {
    setIsLoading(true);
    console.log("sectionnnn", section);
    try {
      const base = import.meta.env.VITE_BACKEND_API;
      const token = getToken(); // optional — sections are public, token improves auth if present

      // Determine page type based on section
      const pageType = section !== "HOME" ? "Section" : "Home";
      const resolvedPageType = section !== "HOME" ? `Section-${section}` : "Home";

      // Initialize stories for the section
      await Promise.all([
        initializeStories({
          pageType: pageType as PageType,
          section: section || undefined,
        }),
        initializeAuthors(),
        initializeCampaigns(),
        initializePlacements().then(registerDynamicBlocks),
      ]);

      // Fetch page data for the section
      const url = `${base}/pagestudio/page?pageType=${encodeURIComponent(resolvedPageType)}`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (data?.data) {
        setPageData({
          ...data.data,
          __meta: { pageType }
        });
        setCurrentPageType(pageType as PageType);
      }
    } catch (error) {
      console.error("Failed to fetch section page data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load - load the published page or author profile
  useEffect(() => {
    const loadPage = async () => {
      try {
        if (authorSlug) {
          await fetchAuthorPageData(authorSlug);
          return;
        }

        // First, initialize stories + authors from API
        await Promise.all([
          initializeStories({}),
          initializeAuthors(),
          initializeCampaigns(),
          // Registers Ad_* blocks so placements render in preview
          initializePlacements().then(registerDynamicBlocks),
        ]);
        console.log("Stories and authors loaded for preview page");
        // Then load the published page data
        const livePages = ['login', 'home', 'about', 'privacy-policy', 'media-council', 'contact-us', 'my-account'];

        if (livePages.includes(pageId)) {
          // Special case for live pages.
          const base = import.meta.env.VITE_BACKEND_API;
          const token = getToken();

          let targetPageType = "Home";
          if (pageId === 'about') targetPageType = "About";
          if (pageId === 'privacy-policy') targetPageType = "PrivacyPolicy";
          if (pageId === 'media-council') targetPageType = "MediaCouncil";
          if (pageId === 'contact-us') targetPageType = "ContactUs";

          await initializeStories({ pageType: targetPageType as PageType });

          const url = `${base}/pagestudio/page?pageType=${targetPageType}`;
          const res = await fetch(url, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'Content-Type': 'application/json'
            }
          });
          const data = await res.json();
          if (data?.data) {
            setPageData({ ...data.data, __meta: { pageType: targetPageType } });
            setCurrentPageType(targetPageType as PageType);
          } else {
            // ── Fallback: read from local publish storage (localStorage) ──────
            // The API may require auth (e.g. after logout). If the page was
            // published locally via the Puck builder, serve it from localStorage.
            const localData = loadPublishedPage(pageId) as PublishedPageData | null;
            if (localData) {
              setPageData(localData);
              setCurrentPageType(targetPageType as PageType);
            }
          }
        } else {
          const data = loadPublishedPage(pageId) as PublishedPageData | null;
          setPageData(data);

          // Set the initial page type
          const pageType = (data?.__meta?.pageType || "Home") as PageType;
          setCurrentPageType(pageType);

          // Set active section if available
          if (data?.__meta?.activeSection) {
            setActiveSection(data.__meta.activeSection);
          }
          if (data?.__meta?.activeAuthor) {
            setActiveAuthor(data.__meta.activeAuthor);
          }
        }
      } catch (error) {
        console.error("Failed to load page:", error);
      } finally {
        setIsLoading(false);
        initialLoadRef.current = false;
      }
    };

    loadPage();
  }, [pageId, authorSlug, fetchAuthorPageData]);

  // Handle section changes (after initial load)
  useEffect(() => {
    // Skip on initial load
    if (initialLoadRef.current) return;

    console.log("Section changed to:", activeSection);
    fetchSectionPageData(activeSection);
  }, [activeSection, fetchSectionPageData]);

  // Show loading state while fetching stories
  if (isLoading) {
    return (
      <div className="published">
        <div className="published__container">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="text-lg font-semibold">Loading preview...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if page not found
  if (!pageData) {
    return (
      <div className="published published--missing">
        <div className="published__container">
          <h1 className="published__missing-title">Page unavailable</h1>
          <p className="published__missing-copy">
            The link you followed no longer has published content associated
            with it. The page may have been unpublished or removed from this
            device.
          </p>
          <button
            type="button"
            className="published__return"
            onClick={() => {
              window.location.hash = "";
            }}
          >
            Return to builder
          </button>
        </div>
      </div>
    );
  }

  // Get the active config based on current page type
  const activeConfig = getConfigForPage(currentPageType);

  return (
    <ActiveSectionContext.Provider value={{ activeSection, setActiveSection, activeAuthor, setActiveAuthor }}>
      <PageZonesContext.Provider value={(pageData as any).zones ?? {}}>
      <div className="published">
        <div className="published__content" ref={contentRef}>
          <Render config={activeConfig} data={pageData} />
        </div>
      </div>
      </PageZonesContext.Provider>
    </ActiveSectionContext.Provider>
  );
}
