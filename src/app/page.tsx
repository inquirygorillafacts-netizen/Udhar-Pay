"use client";

import { useState, useCallback } from "react";
import OfflineForm from "@/components/pwa/OfflineForm";
import SubmissionList from "@/components/pwa/SubmissionList";
import StatusIndicator from "@/components/pwa/StatusIndicator";
import InstallButton from "@/components/pwa/InstallButton";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewSubmission = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-2xl space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Offline First</h1>
            <p className="text-muted-foreground">A PWA demo with offline capabilities.</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusIndicator />
            <InstallButton />
          </div>
        </header>

        <section>
          <OfflineForm onNewSubmission={handleNewSubmission} />
        </section>

        <Separator />
        
        <section>
          <SubmissionList refreshKey={refreshKey} onSync={handleNewSubmission} />
        </section>

      </div>
    </main>
  );
}
