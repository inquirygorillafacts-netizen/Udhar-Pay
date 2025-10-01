
'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, Mic, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// This page might not be directly used if voice is default, but can serve as a fallback or be removed.
// For this iteration, we are making the voice page the default entry.
// Let's repurpose this as a simple menu, or even better, make the voice page the main entry.

// Let's make the voice page the default and link to text from there.
// So, we will rename this folder structure.

// The user has requested to make voice the default and have a button to go to text.
// This file is now redundant as a menu. It will be replaced by the voice page at `/customer/ai-assistant/voice`
// and a text page at `/customer/ai-assistant/text`. The layout will point to `/voice`.
// To keep things clean, let's just make this file a redirect or a simple holder.
// The new structure will be implemented by creating the voice and text pages and updating the layout.
// This menu page is no longer needed. I will keep it but make it redirect.
// Actually, I will delete it and create the correct structure.

// Based on latest request, this file is being repurposed. It will become the main AI Assistant menu.

export default function AiAssistantMenuPage() {
  const router = useRouter();

  return (
    <main className="login-container">
      <div className="login-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <header className="login-header">
           <div className="neu-icon" style={{ width: '100px', height: '100px' }}>
              <div className="icon-inner" style={{width: '50px', height: '50px'}}>
                🤖
              </div>
          </div>
          <h1>AI Assistant</h1>
          <p>How would you like to interact?</p>
        </header>

        <div className="role-buttons-wrapper" style={{marginTop: '20px'}}>
            <button className="neu-button role-btn" onClick={() => router.push('/customer/ai-assistant/voice')}>
                <Mic className="role-icon" />
                <span>Voice Assistant</span>
            </button>
            <button className="neu-button role-btn" onClick={() => router.push('/customer/ai-assistant/text')}>
                <MessageSquare className="role-icon" />
                <span>Text Assistant</span>
            </button>
        </div>
      </div>
    </main>
  );
}
