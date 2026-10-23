// src/App.tsx

import { useEffect, useState } from 'react'

import './App.css'
import '@measured/puck/puck.css'

import { PublishedPage } from './components/PublishedPage/PublishedPage'
import { PuckEditor } from './components/PuckEditor/PuckEditor'
import { initializeStories } from "./components/PuckEditor/storyData"
import { AuthGuard } from './components/AuthGuard'
import { Authors } from './components/Authors/Authors'
import { LoginPage } from './components/LoginPage/LoginPage'

// ─── Routing ──────────────────────────────────────────────────────────────────

const normalizeHash = (hash: string) => {
  if (!hash) return '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
};

function useRoute() {
  const [route, setRoute] = useState(() => {
    if (typeof window === 'undefined') return '/';
    const hash = window.location.hash.slice(1);
    if (hash) return normalizeHash(hash);
    return window.location.pathname;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setRoute(normalizeHash(hash));
      } else {
        setRoute(window.location.pathname);
      }
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return route;
}

// Public URL -> the page record it previews. Every fixed page the live site serves must be listed here.
const FIXED_PAGE_IDS: Record<string, string> = {
  '/about': 'about',
  '/privacy-policy': 'privacy-policy',
  '/contact-us': 'contact-us',
  '/media-council': 'media-council',
  '/support-us': 'support-us',
  '/error': 'error',
  '/404': 'error',
};

function App() {
  const route = useRoute();

  useEffect(() => {
    initializeStories({}).then(() => {
      console.log('✅ Stories initialized');
    });
  }, []);

  if (route.startsWith('/published/')) {
    const pageId = route.replace('/published/', '');
    return <PublishedPage pageId={pageId} />;
  }

  const fixedPage = FIXED_PAGE_IDS[route.replace(/\.html$/, '').replace(/\/$/, '')];
  if (fixedPage) {
    return <PublishedPage pageId={fixedPage} />;
  }

  if (route.startsWith('/authors/')) {
    const authorSlug = route.replace('/authors/', '').replace(/\.html$/, '');
    console.log('authorSlug', authorSlug);
    return <PublishedPage pageId="author-profile" authorSlug={authorSlug} />;
  }

  if (route === '/authors') {
    return <Authors />;
  }

  if (route === '/login' || route === '/login.html') {
    return <LoginPage />
  }

  return (
    <div className="builder">
      <AuthGuard type="admin">
        <main className="builder__workspace">
          <PuckEditor />
        </main>
      </AuthGuard>
    </div>
  );
}

export default App;