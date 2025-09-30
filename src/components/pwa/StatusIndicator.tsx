"use client";

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function StatusIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined' && typeof window.navigator.onLine !== 'undefined') {
      setIsOnline(window.navigator.onLine);
    }
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Badge variant="outline" className={cn("transition-colors", isOnline ? "border-green-500/50 text-green-600" : "border-destructive/50 text-destructive")}>
      {isOnline ? (
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </div>
      )}
    </Badge>
  );
}
