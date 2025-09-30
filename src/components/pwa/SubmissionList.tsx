"use client";

import { useState, useEffect, useCallback } from "react";
import { getSubmissions } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface Submission {
    id: number;
    formData: {
        name: string;
        message: string;
    };
    timestamp: string;
}

export default function SubmissionList({ refreshKey, onSync }: { refreshKey: number, onSync: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const fetchSubmissions = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try {
        const items = await getSubmissions();
        setSubmissions(items.reverse());
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [refreshKey, fetchSubmissions]);

  useEffect(() => {
    const handleSync = () => {
      // A short delay to allow the DB to be cleared by the service worker
      setTimeout(() => {
        fetchSubmissions();
        onSync();
      }, 1500);
    };
    
    window.addEventListener('online', handleSync);
    return () => window.removeEventListener('online', handleSync);
  }, [fetchSubmissions, onSync]);

  if (submissions.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-8">
            <p>No pending submissions.</p>
        </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Pending Submissions</h2>
      <div className="space-y-4">
        {submissions.map((item) => (
          <Card key={item.id} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.formData.name}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground break-words">{item.formData.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
