'use client';

import { useParams, useRouter } from 'next/navigation';
import { policies } from '../content';
import { ArrowLeft } from 'lucide-react';

export default function PolicyPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const policy = policies[slug];

  if (!policy) {
    return (
        <main className="login-container">
            <div className="login-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
                <h1 style={{color: '#3d4468', fontSize: '2rem', fontWeight: '600'}}>Page Not Found</h1>
                <p style={{color: '#9499b7', margin: '1rem 0 2rem 0'}}>The policy page you are looking for does not exist.</p>
                <button className="neu-button" onClick={() => router.back()}>Go Back</button>
            </div>
      </main>
    );
  }

  return (
    <div>
        <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
            <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <ArrowLeft size={20} />
            </button>
            <div style={{textAlign: 'center', flexGrow: 1}}>
                <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>{policy.title}</h1>
            </div>
            <div style={{width: '45px'}}></div>
        </header>
        <main className="dashboard-main-content" style={{padding: '20px'}}>
            <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: policy.content }} style={{color: '#6c7293', lineHeight: 1.8}}/>
            </div>
        </main>
    </div>
  );
}
