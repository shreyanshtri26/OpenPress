import { StudioSelectField } from './fields/StudioSelectField';
import { LibraryPanel, LibraryItem } from './LibrarySearch';
import type { Overrides } from '@measured/puck';
import { StudioDropdown } from './fields/StudioDropdown';
import { StudioHeader, HeaderPortal } from './StudioHeader';
import { describeSave, type SaveStatus } from './saveStatus';
import { validatePageForPublish, blockingIssues } from './validatePage';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGetPuck } from "@measured/puck";
import { type PageStudioData, type PageType } from "./builderConfig";
import { renderHomePageFromPuckJSON } from "../../helpers/renderHomePageFromPuckJSON";
import { renderErrorPageFromPuckJSON } from "../../helpers/renderErrorPageFromPuckJSON";
import { renderSupportUsPageFromPuckJSON } from "../../helpers/renderSupportUsPageFromPuckJSON";
import { renderAboutPageFromPuckJSON } from "../../helpers/renderAboutPageFromPuckJSON";
import { renderAuthorsListPageFromPuckJSON } from "../../helpers/renderAuthorsListPageFromPuckJSON";
import { renderAuthorPageFromPuckJSON } from "../../helpers/renderAuthorPageFromPuckJSON";
import { renderPrivacyPolicyPageFromPuckJSON } from "../../helpers/renderPrivacyPolicyPageFromPuckJSON";
import { renderMediaCouncilPageFromPuckJSON } from "../../helpers/renderMediaCouncilPageFromPuckJSON";
import { renderContactUsPageFromPuckJSON } from "../../helpers/renderContactUsPageFromPuckJSON";
import { getAuthorOptions } from "./authorData";
import { checkAuth } from "../../utils/auth.ts";
import { extractReadyToPublishStories, getHomeChromeLayoutForPublish, getSavedHomeChromeLayout, markHomeNavbarLeaderboardPublished, publishPwaFiles } from "./syncNavbarLeaderboard";
import { buildStoriesById } from "../../publish/publishContext";
import { findEmptyAutoGridCards } from "./blocks/useAutoGridCardAssignments";
import {
  checkRepublishJob,
  getLastKnownRepublishJob,
  hasReadRepublishStatus,
  hasSeenRepublishToast,
  markRepublishToastSeen,
  startRepublishAll,
  type RepublishFailure,
  type RepublishJob,
} from "./republishAllClient";

type RepublishToast = {
  key: string;
  tone: "success" | "info" | "error";
  title: string;
  message?: string;
  failed?: RepublishFailure[];
  failedCount?: number;
};

const REPUBLISH_LABELS: Record<string, string> = {
  chrome: "Site-wide publish",
  campaign: "Campaign publish",
  story: "Story publish",
  blog: "Story pages publish",
};
// Live "pages published / total pages" card for the site-wide publish.
const PublishProgress = ({ job, finished, savingPage }: { job: RepublishJob | null; finished: boolean; savingPage: string | null }) => {
  const total = job?.total ?? 0;
  const doneNum = job?.done ?? 0;
  const totalNum = total || doneNum || 0;
  const done = finished && !job?.failedCount ? totalNum : Math.min(doneNum, totalNum);
  const known = totalNum > 0 && !isNaN(totalNum);
  const percent = known && totalNum > 0 ? Math.round((done / totalNum) * 100) : 0;
  return (
    <div className="studio-progress" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-sm">
          {finished ? (job?.failedCount ? "Publish finished with errors" : "All pages published") : job ? "Publishing all pages" : `Publishing ${savingPage ?? "page"}…`}
        </span>
        {known && <span className="text-xs tabular-nums text-inherit">{done} of {total} pages</span>}
      </div>
      <div className="studio-progress-track">
        <div
          className={`studio-progress-bar ${finished && job?.failedCount ? "is-warn" : ""} ${known ? "" : "w-1/3 animate-pulse"}`}
          style={known ? { width: `${percent}%` } : undefined}
        />
      </div>
      <p className="text-[11px]  mt-1.5">
        {known
          ? `${percent}% done${job?.failedCount ? ` · ${job.failedCount} failed` : ""}`
          : job ? "Preparing the list of pages…" : "Saving this page, then the rest of the site."}
      </p>
    </div>
  );
};

const republishLabel = (reason?: string): string =>
  REPUBLISH_LABELS[reason ?? ""] ?? "Site-wide publish";

