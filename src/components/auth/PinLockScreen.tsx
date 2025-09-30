'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

interface PinLockScreenProps {
  correctPin: string;
  onSuccess: () => void;
}

export default function PinLockScreen({ correctPin, onSuccess }: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!pin || pin.length < 4) {
      setError('Please enter a 4-digit PIN.');
      return;
    }

    setLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (pin === correctPin) {
        onSuccess();
      } else {
        setError('Incorrect PIN. Please try again.');
        setLoading(false);
        setPin(''); // Reset PIN input
      }
    }, 500);
  };

  return (
    <main className="login-container">
      <div className="login-card" style={{ maxWidth: '420px', textAlign: 'center' }}>
        <div className="login-header">
          <div className="neu-icon" style={{width: '70px', height: '70px'}}>
             <div className="icon-inner"><Lock /></div>
          </div>
          <h2 style={{ fontSize: '1.75rem' }}>App Locked</h2>
          <p>Enter your 4-digit PIN to continue.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="neu-input">
              <input
                type="password"
                id="pin"
                name="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
                placeholder=" "
                autoComplete="off"
                maxLength={4}
                className="pin-input"
                style={{ fontSize: '1.5rem', letterSpacing: '0.8em', textAlign: 'center', paddingLeft: '24px' }}
              />
              <label htmlFor="pin">Security PIN</label>
              <div className="input-icon"><Lock /></div>
            </div>
            {error && <span className="error-message show" style={{ textAlign: 'center', marginLeft: 0 }}>{error}</span>}
          </div>
          <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
            <span className="btn-text">Unlock</span>
            <div className="btn-loader"><div className="neu-spinner"></div></div>
          </button>
        </form>
      </div>
    </main>
  );
}
