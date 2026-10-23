// The dashboard and Page Studio are not installable apps (only the ePaper is). Remove any service worker and cache an
// earlier version registered, so an old install of the dashboard stops intercepting requests.
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) registration.unregister();
    });
  }
  if ("caches" in window) {
    caches.keys().then((keys) => {
      for (const key of keys) caches.delete(key);
    });
  }
}
