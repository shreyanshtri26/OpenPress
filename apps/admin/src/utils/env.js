const env = {
  basePath: import.meta.env.VITE_BASEPATH || '',
  backendApi: import.meta.env.VITE_BACKEND_API,
  apiUrl: import.meta.env.VITE_API_URL,
  // AI endpoints live on the API (Gemini); VITE_AI_API only overrides that.
  aiApi: import.meta.env.VITE_AI_API || `${import.meta.env.VITE_BACKEND_API}/ai`,
  siteName: import.meta.env.VITE_SITE_NAME || 'OpenPress',
  twitterHandle: import.meta.env.VITE_TWITTER_HANDLE || '@shreyanshtri26',
  fbAppId: import.meta.env.VITE_FB_APP_ID || '',
  siteBaseUrl: import.meta.env.VITE_SITE_BASE_URL || 'https://openpress.com',
  canonicalUrl: import.meta.env.VITE_CANONICAL_URL || (typeof window !== "undefined" ? window.location.origin : "https://openpress.com"),
};

export default env;
