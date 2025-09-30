"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { addSubmission } from "@/lib/db";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type FormData = z.infer<typeof formSchema>;

export default function OfflineForm({ onNewSubmission }: { onNewSubmission: () => void }) {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      message: "",
    },
  });

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    if (isOnline) {
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ formData: values }),
        });
        if (!response.ok) throw new Error('Server error');
        const result = await response.json();

        toast({
          title: "Submission Successful",
          description: `Online sync complete. Summary: ${result.summary}`,
        });
        form.reset();
        onNewSubmission();
      } catch (error) {
        console.error("Online submission failed:", error);
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: "Could not submit form online. Please try again.",
        });
        saveForLater(values);
      }
    } else {
      await saveForLater(values);
    }
    setIsSubmitting(false);
  }

  async function saveForLater(values: FormData) {
    try {
      await addSubmission(values);
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-form-data');
      }
      toast({
        title: "You are offline",
        description: "Your submission has been saved and will be synced when you're back online.",
      });
      form.reset();
      onNewSubmission();
    } catch (error) {
      console.error("Offline submission failed:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save submission for offline sync.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Your message..." {...field} className="min-h-[120px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </form>
    </Form>
  );
}
