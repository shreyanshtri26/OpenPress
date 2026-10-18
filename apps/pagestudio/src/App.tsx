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

  if (route === '/about' || route === '/about.html') {
    return <PublishedPage pageId="about" />;
  }

  if (route.startsWith('/authors/')) {
    const authorSlug = route.replace('/authors/', '').replace(/\.html$/, '');
    console.log('authorSlug', authorSlug);
    return <PublishedPage pageId="author-profile" authorSlug={authorSlug} />;
  }

  if (route === '/authors') {
    return <Authors />;
  }

  if (route === '/privacy-policy') {
    return <PublishedPage pageId="privacy-policy" />;
  }

  if (route === '/contact-us') {
    return <PublishedPage pageId="contact-us" />;
  }

  if (route === '/media-council') {
    return <PublishedPage pageId="media-council" />;
  }

  if (route === '/privacy-policy') {
    return <PublishedPage pageId="privacy-policy" />
  }

  if (route === '/media-council') {
    return <PublishedPage pageId="media-council" />
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