/**
 * A page's stored `data` (from GET /pagebuilder/page) optionally carries a
 * `publishedSnapshot`: a full, self-contained copy of the data as of the
 * last explicit "Publish" click in the PageBuilder editor. The editor's
 * live-editing autosave never touches this key, only the top-level
 * root/content/zones. So anything that republishes a page for a reason
 * OTHER than the editing user themselves publishing (campaign pause/play,
 * story publish, auto-republish-home-after-story-publish, etc.) should read
 * through this helper instead of raw `data`, to avoid ever publishing
 * someone's in-progress, never-published edit. Falls back to raw `data` for
 * pages that haven't been published yet under this scheme.
 */
export function getPublishableData(data) {
  return data?.publishedSnapshot ?? data;
}
