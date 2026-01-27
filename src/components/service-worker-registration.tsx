'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // Check for updates on every page load (critical for iOS PWAs)
          registration.update();

          // Listen for new service worker installing
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              // New service worker is installed and waiting
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available - skipWaiting() in sw.js will auto-activate
                console.log('New version available, reloading...');
              }
            });
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });

      // Auto-reload when new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }
  }, []);

  return null;
}
