import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { messageService } from '../../api/messageService';
import './CampaignProgress.css';

function CampaignProgress({ campaignId, onComplete, onClose }) {
  const [progress, setProgress] = useState({
    status: 'sending',
    progress: 0,
    total: 0,
    delivered: 0,
    failed: 0,
    processed: 0,
    remaining: 0,
    read: 0
  });
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!campaignId || !isPolling) return;

    const pollProgress = async () => {
      try {
        const response = await messageService.getCampaignProgress(campaignId);
        const data = response.data;
        
        setProgress(data);

        // Stop polling if campaign is completed, failed, or partial
        // These statuses mean all messages have been processed (sent/failed)
        // Don't wait for delivery - that happens asynchronously via webhooks
        if (['completed', 'failed', 'partial'].includes(data.status)) {
          setIsPolling(false);
          if (onComplete) {
            setTimeout(() => onComplete(data), 2000); // Wait 2 seconds before calling onComplete
          }
        }
      } catch (err) {
        console.error('Error polling campaign progress:', err);
        setError(err.message || 'Failed to get campaign progress');
        // Don't stop polling on error, just log it
      }
    };

    // Poll immediately, then every 2 seconds
    pollProgress();
    const interval = setInterval(pollProgress, 2000);

    return () => clearInterval(interval);
  }, [campaignId, isPolling, onComplete]);

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="status-icon success" size={24} />;
      case 'failed':
        return <XCircle className="status-icon error" size={24} />;
      case 'sending':
        return <Send className="status-icon sending" size={24} />;
      default:
        return <Clock className="status-icon" size={24} />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'completed':
        return 'Campaign Completed';
      case 'failed':
        return 'Campaign Failed';
      case 'partial':
        return 'Campaign Partially Completed';
      case 'sending':
        return 'Sending Messages...';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="campaign-progress-overlay">
      <div className="campaign-progress-modal">
        <div className="progress-header">
          <h3>Campaign Progress</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="progress-content">
          <div className="status-section">
            {getStatusIcon()}
            <h4>{getStatusText()}</h4>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className={`progress-fill ${progress.status}`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="progress-text">
              {progress.progress}% ({progress.processed} / {progress.total})
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Recipients</div>
              <div className="stat-value">{progress.total}</div>
            </div>
            <div className="stat-item success">
              <div className="stat-label">Sent</div>
              <div className="stat-value">{progress.sent || progress.delivered || 0}</div>
              <div className="stat-note">Accepted by WhatsApp</div>
            </div>
            <div className="stat-item" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="stat-label">Delivered</div>
              <div className="stat-value">{progress.delivered || 0}</div>
              <div className="stat-note">Received by user</div>
            </div>
            <div className="stat-item error">
              <div className="stat-label">Failed</div>
              <div className="stat-value">{progress.failed}</div>
            </div>
            {progress.read > 0 && (
              <div className="stat-item" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <div className="stat-label">Read</div>
                <div className="stat-value">{progress.read}</div>
              </div>
            )}
          </div>

          {progress.status === 'sending' && (
            <div className="sending-note">
              <p>Messages are being sent in batches to avoid rate limits.</p>
              <p>Processing approximately 30-40 messages per minute.</p>
            </div>
          )}

          {progress.status === 'completed' && progress.delivered < progress.sent && (
            <div className="sending-note" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
              <p><strong>All messages sent successfully!</strong></p>
              <p>Delivery status will update as recipients receive messages. Some may take hours if phones are offline.</p>
            </div>
          )}

          {!isPolling && progress.status !== 'sending' && (
            <div className="completion-actions">
              <button className="btn btn-primary" onClick={onClose || (() => window.location.href = '/campaigns')}>
                View Campaign Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignProgress;

