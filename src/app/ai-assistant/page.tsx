'use client';

// This is a fallback page for direct navigation.
// It will not have the layout's navigation bar.
import AiAssistantPageContent from '@/components/ai-assistant/page-content';

export default function AiAssistantStandalonePage() {
  return (
    <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      <AiAssistantPageContent />
    </div>
  );
}
