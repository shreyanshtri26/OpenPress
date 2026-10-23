export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  // In development, never run the production PWA service worker.
  // Stale cached chunks in SW cause Vite HMR failures and duplicate React instances.
  if (import.meta.env.DEV) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
    return;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
        })
        .catch((registrationError) => {
        });
    });
  }
}
