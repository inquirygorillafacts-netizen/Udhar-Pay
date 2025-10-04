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