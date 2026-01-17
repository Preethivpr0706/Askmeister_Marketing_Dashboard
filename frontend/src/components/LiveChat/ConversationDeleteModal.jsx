import { AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import './ConversationDeleteModal.css';

const ConversationDeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  conversation,
  isLoading,
  isBulk = false,
  count = 1
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    // Modal will be closed by parent component after operation completes
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const contactName = isBulk 
    ? `${count} conversation${count > 1 ? 's' : ''}`
    : (conversation?.contact_name || `+${conversation?.phone_number || ''}`);

  const modalContent = (
    <div 
      className="conversation-delete-modal-overlay" 
      onClick={handleOverlayClick}
    >
      <div className="conversation-delete-modal-container">
        <div className="conversation-delete-modal-content">
          <div className="conversation-delete-modal-header">
            <div className="conversation-delete-warning-icon">
              <AlertTriangle className="conversation-warning-icon" />
            </div>
            <h2 className="conversation-delete-modal-title">
              Delete Conversation?
            </h2>
            <button
              onClick={onClose}
              className="conversation-delete-close-button"
              type="button"
              disabled={isLoading}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="conversation-delete-modal-body">
            <p className="conversation-delete-message">
              Are you sure you want to delete {isBulk ? '' : 'the conversation with '}<strong>{contactName}</strong>?
            </p>
            <p className="conversation-delete-warning">
              ⚠️ This action cannot be undone. All messages in {isBulk ? 'these conversations' : 'this conversation'} will be permanently deleted.
            </p>
          </div>

          <div className="conversation-delete-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="conversation-delete-cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="conversation-delete-confirm-button"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : isBulk ? `Delete ${count} Conversation${count > 1 ? 's' : ''}` : 'Delete Conversation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConversationDeleteModal;

