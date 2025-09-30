'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// This component acts as a router. It checks if the user has seen the onboarding
// and directs them to the correct page.
export default function InitialRoutingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We use localStorage to persist the "hasSeenOnboarding" flag across sessions.
    // This code will only run on the client side.
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

    if (hasSeenOnboarding) {
      // If the user has seen the onboarding, send them to the auth page.
      router.replace('/auth');
    } else {
      // If this is their first visit, send them to the first intro page.
      router.replace('/intro/1');
    }
    // We don't set loading to false because the redirection will happen,
    // and this component will unmount. We just show a loader for a good UX.
  }, [router]);

  return (
    // Show a full-screen loader while we figure out where to go.
    <div className="loading-container">
      <div className="neu-spinner"></div>
    </div>
  );
}
