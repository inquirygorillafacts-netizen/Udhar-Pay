
'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, Mic } from 'lucide-react';

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
            <button className="neu-button role-btn" onClick={() => router.push('/shopkeeper/ai-assistant/voice')}>
                <Mic className="role-icon" />
                <span>Voice Assistant</span>
            </button>
            <button className="neu-button role-btn" onClick={() => router.push('/shopkeeper/ai-assistant/text')}>
                <MessageSquare className="role-icon" />
                <span>Text Assistant</span>
            </button>
        </div>
      </div>
    </main>
  );
}
