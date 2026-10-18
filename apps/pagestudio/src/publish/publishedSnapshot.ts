// A page's stored `data` optionally carries a `publishedSnapshot`: a full,
// self-contained copy of the data as of the last explicit "Publish" click
// (see PuckEditor.tsx's handlePublish/scheduleAutosave). Live-editing autosave
// never touches that key — it only updates the top-level root/content/zones —
// so anything that republishes a page for a reason OTHER than the editing user
// themselves publishing (campaign pause/play, story publish, navbar sync
// fan-out, the backend republish-all worker) must read through this helper.
//
// Lives in its own module, free of any editor or React import, so the
// published-page renderer bundle (src/publish/rendererEntry.ts, built for
// Node) can use it without pulling builderConfig.tsx and the whole Puck
// editor in with it. builderConfig re-exports it for existing callers.

export function getPublishableData<T extends { publishedSnapshot?: T } | null | undefined>(
  data: T
): T {
  return (data?.publishedSnapshot ?? data) as T;
}
