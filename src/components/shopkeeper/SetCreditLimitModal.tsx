'use client';

import { useState } from 'react';
import { IndianRupee, ToggleLeft, ToggleRight } from 'lucide-react';

interface SetCreditLimitModalProps {
  customerName: string;
  defaultLimit: number;
  onClose: () => void;
  onConfirm: (limitType: 'default' | 'manual', manualLimit?: number) => void;
}

export default function SetCreditLimitModal({
  customerName,
  defaultLimit,
  onClose,
  onConfirm,
}: SetCreditLimitModalProps) {
  const [limitType, setLimitType] = useState<'default' | 'manual'>('default');
  const [customLimit, setCustomLimit] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    setError('');
    if (limitType === 'manual') {
      const limitValue = parseFloat(customLimit);
      if (isNaN(limitValue) || limitValue <= 0) {
        setError('Please enter a valid positive number for the credit limit.');
        return;
      }
      onConfirm('manual', limitValue);
    } else {
      onConfirm('default');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-card modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Set Credit Limit</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <p style={{ color: '#6c7293', textAlign: 'center', marginBottom: '30px' }}>
          Set a credit limit for <strong>{customerName}</strong>. You can change this later in the Control Room.
        </p>
        
        <div className="role-selector" style={{ marginBottom: '20px' }}>
            <div className="role-buttons">
                <button 
                    className={`neu-button role-btn ${limitType === 'default' ? 'active' : ''}`}
                    onClick={() => setLimitType('default')}
                >
                    Use Default (₹{defaultLimit})
                </button>
                 <button 
                    className={`neu-button role-btn ${limitType === 'manual' ? 'active' : ''}`}
                    onClick={() => setLimitType('manual')}
                >
                    Set Custom
                </button>
            </div>
        </div>

        {limitType === 'manual' && (
          <div className="form-group" style={{animation: 'fadeIn 0.3s ease'}}>
            <div className="neu-input">
              <input
                type="number"
                id="custom-limit"
                value={customLimit}
                onChange={(e) => setCustomLimit(e.target.value)}
                placeholder=" "
                required
              />
              <label htmlFor="custom-limit">Custom Credit Limit (₹)</label>
              <div className="input-icon"><IndianRupee /></div>
            </div>
          </div>
        )}

        {error && <p className="error-message show" style={{ textAlign: 'center', marginLeft: 0, animation: 'gentleShake 0.5s' }}>{error}</p>}

        <button
          className="neu-button"
          onClick={handleConfirm}
          style={{ marginTop: '20px', background: '#00c896', color: 'white' }}
        >
          Approve & Set Limit
        </button>
      </div>
    </div>
  );
}