// Persistent toasts for the site-wide publish job; each shows once per browser.
const republishToastsFor = (job: RepublishJob): RepublishToast[] => {
  const toasts: RepublishToast[] = [];
  const pass = job.pass ?? 1;

  for (const result of job.myCompletedPasses ?? []) {
    const followUp =
      job.isActive && pass > result.pass ? " The queued changes are now being published." : "";
    const key = `pass:${job.jobId}:${result.pass}`;
    // Older backends do not record a pass's reason; the current pass shares the job's.
    const label = republishLabel(result.reason ?? (result.pass === pass ? job.reason : undefined));

    if (result.status === "failed") {
      toasts.push({
        key,
        tone: "error",
        title: `${label} failed`,
        message: `${result.error || "Publishing stopped."} Publish again to retry.${followUp}`,
        failed: result.failed,
        failedCount: result.failedCount,
      });
    } else if (result.status === "completed_with_errors") {
      toasts.push({
        key,
        tone: "error",
        title: `${label} finished, ${result.failedCount} page(s) failed`,
        message: `Publish again to retry.${followUp}`,
        failed: result.failed,
        failedCount: result.failedCount,
      });
    } else {
      toasts.push({
        key,
        tone: "success",
        title: `${label} completed`,
        message: `${result.done}${result.total ? ` of ${result.total}` : ""} page(s) published.${followUp}`,
      });
    }
  }

  if (job.isActive && job.queuedByMe) {
    toasts.push({
      key: `queued:${job.jobId}:${pass}`,
      tone: "info",
      title: `A ${republishLabel(job.reason).toLowerCase()} is already in progress`,
      message: "Your changes will be published right after it finishes.",
    });
  }

  if (job.isActive && job.inCurrentPass && pass > 1) {
    toasts.push({
      key: `followup:${job.jobId}:${pass}`,
      tone: "info",
      title: "Previous publish completed",
      message: "Your changes are now being published.",
    });
  }

  return toasts;
};

const PAGE_OPTIONS = [
  { label: "Home", value: "Home" },
  { label: "Videos", value: "Videos" },
  { label: "Video Author", value: "VideoAuthor" },
  { label: "Blog", value: "Blog" },
  { label: "Section", value: "Section" },
  { label: "Error", value: "Error" },
  { label: "About", value: "About" },
  { label: "Support Us", value: "SupportUs" },
  { label: "Privacy Policy", value: "PrivacyPolicy" },
  { label: "Editorial Standards", value: "MediaCouncil" },
  { label: "Contact Us", value: "ContactUs" },
  { label: "Author", value: "Author" },
  { label: "All Authors", value: "AuthorsList" },
];

interface HeaderProps {
  selectedPage: PageType;
  setSelectedPage: (page: PageType) => void;
  scheduleAutosave: (data: PageStudioData) => void;
  handlePublish: (data: PageStudioData, skipPreview?: boolean) => any;
  saveStatus: SaveStatus;
  saveNow: () => void;
  activeSection: string | null;
  setActiveSection: (section: string | null) => void;
  activeAuthor: string | null;
  setActiveAuthor: (authorId: string | null) => void;
}


type Story = {
  storyId?: string;
  slug?: string;
  title?: string;
  headline?: string;
  storySummary?: string;
  description?: any;
  Category?: string | string[];
  category?: string;
  Section?: string | string[];
  section?: string;
  canonicalUrl?: string;
  authorName?: string;
  authorId?: string;
  author?: string;
  image?: string;
  imageUrl?: string;
  socialImage?: string;
  socialHeadline?: string;
  publishUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  publishDate?: string;
  readTime?: string;
  keywords?: [];
  byline?: string[];
  mediaAltText?: string;
  mediaCaption?: string;
  imageFocalPoint?: { x: number; y: number };
  proposedFilingDate?: string;
};

const getStoryTaxonomyCategory = (story: Story): string => {
  if (Array.isArray(story.Category)) {
    const firstCategory = story.Category.find(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
    );

    if (firstCategory) return firstCategory;
  }

  if (typeof story.Category === 'string' && story.Category.trim().length > 0) {
    return story.Category.trim();
  }

  if (Array.isArray(story.Section)) {
    const firstSection = story.Section.find(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
    );

    if (firstSection) return firstSection;
  }

  if (typeof story.Section === 'string' && story.Section.trim().length > 0) {
    return story.Section.trim();
  }

  return story.category || story.section || 'General';
};

// type SectionResponse = {
//   values: string[];
// };

// type StoryMap = Record<string, any>;



