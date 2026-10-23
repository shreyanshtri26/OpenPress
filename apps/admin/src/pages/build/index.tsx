// src/pages/build/index.tsx
// In-app Page Studio (Super User only). The editor lives in apps/pagestudio/src and is imported through @builder.
import { lazy, Suspense, useContext, useEffect } from 'react';
import '@measured/puck/puck.css';
import '@builder/styles/studio-theme.css';
import { AuthGuard } from '@/context/AuthGuard';
import { UserContext } from '@/context/UserContext';
import { useRouter } from '@/hooks/useRouter';
import { EPaperButton } from '@/components/common/ToolbarLinks';

const PuckEditor = lazy(() =>
  import('@builder/components/PuckEditor/PuckEditor').then((m) => ({ default: m.PuckEditor })),
);

const PublishedPage = lazy(() =>
  import('@builder/components/PublishedPage/PublishedPage').then((m) => ({ default: m.PublishedPage })),
);

// The builder opens `#/published/<id>` in a new tab after Publish/Preview; show that page instead of the editor.
const PUBLISHED_HASH = '#/published/';

function BuildWorkspace() {
  const router = useRouter();
  const { user } = useContext(UserContext)!;
  const isSuperUser = user?.role?.toLowerCase() === 'super user';

  useEffect(() => {
    if (!isSuperUser) router.replace('/dashboard');
  }, [isSuperUser, router]);

  // The builder's story picker reads this once on load.
  useEffect(() => {
    if (!isSuperUser) return;
    import('@builder/components/PuckEditor/storyData').then((m) => m.initializeStories({}));
  }, [isSuperUser]);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Page Studio by OpenPress';
    return () => { document.title = previous; };
  }, []);

  if (!isSuperUser) return null;

  if (window.location.hash.startsWith(PUBLISHED_HASH)) {
    return (
      <div className="fixed inset-0 overflow-auto bg-white">
        <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading preview…</div>}>
          <PublishedPage pageId={window.location.hash.slice(PUBLISHED_HASH.length)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="studio-shell fixed inset-0 flex flex-col">
      <div className="studio-topbar">
        <button type="button" onClick={() => router.push('/dashboard')} className="studio-topbar-back">
          ← Back to dashboard
        </button>
        <span className="studio-topbar-brand">
          Page Studio <span>by OpenPress</span>
        </span>
        <EPaperButton />
      </div>
      <main className="flex min-h-0 min-w-0 flex-1 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:flex-1">
        <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading builder…</div>}>
          <PuckEditor />
        </Suspense>
      </main>
    </div>
  );
}

export default function BuildPage() {
  return (
    <AuthGuard>
      <BuildWorkspace />
    </AuthGuard>
  );
}
