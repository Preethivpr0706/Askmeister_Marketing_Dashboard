import React, { useState } from 'react';
import { Smartphone, Phone } from 'lucide-react';
import './TestFlowModal.css';

const TestFlowModal = ({ isOpen, onClose, onTest, flowName, isLoading }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^(\+|\d)[0-9]{7,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setError('');
    if (onTest && typeof onTest === 'function') {
      onTest(phoneNumber);
    } else {
      console.error('onTest function is not available');
      onClose();
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setError('');
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="test-modal-overlay">
      <div className="test-modal-container">
        <div className="test-modal-content">
          <div className="test-modal-header">
            <div className="test-modal-icon">
              <Smartphone className="modal-icon" />
            </div>
            <h2 className="test-modal-title">Test Flow</h2>
            <button
              onClick={handleClose}
              className="test-close-button"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="test-modal-body">
            <p className="test-message">
              Test <strong>"{flowName}"</strong> by sending it to a phone number.
            </p>
            <p className="test-info">
              📱 The flow will be sent as a WhatsApp message to the number you provide.
            </p>

            <form onSubmit={handleSubmit} className="test-form">
              <div className="form-group">
                <label htmlFor="phoneNumber" className="form-label">
                  <Phone className="phone-icon" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number with country code (e.g., +1234567890)"
                  className={`form-input ${error ? 'input-error' : ''}`}
                  autoFocus
                />
                {error && (
                  <p className="error-message">{error}</p>
                )}
              </div>

              <div className="form-help">
                <small>Include country code (e.g., +1 for US, +91 for India)</small>
              </div>
            </form>
          </div>

          <div className="test-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="test-cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="test-send-button"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestFlowModal;