export function PuckHeaderActions({
  selectedPage,
  setSelectedPage,

  handlePublish,
  saveStatus,
  saveNow,
  activeSection,
  setActiveSection,
  activeAuthor,
  setActiveAuthor,
}: HeaderProps) {
  const saving = saveStatus.state === 'saving';
  // Re-render once a second while showing "Saved Ns ago" so the label does not go stale.
  const [, tick] = useState(0);
  useEffect(() => {
    if (saveStatus.state !== 'saved') return;
    const id = window.setInterval(() => tick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, [saveStatus]);
  // Read editor state on demand (in click handlers) so every edit does not re-render the header.
  const getPuck = useGetPuck();
  const appState = {
    get data() {
      return getPuck().appState.data;
    },
  };
  const [sections, setSections] = useState<string[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Site-wide republish job, queued on the backend when Home's shared chrome
  // changes (see republishAllClient.ts). The publish button never waits for it;
  // these two pieces of state only carry its messages.
  const [republishNotice, setRepublishNotice] = useState<
    { tone: "info" | "error"; title: string; message: string } | null
  >(null);
  const [republishToasts, setRepublishToasts] = useState<RepublishToast[]>([]);
  // Other editor modules (e.g. Preview) report problems through this event instead of alert().
  useEffect(() => {
    const onNotice = (e: Event) => setRepublishNotice((e as CustomEvent).detail);
    window.addEventListener("studio:notice", onNotice);
    return () => window.removeEventListener("studio:notice", onNotice);
  }, []);
  // Publishing stays locked while any site-wide job is active.
  const [activeRepublishJob, setActiveRepublishJob] = useState<RepublishJob | null>(() => {
    const job = getLastKnownRepublishJob();
    return job?.isActive ? job : null;
  });
  // False until the job status has been read once. The header remounts on every
  // editor render, so this must not start over each time.
  const [republishChecked, setRepublishChecked] = useState(hasReadRepublishStatus);
  const republishPollRef = useRef<number | null>(null);
  // The last job this tab watched finish, kept on screen for a few seconds so "27 of 27 pages" is seen.
  const [finishedJob, setFinishedJob] = useState<RepublishJob | null>(null);
  const watchedJobRef = useRef<RepublishJob | null>(null);
  const shownJobIdRef = useRef<string | null>(null);

  const token = checkAuth();

  // A publish that rebuilds the shared chrome rewrites every section, author
  // and story page from this tab. Closing it midway leaves some pages on the
  // new navbar and some on the old, with no record of where it stopped — so
  // warn before the tab goes away. (Browsers show their own generic wording;
  // the returned string only signals that we want the prompt.)
  useEffect(() => {
    if (!isPublishing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPublishing]);

  const stopRepublishPolling = useCallback(() => {
    if (republishPollRef.current !== null) {
      window.clearInterval(republishPollRef.current);
      republishPollRef.current = null;
    }
  }, []);

  const handleRepublishJob = useCallback(
    (job: RepublishJob | null) => {
      if (job) {
        const fresh = republishToastsFor(job).filter((t) => !hasSeenRepublishToast(t.key));
        if (fresh.length > 0) {
          setRepublishToasts((current) => [
            ...current,
            ...fresh.filter((t) => !current.some((c) => c.key === t.key)),
          ]);
        }
      }
      if (job?.isActive) {
        watchedJobRef.current = job;
      } else {
        // Finished while we were watching, or so quickly that the first read already shows it done.
        const justFinished =
          job && job.finishedAt && Date.now() - Date.parse(job.finishedAt) < 15_000 && shownJobIdRef.current !== job.jobId;
        const done = watchedJobRef.current ? (job ?? watchedJobRef.current) : justFinished ? job : null;
        watchedJobRef.current = null;
        if (done) {
          shownJobIdRef.current = done.jobId;
          setFinishedJob(done);
          window.setTimeout(() => setFinishedJob(null), 6000);
        }
      }
      setActiveRepublishJob(job?.isActive ? job : null);
      // Nothing left to watch: finished or abandoned.
      if (!job || !job.isActive) stopRepublishPolling();
    },
    [stopRepublishPolling]
  );

  // Polls while a job is active, so the publish button unlocks when it ends.
  const startRepublishPolling = useCallback(() => {
    stopRepublishPolling();
    republishPollRef.current = window.setInterval(() => {
      // A failed read keeps the lock and tries again on the next poll.
      void checkRepublishJob().then(({ known, job }) => {
        if (known) handleRepublishJob(job);
      });
    }, 1_500);
  }, [handleRepublishJob, stopRepublishPolling]);

  // On mount, resume watching a running job and show results not yet dismissed.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { known, job } = await checkRepublishJob();
      if (cancelled) return;
      setRepublishChecked(true);
      // A failed read must not unlock the button.
      if (!known) return;
      handleRepublishJob(job);
      if (job?.isActive) startRepublishPolling();
    })();

    return () => {
      cancelled = true;
      stopRepublishPolling();
    };
  }, [handleRepublishJob, startRepublishPolling, stopRepublishPolling]);

  // Fetch sections when page type is "Section"
  useEffect(() => {
    if (selectedPage !== "Section") return;

    const fetchSections = async () => {
      setLoadingSections(true);
      try {
        const base = import.meta.env.VITE_BACKEND_API;
        const res = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.values)) {
            setSections(data.values);
            // Set first section as default if no active section
            if (!activeSection && data.values.length > 0) {
              setActiveSection(data.values[0]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch sections:", error);
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSections();
  }, [selectedPage, activeSection, setActiveSection]);


  // After a page other than Home is published: rebuild every page with Home's saved navbar and footer.
  const publishWholeSite = async () => {
    const layout = await getSavedHomeChromeLayout();
    if (!layout) {
      setRepublishNotice({ tone: "error", title: "Site-wide publish not started", message: "This page published, but Home's layout could not be loaded for the other pages." });
      return;
    }
    const result = await startRepublishAll({ layout });
    if (result.outcome === "error") {
      setRepublishNotice({ tone: "error", title: "Site-wide publish not started", message: result.message || "This page published, but the other pages were not queued." });
      return;
    }
    handleRepublishJob(result.job);
    startRepublishPolling();
  };

  // Publish Home page to static HTML
  const handlePublishToFile = async () => {
    if (selectedPage !== "Home") return;

    const emptyCards = findEmptyAutoGridCards(appState.data as any);
    if (emptyCards.length > 0) {
      setRepublishNotice({
        tone: "error",
        title: "Can't publish",
        message: `${emptyCards.length === 1 ? "1 card doesn't" : `${emptyCards.length} cards don't`} have any stories matching the selected filters. Change the filters or remove the empty card${emptyCards.length === 1 ? "" : "s"}.`,
      });
      return;
    }

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        // Shared with the backend republish worker (src/publish/publishContext.ts)
        // so a page renders identically whichever of the two published it.
        storiesById = buildStoriesById(extractReadyToPublishStories(storiesData));
      }

      const finalData = handlePublish(appState.data as any, true);

      // Render to HTML using the renderer
      const htmlContent = renderHomePageFromPuckJSON({
        pageType: selectedPage || "Home",
        data: finalData || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        activeSection: 'HOME',
        campaigns: campaigns,
      });




      //  Call the API
      const response = await fetch(
        `${base}/pagestudio/saveHomeHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload HTML");
      }

      // Publish PWA static files (manifest.json, sw.js, screenshots) to S3
      // so the live site always has the latest PWA metadata. Runs silently.
      // Not page HTML, and not tied to the navbar — stays unconditional.
      try {
        await publishPwaFiles();
      } catch (e) {
        console.warn("PWA files publish failed:", e);
      }

      // Publishing Home publishes the whole site: every other page is rebuilt from its saved layout with
      // Home's current navbar and footer, in one backend job whose progress (done / total pages) is shown
      // in the progress card. There is no "did the chrome change?" check: that guess was the reason
      // settings such as the LinkedIn icon never reached the other pages.
      let republishQueued = true;
      {
        const layout = await getHomeChromeLayoutForPublish(finalData || (appState.data as any));

        if (!layout) {
          // Placements registry never resolved, so the layout would be missing
          // a real leaderboard. Publishing it would strip that ad site-wide.
          republishQueued = false;
          setRepublishNotice({
            tone: "error",
            title: "Site-wide publish not started",
            message:
              "Home published, but the other pages were not: ad placements could not be loaded. Publish Home again.",
          });
        } else {
          const result = await startRepublishAll({ layout });

          if (result.outcome === "started" || result.outcome === "queued") {
            handleRepublishJob(result.job);
            startRepublishPolling();
          } else {
            republishQueued = false;
            setRepublishNotice({
              tone: "error",
              title: "Site-wide publish not started",
              message: result.message
                ? `Home published, but the other pages were not: ${result.message}`
                : "Home published, but the other pages were not queued.",
            });
          }
        }
      }

      // Update the signature so future change-detection is accurate — but only
      // when the other pages are actually going to be rebuilt. Marking it after
      // a failed queue attempt would leave them on the old chrome forever.
      if (republishQueued) {
        await markHomeNavbarLeaderboardPublished(finalData || (appState.data as any));
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "The page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };


  // Publish Error page to static HTML
  const handlePublishErrorToFile = async () => {
    if (selectedPage !== "Error") return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        // Build storiesById map with all story fields including publishUrl
        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              Section: story.Section || story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '',
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }

      // Render to HTML using the renderer
      const htmlContent = renderErrorPageFromPuckJSON({
        pageType: selectedPage || "Error",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        campaigns: campaigns,
      });



      // Call the API
      const response = await fetch(
        `${base}/pagestudio/saveErrorHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload Error HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish error page:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "Error page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };


  // Publish Section page to static HTML
  const handlePublishSectionToFile = async () => {
    if (selectedPage !== "Section" || !activeSection) return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      const resolvedPageType = `Section-${activeSection}`;
      // Use current app state data instead of fetching from API


      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        // Build storiesById map with all story fields including publishUrl
        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '', // This is the key field!
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }

      // Render to HTML using the renderer
      const htmlContent = renderHomePageFromPuckJSON({
        pageType: resolvedPageType,
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        activeSection: activeSection,
        campaigns: campaigns,
      });


      // Call the API with htmlContent and sectionValue
      const response = await fetch(
        `${base}/pagestudio/saveSectionHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
            sectionValue: activeSection,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload Section HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish section:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "Section could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };


  // Publish About page to static HTML
  const handlePublishAboutToFile = async () => {
    if (selectedPage !== "About") return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Use current app state data instead of fetching from API


      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        // Build storiesById map with all story fields including publishUrl
        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '', // This is the key field!
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }

      // Render to HTML using the renderer
      const htmlContent = renderAboutPageFromPuckJSON({
        pageType: selectedPage || "About",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        activeSection: 'ABOUT',
        campaigns: campaigns,
      });


      // Call the API
      const response = await fetch(
        `${base}/pagestudio/saveAboutHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload About HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish about page:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "About page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishSupportUsToFile = async () => {
    if (selectedPage !== "SupportUs") return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Use current app state data instead of fetching from API


      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        // Build storiesById map with all story fields including publishUrl
        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '', // This is the key field!
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }

      // Render to HTML using the renderer
      const htmlContent = renderSupportUsPageFromPuckJSON({
        pageType: selectedPage || "SupportUs",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        activeSection: 'SUPPORT-US',
        campaigns: campaigns,
      });


      // Call the API
      const response = await fetch(
        `${base}/pagestudio/saveSupportUsHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload Support Us HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish support us page:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "Support us page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };



  const handlePublishPrivacyPolicyToFile = async () => {
    if (selectedPage !== "PrivacyPolicy") return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Use current app state data instead of fetching from API


      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        // Build storiesById map with all story fields including publishUrl
        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '', // This is the key field!
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }


      // Render to HTML using the renderer
      const htmlContent = renderPrivacyPolicyPageFromPuckJSON({
        pageType: selectedPage || "PrivacyPolicy",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        campaigns: campaigns,
      });


      // Call the specific API for Privacy Policy
      const response = await fetch(
        `${base}/pagestudio/savePrivacyPolicyHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload Privacy Policy HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish privacy policy page:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "Privacy policy page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };

  // Publish Contact Us page to static HTML
  const handlePublishContactUsToFile = async () => {
    if (selectedPage !== "ContactUs") return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Fetch stories with publishUrl
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '',
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }

      // Render to HTML using the renderer
      const htmlContent = renderContactUsPageFromPuckJSON({
        pageType: selectedPage || "ContactUs",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        campaigns: campaigns,
      });

      // Call the specific API for Contact Us
      const response = await fetch(
        `${base}/pagestudio/saveContactUsHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save Contact Us HTML to backend");
      }

      // try {
      //   await fetch(`${base}/pagestudio/saveSiteMap`, {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       ...(token && { Authorization: `Bearer ${token}` })
      //     },
      //   });
      //   await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       ...(token && { Authorization: `Bearer ${token}` })
      //     },
      //   });
      // } catch (error) {
      //   console.error("Error saving sitemap:", error);
      // }
    } catch (error) {
      console.error("Failed to publish Contact Us page:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "Contact Us page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };


  // Publish Media Council page to static HTML
  const handlePublishMediaCouncilToFile = async () => {
    if (selectedPage !== "MediaCouncil") return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Use current app state data instead of fetching from API


      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        // Build storiesById map with all story fields including publishUrl
        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '', // This is the key field!
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }


      // Render to HTML using the renderer
      const htmlContent = renderMediaCouncilPageFromPuckJSON({
        pageType: selectedPage || "MediaCouncil",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        campaigns: campaigns,
      });


      // Call the specific API for Media Council
      const response = await fetch(
        `${base}/pagestudio/saveMediaCouncilHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload Media Council HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } finally {
      setIsPublishing(false);
    }
  };




  // Publish Authors List page to static HTML
  const handlePublishAuthorsListToFile = async () => {
    if (selectedPage !== "AuthorsList") return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Use current app state data instead of fetching from API

      // Fetch stories with publishUrl using the proper API
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        // Build storiesById map with all story fields including publishUrl
        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
              category: story.section || 'General',
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || 'Unknown Author',
              image: story.image || '',
              imageUrl: story.image || '',
              publishUrl: story.redirectUrl || '', // This is the key field!
              slug: story.slug || '',
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }

      // Render to HTML using the renderer
      const htmlContent = renderAuthorsListPageFromPuckJSON({
        pageType: selectedPage || "AuthorsList",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        activeSection: 'AUTHORS-LIST',
        campaigns: campaigns,
      });


      // Call the API
      const response = await fetch(
        `${base}/pagestudio/saveAuthorsHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload AuthorsList HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish AuthorsList page:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "AuthorsList page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };

  // Publish Single Author page to static HTML
  const handlePublishAuthorPageToFile = async () => {
    if (selectedPage !== "Author" || !activeAuthor) return;

    setIsPublishing(true);
    try {
      const base = import.meta.env.VITE_BACKEND_API;
      const authorOption = getAuthorOptions().find((opt) => opt.value === activeAuthor);
      const authorName = authorOption?.label || "Unknown Author";
      const authorSlug = authorName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Fetch campaigns
      let campaigns: any[] = [];
      try {
        const campRes = await fetch(`${base}/getCampaigns`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaigns = campData.campaigns || [];
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      }

      // Fetch sections for navbar
      let sectionsList: string[] = [];
      try {
        const sectionsRes = await fetch(`${base}/taxonomy/section/values`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Use current app state data instead of fetching from API

      // Fetch stories with publishUrl
      const storiesRes = await fetch(`${base}/story/fetchReadyToPublish`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      let storiesById: Record<string, any> = {};

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        const stories = extractReadyToPublishStories(storiesData);

        stories.forEach((story: any) => {
          if (story.storyId) {
            storiesById[story.storyId] = {
              id: story.storyId,
              title: story.title,
              headline: story.title,
              summary:
                story.storySummary ||
                story.description?.blocks?.[0]?.data?.text ||
                "",
              category: story.section || "General",
              taxonomyCategory: getStoryTaxonomyCategory(story),
              section: story.section,
              author: story.authorName || "Unknown Author",
              image: story.image || "",
              imageUrl: story.image || "",
              publishUrl: story.redirectUrl || "",
              slug: story.slug || "",
              updatedAt: story.updatedAt,
              createdAt: story.createdAt,
              authorId: story.authorId || '',
              byLine: story.byline || [],
              socialImage: story.socialImage || '',
              socialHeadline: story.socialHeadline || '',
            
              description: story.description || null,
              fullDescription: story.fullDescription || '',
            };
          }
        });
      }

      // Render to HTML using the renderer
      const htmlContent = renderAuthorPageFromPuckJSON({
        pageType: selectedPage || "Author",
        data: handlePublish(appState.data as any, true) || appState.data as any,
        storiesById: storiesById,
        sections: sectionsList,
        authorName: authorName,
        authorId: activeAuthor,
        campaigns: campaigns,
      });


      // Call the API
      const response = await fetch(`${base}/pagestudio/saveAuthorHtml`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          htmlContent,
          authorName,
          authorSlug,
          userId: activeAuthor,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload author HTML");
      }

      try {
        await fetch(`${base}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        await fetch(`${base}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }
    } catch (error) {
      console.error("Failed to publish author page:", error);
      setRepublishNotice({ tone: "error", title: "Publish failed", message: "Author page could not be published. Details are in the browser console." });
    } finally {
      setIsPublishing(false);
    }
  };



  // Rebuilds every story page from this Blog template on the backend, then the sitemaps.
  const handlePublishBlogToFile = async () => {
    if (selectedPage !== "Blog") return;

    setIsPublishing(true);
    try {
      const finalData = handlePublish(appState.data as any, true) || appState.data;
      const result = await startRepublishAll({ reason: "blog", blogData: finalData });

      if (result.outcome === "error") {
        setRepublishNotice({
          tone: "error",
          title: "Story pages not published",
          message: result.message || "The publish could not be started. Publish again.",
        });
        return;
      }
      if (result.outcome === "started") {
        setRepublishNotice({
          tone: "info",
          title: "Publish started",
          message: "Story pages will update in a few minutes.",
        });
      }
      handleRepublishJob(result.job);
      startRepublishPolling();
    } catch (error) {
      console.error("Failed to publish blog:", error);
      setRepublishNotice({
        tone: "error",
        title: "Story pages not published",
        message: "The publish could not be started. Publish again.",
      });
    } finally {
      setIsPublishing(false);
    }
  };


  return (
    <>
      {/* Publish toasts share one stack so they never overlap */}
      <div className="studio-toast-stack">
        {(activeRepublishJob || finishedJob || isPublishing) && (
          <PublishProgress
            job={activeRepublishJob ?? finishedJob}
            finished={!activeRepublishJob && !!finishedJob}
            savingPage={isPublishing && !activeRepublishJob && !finishedJob ? selectedPage : null}
          />
        )}
        {republishNotice && (
          <div className="studio-toast-wrap">
            <div className={`studio-toast ${republishNotice.tone === "error" ? "studio-toast--error" : "studio-toast--info"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-sm">{republishNotice.title}</span>
                <button
                  onClick={() => setRepublishNotice(null)}
                  className="studio-toast-x"
                  aria-label="Dismiss message"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs mt-1">{republishNotice.message}</p>
            </div>
          </div>
        )}

        {/* Site-wide publish results; each stays until dismissed */}
        {republishToasts.map((toast) => (
          <div key={toast.key} className="studio-toast-wrap">
            <div
              className={`studio-toast ${
                toast.tone === "error" ? "studio-toast--error" : toast.tone === "success" ? "studio-toast--success" : "studio-toast--info"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-sm">{toast.title}</span>
                <button
                  onClick={() => {
                    markRepublishToastSeen(toast.key);
                    setRepublishToasts((current) => current.filter((t) => t.key !== toast.key));
                  }}
                  className="studio-toast-x"
                  aria-label="Dismiss message"
                >
                  ✕
                </button>
              </div>

              {toast.message && <p className="text-xs mt-1">{toast.message}</p>}

              {toast.failed && toast.failed.length > 0 && (
                <ul className="text-xs max-h-40 overflow-y-auto space-y-1 mt-2">
                  {toast.failed.map((failure, index) => (
                    <li key={`${failure.page}-${index}`}>
                      <span className="font-medium">{failure.page}</span>: {failure.reason}
                    </li>
                  ))}
                </ul>
              )}

              {toast.failed && (toast.failedCount ?? 0) > toast.failed.length && (
                <p className="text-xs  mt-2">
                  Showing the first {toast.failed.length} of {toast.failedCount}.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* LEFT cell: page, section and author pickers */}
      <HeaderPortal slot="left">
        <div className="studio-actions-left">
          <label className="studio-field">
            <span className="studio-field-label">Editing</span>
            <StudioDropdown
              variant="toolbar"
              swatches={false}
              ariaLabel="Page being edited"
              value={selectedPage}
              onChange={(v) => setSelectedPage(v as PageType)}
              options={PAGE_OPTIONS}
            />
          </label>
          {selectedPage === "Section" && (
            <label className="studio-field">
              <span className="studio-field-label">Section</span>
              <StudioDropdown
                variant="toolbar"
                ariaLabel="Section"
                value={activeSection || ""}
                onChange={(v) => setActiveSection((v as string) || null)}
                disabled={loadingSections && !activeSection && sections.length === 0}
                placeholder={loadingSections ? "Loading…" : "No sections"}
                options={Array.from(new Set([...(activeSection ? [activeSection] : []), ...sections])).map((n) => ({ label: n, value: n }))}
              />
            </label>
          )}
          {selectedPage === "Author" && (
            <label className="studio-field">
              <span className="studio-field-label">Author</span>
              <StudioDropdown
                variant="toolbar"
                ariaLabel="Author"
                value={activeAuthor || ""}
                onChange={(v) => setActiveAuthor((v as string) || null)}
                options={(() => {
                  const list = getAuthorOptions().map((o) => ({ label: o.label, value: o.value }));
                  if (activeAuthor && !list.some((o) => o.value === activeAuthor)) list.unshift({ label: activeAuthor, value: activeAuthor });
                  return [{ label: "Select author", value: "" }, ...list];
                })()}
              />
            </label>
          )}
        </div>
      </HeaderPortal>

      {/* RIGHT cell: save status, Save, Preview, Publish */}
      <HeaderPortal slot="right">
        <div className="studio-actions-right">
          <span
            className={`studio-save-status studio-save-status--${saveStatus.state}`}
            role="status"
            aria-live="polite"
            title={saveStatus.state === 'error' ? `Save failed: ${saveStatus.message}` : describeSave(saveStatus)}
          >
            <span className="studio-save-status__dot" aria-hidden="true" />
            <span className="studio-save-status__text">{describeSave(saveStatus)}</span>
          </span>

          <button
            className="studio-btn"
            onClick={saveNow}
            disabled={saving}
            title="Save draft (Ctrl+S)"
          >
            {saveStatus.state === 'error' ? "Retry save" : saving ? "Saving…" : "Save draft"}
          </button>

          <button
            className="studio-btn studio-btn--secondary"
            onClick={() => handlePublish(appState.data as PageStudioData)}
            title="Open a preview in a new tab"
          >
            Preview
          </button>

          {/* Publish button - for Home, Section, Blog, Error, About, PrivacyPolicy, MediaCouncil, ContactUs, Author, AuthorsList, Account and Login pages */}
          {(selectedPage === "Home" || selectedPage === "Section" || selectedPage === "Blog" || selectedPage === "Error" || selectedPage === "About" || selectedPage === "SupportUs" || selectedPage === "PrivacyPolicy" || selectedPage === "MediaCouncil" || selectedPage === "ContactUs" || selectedPage === "Author" || selectedPage === "AuthorsList") && (
            <div className="studio-tip-host">
            <button
              className={`studio-btn studio-btn--primary studio-btn--publish ${activeRepublishJob ? "is-waiting" : ""}`}
              data-save={saveStatus.state}
              data-publishing={isPublishing || activeRepublishJob ? "true" : undefined}
              aria-disabled={!!activeRepublishJob}
              onClick={async () => {
                if (activeRepublishJob) return;

                // Catches a job started elsewhere since the last poll.
                const { known, job } = await checkRepublishJob();
                if (!known) {
                  setRepublishNotice({
                    tone: "error",
                    title: "Can't publish right now",
                    message: "Couldn't check whether a site-wide publish is running. Try again.",
                  });
                  return;
                }
                handleRepublishJob(job);
                if (job?.isActive) {
                  startRepublishPolling();
                  return;
                }

                const publishHandlers: Record<string, () => Promise<void>> = {
                  Home: handlePublishToFile,
                  Blog: handlePublishBlogToFile,
                  Error: handlePublishErrorToFile,
                  About: handlePublishAboutToFile,
                  SupportUs: handlePublishSupportUsToFile,
                  PrivacyPolicy: handlePublishPrivacyPolicyToFile,
                  MediaCouncil: handlePublishMediaCouncilToFile,
                  ContactUs: handlePublishContactUsToFile,
                  AuthorsList: handlePublishAuthorsListToFile,
                  Author: handlePublishAuthorPageToFile,
                  Section: handlePublishSectionToFile,
                };

                // Stop on problems that would publish a broken or unsafe page; nothing is sent to the server.
                const blockers = blockingIssues(validatePageForPublish(appState.data));
                if (blockers.length) {
                  setRepublishNotice({
                    tone: "error",
                    title: "Fix this before publishing",
                    message: blockers.map((i) => i.message).join(" "),
                  });
                  return;
                }

                const handler = publishHandlers[selectedPage];
                if (handler) {
                  // Home and Blog start their own site-wide job; any other page publishes itself and then the rest.
                  await handler();
                  if (selectedPage !== "Home" && selectedPage !== "Blog") await publishWholeSite();
                }
              }}
              disabled={isPublishing || !republishChecked || (selectedPage === "Section" && !activeSection) || (selectedPage === "Author" && !activeAuthor)}
            >
              {isPublishing ? "Publishing…" : "Publish"}
            </button>
            {activeRepublishJob && !isPublishing && (
              <div
                role="tooltip"
                className="studio-tip"
              >
                <p className="font-semibold text-sm">{republishLabel(activeRepublishJob.reason)} in progress</p>
                <p className="mt-1">
                  {activeRepublishJob.total
                    ? `${activeRepublishJob.done} of ${activeRepublishJob.total} pages updated. `
                    : ""}
                  Publishing is paused until it finishes
                  {activeRepublishJob.isMine ? " — we'll notify you here when it's done." : "."}
                </p>
              </div>
            )}
            </div>
          )}
        </div>
      </HeaderPortal>
    </>
  );
}

// The title shown in the middle of the header: the page being edited.
const PAGE_LABELS = new Map(PAGE_OPTIONS.map((o) => [o.value, o.label]));
const headerTitleFor = (page: PageType, section: string | null, author: string | null) => {
  const base = PAGE_LABELS.get(page) ?? page;
  const detail = page === "Section" ? section : page === "Author" ? author : null;
  return detail ? `${base} · ${detail}` : base;
};

/** The editor's current values. Override components read them from here, so their identity never changes. */
export type StudioLive = {
  selectedPage: PageType
  setSelectedPage: (page: PageType) => void
  scheduleAutosave: (data: PageStudioData) => void
  handlePublish: (data: PageStudioData) => void
  saveStatus: SaveStatus
  saveNow: () => void
  activeSection: string | null
  setActiveSection: (section: string | null) => void
  activeAuthor: string | null
  setActiveAuthor: (author: string | null) => void
  libraryLabels: Record<string, string>
}
export const StudioLiveContext = React.createContext<StudioLive | null>(null)
const useLive = () => {
  const live = React.useContext(StudioLiveContext)
  if (!live) throw new Error('Studio overrides rendered outside StudioLiveContext')
  return live
}

/**
 * Puck treats a new component in `overrides` as a new component type and remounts it. Building these inside the editor's
 * render remounted the whole UI (sidebar, header, fields, open dropdowns) on every edit and save-status change. This object
 * is created once; changing values flow through StudioLiveContext instead.
 */
export const STUDIO_OVERRIDES = {
  // Every Puck `select` field (Select Story, colours, ...) uses the shared Studio dropdown.
  fieldTypes: { select: StudioSelectField } as unknown as NonNullable<Overrides["fieldTypes"]>,
  // Search box above the grouped list; non-matching items are hidden (see LibrarySearch.tsx).
  components: ({ children }: { children: React.ReactNode }) => <LibraryPanel labels={useLive().libraryLabels}>{children}</LibraryPanel>,
  componentItem: ({ children, name }: { children: React.ReactNode; name: string }) => (
    <LibraryItem name={name} label={useLive().libraryLabels[name]}>{children}</LibraryItem>
  ),
  header: ({ actions }: { actions: React.ReactNode }) => {
    const l = useLive()
    return <StudioHeader title={headerTitleFor(l.selectedPage, l.activeSection, l.activeAuthor)} actions={actions} />
  },
  headerActions: () => {
    const l = useLive()
    return (
      <PuckHeaderActions
        selectedPage={l.selectedPage}
        setSelectedPage={l.setSelectedPage}
        scheduleAutosave={l.scheduleAutosave}
        handlePublish={l.handlePublish}
        saveStatus={l.saveStatus}
        saveNow={l.saveNow}
        activeSection={l.activeSection}
        setActiveSection={l.setActiveSection}
        activeAuthor={l.activeAuthor}
        setActiveAuthor={l.setActiveAuthor}
      />
    )
  },
  componentOverlay: ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}>
      {children}
    </div>
  ),
}
