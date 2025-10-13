
"use client";

import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

export default function PWALoader() {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
            
            // Listen for updates to the service worker.
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New content is available and has been downloaded.
                    // Notify the user to refresh the page.
                    toast({
                      title: "Update Available",
                      description: "A new version of the app is ready. Please refresh the page to update.",
                      duration: Infinity, // Keep the toast until the user interacts
                    });
                  }
                });
              }
            });

          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
            toast({
              variant: "destructive",
              title: "Service Worker Error",
              description: "Could not register service worker for offline capabilities.",
            });
          });
      });
    }
  }, [toast]);

  return null;
}
